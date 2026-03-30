import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ShoppingCart, Cross, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function MesCommandes() {
  const { profile, signOut } = useAuth()
  const [commandes, setCommandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    if (profile) fetchCommandes()
  }, [profile])

  async function fetchCommandes() {
    try {
      const { data: clientData } = await supabase
        .from('clients').select('id').eq('user_id', profile!.id).single()
      if (!clientData) { setCommandes([]); setLoading(false); return }

      const { data } = await supabase
        .from('commandes')
        .select('*, commande_items(*, medicament:medicaments(nom, code))')
        .eq('client_id', clientData.id)
        .order('date_commande', { ascending: false })

      setCommandes((data ?? []).map(cmd => ({ ...cmd, items: cmd.commande_items })))
    } catch (e: any) {
      toast.error('Erreur lors du chargement des commandes')
      setCommandes([])
    }
    setLoading(false)
  }

  async function accepterModification(cmdId: string) {
    setResponding(cmdId)
    const { error } = await supabase.from('commandes').update({
      statut: 'confirmee',
      modification_proposee: false,
    }).eq('id', cmdId)
    if (error) toast.error('Erreur : ' + error.message)
    else { toast.success('Modification acceptée — commande confirmée'); fetchCommandes() }
    setResponding(null)
  }

  async function refuserModification(cmdId: string) {
    setResponding(cmdId)
    const { error } = await supabase.from('commandes').update({
      statut: 'annulee',
      modification_proposee: false,
    }).eq('id', cmdId)
    if (error) toast.error('Erreur : ' + error.message)
    else { toast.success('Commande annulée'); fetchCommandes() }
    setResponding(null)
  }

  const nbPendingModif = commandes.filter(c => c.statut === 'modification_en_attente_client').length

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
          <Link to="/catalogue" className="text-sm font-medium hover:underline" style={{ color: '#0d9488' }}>Catalogue</Link>
          <button onClick={signOut} className="text-sm text-slate-500 hover:text-red-600">Déconnexion</button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Mes commandes</h2>
          {nbPendingModif > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 bg-orange-100 text-orange-700 rounded-full animate-pulse">
              <AlertTriangle size={13} />
              {nbPendingModif} modification{nbPendingModif > 1 ? 's' : ''} en attente
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : commandes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <ShoppingCart size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aucune commande</p>
            <Link to="/catalogue" className="mt-4 inline-block px-6 py-2 text-white rounded-xl font-medium"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
              Voir le catalogue
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {commandes.map(cmd => {
              const isModifPending = cmd.statut === 'modification_en_attente_client'
              return (
                <div key={cmd.id}
                  className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${isModifPending ? 'border-orange-300 shadow-orange-100 shadow-md' : 'border-slate-200'}`}>

                  {/* Bandeau modification en attente */}
                  {isModifPending && (
                    <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-800">Modification proposée par la pharmacie</p>
                        {cmd.notes_modification && (
                          <p className="text-sm text-orange-700 mt-1">« {cmd.notes_modification} »</p>
                        )}
                        <p className="text-xs text-orange-500 mt-1">
                          Veuillez accepter ou refuser les nouvelles quantités ci-dessous.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-800">#{cmd.numero_facture || cmd.id.slice(-8)}</p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(cmd.date_commande), "d MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg" style={{ color: '#0d9488' }}>
                        {cmd.total.toLocaleString('fr-FR')} FCFA
                      </p>
                      <div className="flex items-center gap-2 justify-end mt-1">
                        <StatutBadge statut={cmd.statut} />
                        <PaiementBadge statut={cmd.statut_paiement} />
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-xs font-medium text-slate-500 mb-2">Produits :</p>
                    <div className="space-y-1.5">
                      {(cmd.items ?? []).map((item: any) => {
                        const wasModified = isModifPending && item.quantite_originale && item.quantite_originale !== item.quantite
                        return (
                          <div key={item.id} className={`flex justify-between text-sm rounded-lg px-2 py-1 ${wasModified ? 'bg-orange-50' : ''}`}>
                            <span className="text-slate-700">{item.medicament?.nom}</span>
                            <span className="flex items-center gap-2">
                              {wasModified && (
                                <span className="text-xs text-slate-400 line-through">{item.quantite_originale}</span>
                              )}
                              <span className={`font-medium ${wasModified ? 'text-orange-700' : ''}`}>× {item.quantite}</span>
                              <span className="text-slate-500">{(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} FCFA</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Boutons accepter / refuser */}
                  {isModifPending && (
                    <div className="px-4 pb-4 flex gap-3">
                      <button
                        onClick={() => accepterModification(cmd.id)}
                        disabled={responding === cmd.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50 transition-colors">
                        <CheckCircle size={16} />
                        {responding === cmd.id ? 'En cours...' : 'Accepter la modification'}
                      </button>
                      <button
                        onClick={() => refuserModification(cmd.id)}
                        disabled={responding === cmd.id}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl disabled:opacity-50 transition-colors">
                        <XCircle size={16} />
                        {responding === cmd.id ? 'En cours...' : 'Refuser / Annuler'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700',
    modification_en_attente_client: 'bg-orange-100 text-orange-700',
    confirmee: 'bg-teal-100 text-teal-700',
    preparee: 'bg-indigo-100 text-indigo-700',
    livree: 'bg-green-100 text-green-700',
    annulee: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente',
    modification_en_attente_client: '⚠ Modif. en attente',
    confirmee: 'Confirmée',
    preparee: 'Préparée',
    livree: 'Livrée',
    annulee: 'Annulée',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] || 'bg-slate-100 text-slate-600'}`}>{labels[statut] || statut}</span>
}

function PaiementBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { en_attente: 'bg-amber-100 text-amber-700', paye: 'bg-green-100 text-green-700', annule: 'bg-red-100 text-red-700' }
  const labels: Record<string, string> = { en_attente: 'Non payé', paye: 'Payé', annule: 'Annulé' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] || 'bg-slate-100 text-slate-600'}`}>{labels[statut] || statut}</span>
}
