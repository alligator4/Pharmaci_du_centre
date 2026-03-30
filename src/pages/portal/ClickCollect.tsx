import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ShoppingCart, Plus, Minus, Cross, Package, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import type { CartItem, Medicament } from '../../types'

export default function ClickCollect() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [medicaments, setMedicaments] = useState<any[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [dateRetrait, setDateRetrait] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (profile) fetchData()
    // Default pickup date: tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    setDateRetrait(tomorrow.toISOString().slice(0, 16))
  }, [profile])

  async function fetchData() {
    const [{ data: clientData }, { data: stocks }] = await Promise.all([
      supabase.from('clients').select('id').eq('user_id', profile!.id).single(),
      supabase.from('stock_medicament').select('*').gt('quantite_totale', 0),
    ])
    setClientId(clientData?.id ?? null)
    setMedicaments(stocks ?? [])
    setLoading(false)
  }

  function addToCart(med: any) {
    const prix = (med.prix_achat_min ?? 0) + med.marge
    setCart(prev => {
      const existing = prev.find(i => i.medicament.id === med.medicament_id)
      if (existing) {
        if (existing.quantite >= med.quantite_totale) {
          toast.error('Stock insuffisant')
          return prev
        }
        return prev.map(i => i.medicament.id === med.medicament_id ? { ...i, quantite: i.quantite + 1 } : i)
      }
      return [...prev, { medicament: { id: med.medicament_id, nom: med.nom, code: med.code, marge: med.marge, seuil_alerte: med.seuil_alerte, actif: true, created_at: '' } as Medicament, quantite: 1, prix_unitaire: prix }]
    })
  }

  function updateQty(medId: string, delta: number) {
    setCart(prev => prev.map(i => {
      if (i.medicament.id !== medId) return i
      const newQty = i.quantite + delta
      if (newQty <= 0) return i
      const stock = medicaments.find(m => m.medicament_id === medId)
      if (stock && newQty > stock.quantite_totale) { toast.error('Stock insuffisant'); return i }
      return { ...i, quantite: newQty }
    }))
  }

  function removeFromCart(medId: string) {
    setCart(prev => prev.filter(i => i.medicament.id !== medId))
  }

  const total = cart.reduce((s, i) => s + i.quantite * i.prix_unitaire, 0)

  async function placeOrder() {
    if (!clientId) { toast.error('Votre profil client n\'est pas configuré. Contactez l\'administration.'); return }
    if (cart.length === 0) { toast.error('Votre panier est vide'); return }
    if (!dateRetrait) { toast.error('Veuillez choisir une date de retrait'); return }
    if (new Date(dateRetrait) <= new Date()) { toast.error('La date de retrait doit être dans le futur'); return }

    setPlacing(true)
    try {
      const { data: cmd, error: cmdErr } = await supabase.from('commandes').insert({
        client_id: clientId,
        total,
        statut: 'en_attente',
        statut_paiement: 'en_attente',
        mode_retrait: 'click_collect',
        date_retrait_souhaitee: new Date(dateRetrait).toISOString(),
        notes: `Click & Collect — Retrait souhaité le ${new Date(dateRetrait).toLocaleDateString('fr-FR')}`,
      }).select().single()

      if (cmdErr || !cmd) throw new Error(cmdErr?.message ?? 'Erreur création commande')

      const items = cart.map(i => ({
        commande_id: cmd.id,
        medicament_id: i.medicament.id,
        quantite: i.quantite,
        prix_unitaire: i.prix_unitaire,
      }))

      const { error: itemsErr } = await supabase.from('commande_items').insert(items)
      if (itemsErr) throw new Error(itemsErr.message)

      await supabase.rpc('deduct_fifo_stock', { p_medicament_id: cart[0].medicament.id, p_quantite: cart[0].quantite })
      for (const item of cart) {
        await supabase.rpc('deduct_fifo_stock', { p_medicament_id: item.medicament.id, p_quantite: item.quantite })
      }

      setCart([])
      setShowCart(false)
      toast.success('Commande click & collect passée ! Vous serez contacté pour confirmation.')
      navigate('/mes-commandes')
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors de la commande')
    }
    setPlacing(false)
  }

  const filtered = medicaments.filter(m => m.nom.toLowerCase().includes(search.toLowerCase()) || m.code?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
            <Cross className="text-white" size={14} strokeWidth={3} />
          </div>
          <span className="font-bold text-slate-800">Click & Collect</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/catalogue" className="text-sm font-medium hover:underline" style={{ color: '#0d9488' }}>Catalogue</Link>
          <Link to="/mes-commandes" className="text-sm font-medium hover:underline" style={{ color: '#0d9488' }}>Mes commandes</Link>
          <button onClick={() => setShowCart(true)} className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ShoppingCart size={20} className="text-slate-700" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ background: '#0d9488' }}>
                {cart.reduce((s, i) => s + i.quantite, 0)}
              </span>
            )}
          </button>
          <button onClick={signOut} className="text-sm text-slate-500 hover:text-red-600">Déco</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Package size={22} className="text-teal-600" />
            <h2 className="text-xl font-bold text-slate-800">Réserver & Retirer en pharmacie</h2>
          </div>
          <p className="text-sm text-slate-500 ml-9">Commandez en ligne, retirez à notre comptoir sans attendre.</p>
        </div>

        {!clientId && !loading && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            Votre profil client n'est pas encore lié à ce compte. Contactez l'administration.
          </div>
        )}

        <div className="mb-4">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un médicament..." className="w-full max-w-sm border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>

        {loading ? (
          <div className="flex justify-center p-16">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(med => {
              const prix = (med.prix_achat_min ?? 0) + med.marge
              const cartItem = cart.find(i => i.medicament.id === med.medicament_id)
              return (
                <div key={med.medicament_id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800">{med.nom}</h3>
                      {med.code && <p className="text-xs text-slate-400 font-mono">{med.code}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${med.quantite_totale > med.seuil_alerte ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      Stock: {med.quantite_totale}
                    </span>
                  </div>
                  <p className="text-lg font-bold mb-3" style={{ color: '#0d9488' }}>{prix.toLocaleString('fr-FR')} FCFA</p>
                  {cartItem ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(med.medicament_id, -1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-slate-800 w-6 text-center">{cartItem.quantite}</span>
                        <button onClick={() => updateQty(med.medicament_id, 1)} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(med.medicament_id)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(med)}
                      className="w-full py-2 text-sm font-medium text-white rounded-lg transition-colors"
                      style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                      Ajouter au panier
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Panier slide-over */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Votre panier</h2>
              <button onClick={() => setShowCart(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-slate-400 py-8">Panier vide</p>
              ) : (
                cart.map(item => (
                  <div key={item.medicament.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-800 truncate">{item.medicament.nom}</p>
                      <p className="text-xs text-slate-400">{item.prix_unitaire.toLocaleString('fr-FR')} FCFA × {item.quantite}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.medicament.id, -1)} className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center text-sm font-bold">{item.quantite}</span>
                      <button onClick={() => updateQty(item.medicament.id, 1)} className="w-7 h-7 rounded bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                        <Plus size={12} />
                      </button>
                      <button onClick={() => removeFromCart(item.medicament.id)} className="ml-1 text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date & heure de retrait souhaitée *</label>
                  <input type="datetime-local" value={dateRetrait} onChange={e => setDateRetrait(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-bold text-lg" style={{ color: '#0d9488' }}>{total.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <button onClick={placeOrder} disabled={placing || !clientId}
                  className="w-full py-3 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-opacity"
                  style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                  {placing ? 'Réservation en cours...' : 'Confirmer la réservation'}
                </button>
                <p className="text-xs text-slate-400 text-center">
                  Paiement à la pharmacie lors du retrait. Vous serez contacté pour confirmer la disponibilité.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
