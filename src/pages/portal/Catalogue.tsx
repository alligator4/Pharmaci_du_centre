import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Link } from 'react-router-dom'
import type { Medicament, CartItem, StockMedicament } from '../../types'
import { ShoppingCart, Plus, Minus, Trash2, Send, Package, AlertCircle, LogOut, Cross } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Catalogue() {
  const { profile, signOut } = useAuth()
  const [stocks, setStocks] = useState<StockMedicament[]>([])
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientMissing, setClientMissing] = useState(false)

  useEffect(() => {
    if (profile) {
      fetchData()
      fetchClient()
    }
  }, [profile])

  async function fetchData() {
    setLoading(true)
    const [{ data: medsData }, { data: stockData }] = await Promise.all([
      supabase.from('medicaments').select('*').eq('actif', true).order('nom'),
      supabase.from('stock_medicament').select('*'),
    ])
    setMedicaments(medsData ?? [])
    setStocks(stockData ?? [])
    setLoading(false)
  }

  async function fetchClient() {
    if (!profile) return
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', profile.id)
      .single()
    if (error || !data) {
      setClientId(null)
      setClientMissing(true)
    } else {
      setClientId(data.id)
      setClientMissing(false)
    }
  }

  function getStock(medicamentId: string) {
    return stocks.find(s => s.medicament_id === medicamentId)
  }

  function getPrix(medicamentId: string): number | null {
    const med = medicaments.find(m => m.id === medicamentId)
    const stock = getStock(medicamentId)
    if (!stock || !stock.prix_achat_min || !med) return null
    return stock.prix_achat_min + med.marge
  }

  function addToCart(med: Medicament) {
    const stock = getStock(med.id)
    if (!stock || stock.quantite_totale === 0) { toast.error('Produit indisponible'); return }
    const prix = getPrix(med.id)
    if (!prix) { toast.error('Prix non disponible'); return }

    setCart(prev => {
      const existing = prev.find(i => i.medicament.id === med.id)
      if (existing) {
        if (existing.quantite >= stock.quantite_totale) { toast.error('Stock insuffisant'); return prev }
        return prev.map(i => i.medicament.id === med.id ? { ...i, quantite: i.quantite + 1 } : i)
      }
      return [...prev, { medicament: med, quantite: 1, prix_unitaire: prix }]
    })
    toast.success(`${med.nom} ajouté au panier`)
  }

  function removeFromCart(medId: string) {
    setCart(prev => prev.filter(i => i.medicament.id !== medId))
  }

  function updateQty(medId: string, qty: number) {
    const stock = getStock(medId)
    if (!stock) return
    if (qty <= 0) { removeFromCart(medId); return }
    if (qty > stock.quantite_totale) { toast.error(`Stock max: ${stock.quantite_totale}`); return }
    setCart(prev => prev.map(i => i.medicament.id === medId ? { ...i, quantite: qty } : i))
  }

  function getTotal() {
    return cart.reduce((s, i) => s + i.quantite * i.prix_unitaire, 0)
  }

  async function passerCommande() {
    if (clientMissing) {
      toast.error("Votre compte client n'est pas configuré. Contactez l'administration.")
      return
    }
    if (!clientId) { toast.error('Profil client introuvable'); return }
    if (cart.length === 0) { toast.error('Panier vide'); return }
    setPlacing(true)

    try {
      const { data: commande, error: cmdError } = await supabase.from('commandes').insert({
        client_id: clientId,
        date_commande: new Date().toISOString(),
        total: getTotal(),
        statut: 'en_attente',
        statut_paiement: 'en_attente',
        numero_facture: `FAC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      }).select().single()

      if (cmdError || !commande) throw new Error(cmdError?.message || 'Erreur création commande')

      await Promise.all(cart.map(item =>
        supabase.from('commande_items').insert({
          commande_id: commande.id,
          medicament_id: item.medicament.id,
          quantite: item.quantite,
          prix_unitaire: item.prix_unitaire,
        })
      ))

      for (const item of cart) {
        await supabase.rpc('deduct_fifo_stock', {
          p_medicament_id: item.medicament.id,
          p_qty: item.quantite,
        })
      }

      toast.success('Commande envoyée ! Un agent va la traiter.')
      setCart([])
      setShowCart(false)
      fetchData()
    } catch (err: any) {
      toast.error('Erreur lors de la commande: ' + err.message)
    }
    setPlacing(false)
  }

  const cartCount = cart.reduce((s, i) => s + i.quantite, 0)

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
            <Cross className="text-white" size={14} strokeWidth={3} />
          </div>
          <span className="font-bold text-slate-800">PharmaGross</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/mes-commandes" className="text-sm text-slate-600 hover:text-teal-600 font-medium hidden sm:block">
            Mes commandes
          </Link>
          <span className="text-sm text-slate-500 hidden sm:block">Bonjour, {profile?.name}</span>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-2 text-white rounded-xl hover:opacity-90 transition-colors"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}
          >
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={signOut} className="p-2 text-slate-400 hover:text-red-500 transition-colors" title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        {clientMissing && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-amber-800">Compte non configuré</p>
              <p className="text-amber-700 text-sm mt-0.5">
                Votre compte n'est pas encore lié à une fiche client. Contactez l'administration.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Catalogue Médicaments</h2>
            <p className="text-slate-500 text-sm">
              {loading ? 'Chargement...' : `${medicaments.length} produit(s) disponible(s)`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : medicaments.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucun médicament disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {medicaments.map(med => {
              const stock = getStock(med.id)
              const prix = getPrix(med.id)
              const disponible = stock ? stock.quantite_totale > 0 : false
              const inCart = cart.find(i => i.medicament.id === med.id)

              return (
                <div key={med.id} className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${!disponible ? 'opacity-60' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(13,148,136,0.1)' }}>
                      <Package className="text-teal-500" size={18} />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${disponible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {disponible ? 'Disponible' : 'Indisponible'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm mb-1 leading-tight">{med.nom}</h3>
                  {(med.forme || med.dosage) && (
                    <p className="text-xs text-slate-400 mb-1">{[med.forme, med.dosage].filter(Boolean).join(' • ')}</p>
                  )}
                  <p className="font-bold text-lg mt-2" style={{ color: '#0d9488' }}>
                    {prix ? `${prix.toLocaleString('fr-FR')} FCFA` : '—'}
                  </p>

                  {disponible && !clientMissing && (
                    <div className="mt-3">
                      {inCart ? (
                        <div className="flex items-center justify-between rounded-lg p-1.5" style={{ background: 'rgba(13,148,136,0.08)' }}>
                          <button onClick={() => updateQty(med.id, inCart.quantite - 1)}
                            className="p-1 hover:bg-white rounded-lg text-teal-600 transition-colors">
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold text-teal-700 px-2">{inCart.quantite}</span>
                          <button onClick={() => updateQty(med.id, inCart.quantite + 1)}
                            className="p-1 hover:bg-white rounded-lg text-teal-600 transition-colors">
                            <Plus size={14} />
                          </button>
                          <button onClick={() => removeFromCart(med.id)}
                            className="p-1 hover:bg-white rounded-lg text-red-400 transition-colors ml-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(med)}
                          className="w-full py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                          <Plus size={14} /> Ajouter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showCart && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="bg-black/50 flex-1" onClick={() => setShowCart(false)} />
          <div className="bg-white w-full max-w-sm flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Panier ({cartCount})</h3>
              <button onClick={() => setShowCart(false)} className="p-1 hover:bg-slate-100 rounded text-slate-500 text-lg leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Panier vide</p>
                </div>
              ) : cart.map(item => (
                <div key={item.medicament.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.medicament.nom}</p>
                    <p className="text-xs text-slate-500">{item.prix_unitaire.toLocaleString('fr-FR')} FCFA/u</p>
                    <p className="text-xs font-bold" style={{ color: '#0d9488' }}>= {(item.prix_unitaire * item.quantite).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => updateQty(item.medicament.id, item.quantite - 1)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-600"><Minus size={12} /></button>
                    <span className="w-7 text-center text-sm font-bold">{item.quantite}</span>
                    <button onClick={() => updateQty(item.medicament.id, item.quantite + 1)} className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 rounded-lg text-slate-600"><Plus size={12} /></button>
                    <button onClick={() => removeFromCart(item.medicament.id)} className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-lg text-red-400 ml-1"><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">Total</span>
                  <span className="font-bold text-xl" style={{ color: '#0d9488' }}>{getTotal().toLocaleString('fr-FR')} FCFA</span>
                </div>
                <button onClick={passerCommande} disabled={placing || clientMissing}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Send size={16} />
                  {placing ? 'Envoi...' : 'Passer la commande'}
                </button>
                <p className="text-xs text-center text-slate-400">Paiement en espèces à la livraison</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
