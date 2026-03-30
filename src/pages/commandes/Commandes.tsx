import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { CommandeItem } from '../../types'
import { ShoppingCart, Search, Eye, Printer, CheckCircle, XCircle, Bell, RotateCcw, PackageCheck, ChevronRight, Edit3, Phone, UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateFacturePDF } from '../../lib/pdf'
import { useAuth } from '../../contexts/AuthContext'

// Workflow: en_attente → confirmee → preparee → livree
const WORKFLOW = ['en_attente', 'confirmee', 'preparee', 'livree']
const WORKFLOW_LABELS: Record<string, string> = {
  en_attente: 'En attente', confirmee: 'Confirmée', preparee: 'Préparée',
  livree: 'Livrée', annulee: 'Annulée',
}

export default function Commandes() {
  const { isRole } = useAuth()
  const [commandes, setCommandes] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState<'all' | 'en_attente' | 'confirmee' | 'preparee' | 'paye'>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showModif, setShowModif] = useState(false)
  const [confirm, setConfirm] = useState<{ id: string; action: string; label: string; danger?: boolean } | null>(null)

  useEffect(() => {
    fetchCommandes()
    const channel = supabase.channel('commandes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          toast.custom((t) => (
            <div className={`bg-white shadow-xl rounded-xl p-4 flex items-center gap-3 max-w-sm border-l-4 border-teal-500 ${t.visible ? 'animate-pulse' : ''}`}>
              <Bell className="text-teal-600 shrink-0" size={24} />
              <div>
                <p className="font-semibold text-slate-800">Nouvelle commande !</p>
                <p className="text-sm text-slate-500">Commande #{(payload.new as any)?.id?.slice(-6)}</p>
              </div>
            </div>
          ), { duration: 8000 })
        }
        fetchCommandes()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchCommandes() {
    const { data } = await supabase
      .from('commandes')
      .select('*, client:clients(*)')
      .order('date_commande', { ascending: false })
    setCommandes(data ?? [])
    setLoading(false)
  }

  async function fetchCommandeDetail(id: string) {
    const { data: cmd, error: cmdErr } = await supabase
      .from('commandes')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single()

    if (cmdErr) { toast.error('Erreur chargement commande'); return null }

    const { data: items, error: itemsErr } = await supabase
      .from('commande_items')
      .select('*, medicament:medicaments(*)')
      .eq('commande_id', id)
      .order('created_at')

    if (itemsErr) toast.error('Erreur chargement articles')

    return { ...cmd, items: items ?? [] }
  }

  async function openDetail(cmd: any) {
    const detail = await fetchCommandeDetail(cmd.id)
    setSelected(detail)
    setShowDetail(true)
  }

  // Demande confirmation avant toute action critique
  function askConfirm(id: string, action: string, label: string, danger = false) {
    setConfirm({ id, action, label, danger })
  }

  async function executeAction(id: string, action: string) {
    if (action === 'paiement') {
      const cmd = commandes.find(c => c.id === id) || selected
      await confirmerPaiement(id, cmd.total)
    } else {
      await updateStatut(id, action)
    }
    setConfirm(null)
    if (showDetail) {
      const detail = await fetchCommandeDetail(id)
      setSelected(detail)
    }
  }

  async function updateStatut(id: string, statut: string) {
    const { error } = await supabase.from('commandes').update({ statut }).eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Statut mis à jour'); fetchCommandes() }
  }

  async function confirmerPaiement(id: string, montant: number) {
    try {
      await supabase.from('paiements').insert({
        commande_id: id, montant, mode_paiement: 'cash',
        date_paiement: new Date().toISOString(),
      })
      await supabase.from('commandes').update({ statut_paiement: 'paye' }).eq('id', id)
      toast.success('Paiement confirmé')
      fetchCommandes()
    } catch {
      toast.error('Erreur lors de la confirmation')
    }
  }

  async function handleGeneratePDF(cmd: any) {
    const detail = await fetchCommandeDetail(cmd.id)
    if (!detail) return
    const toastId = toast.loading('Génération en cours...')
    try {
      const url = await generateFacturePDF(detail)
      toast.dismiss(toastId)
      if (url.startsWith('http')) window.open(url, '_blank')
      toast.success('PDF généré')
    } catch {
      toast.dismiss(toastId)
      toast.error('Erreur génération PDF')
    }
  }

  async function handlePrintTicket(cmd: any) {
    const detail = await fetchCommandeDetail(cmd.id)
    if (detail) printTicket(detail)
  }

  async function enregistrerReponseClient(id: string, accepte: boolean) {
    if (accepte) {
      const { error } = await supabase.from('commandes').update({
        statut: 'confirmee',
        modification_proposee: false,
      }).eq('id', id)
      if (error) { toast.error(error.message); return }
      toast.success('Modification acceptée par le client (enregistrée)')
    } else {
      const { error } = await supabase.from('commandes').update({
        statut: 'annulee',
        modification_proposee: false,
      }).eq('id', id)
      if (error) { toast.error(error.message); return }
      toast.success('Client a refusé — commande annulée')
    }
    fetchCommandes()
    const detail = await fetchCommandeDetail(id)
    setSelected(detail)
  }

  const filtered = commandes.filter(c => {
    const matchSearch = c.client?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      c.numero_facture?.toLowerCase().includes(search.toLowerCase()) || c.id.includes(search)
    const matchFiltre = filtre === 'all' ? true :
      filtre === 'paye' ? c.statut_paiement === 'paye' : c.statut === filtre
    return matchSearch && matchFiltre
  })

  return (
    <Layout title="Commandes">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher commande..." className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['all','en_attente','confirmee','preparee','paye'] as const).map(f => (
              <button key={f} onClick={() => setFiltre(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filtre === f ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {f === 'all' ? 'Toutes' : f === 'en_attente' ? 'En attente' : f === 'confirmee' ? 'Confirmées' : f === 'preparee' ? 'Préparées' : 'Payées'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucune commande</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">N° Facture</th>
                    <th className="text-left px-4 py-3 font-medium">Client</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-center px-4 py-3 font-medium">Statut</th>
                    <th className="text-center px-4 py-3 font-medium">Paiement</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(cmd => (
                    <tr key={cmd.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{cmd.numero_facture || cmd.id.slice(-8)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{cmd.client?.nom || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{format(new Date(cmd.date_commande), 'dd/MM/yyyy HH:mm')}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">{cmd.total.toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-center"><StatutBadge statut={cmd.statut} /></td>
                      <td className="px-4 py-3 text-center"><PaiementBadge statut={cmd.statut_paiement} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetail(cmd)} className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg" title="Voir détail">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => handlePrintTicket(cmd)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg" title="Imprimer ticket">
                            <Printer size={14} />
                          </button>
                          {cmd.statut_paiement === 'en_attente' && cmd.statut !== 'annulee' && isRole('superadmin','admin','employe') && (
                            <button onClick={() => askConfirm(cmd.id, 'paiement', 'Confirmer le paiement de cette commande ?')}
                              className="p-1.5 hover:bg-green-50 text-green-600 rounded-lg" title="Confirmer paiement">
                              <CheckCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal détail */}
      {showDetail && selected && (
        <CommandeDetailModal
          commande={selected}
          onClose={() => setShowDetail(false)}
          onAskConfirm={askConfirm}
          onPrint={printTicket}
          onGeneratePDF={handleGeneratePDF}
          onOpenModif={() => setShowModif(true)}
          onReponseClient={enregistrerReponseClient}
          isRole={isRole}
        />
      )}

      {/* Modal modification */}
      {showModif && selected && (
        <ModificationModal
          commande={selected}
          onClose={() => setShowModif(false)}
          onSaved={async () => {
            setShowModif(false)
            const detail = await fetchCommandeDetail(selected.id)
            setSelected(detail)
            fetchCommandes()
          }}
        />
      )}

      {/* Modal confirmation d'action */}
      {confirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <p className="text-slate-800 font-semibold mb-2">Confirmation requise</p>
            <p className="text-sm text-slate-500 mb-6">{confirm.label}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Annuler
              </button>
              <button onClick={() => executeAction(confirm.id, confirm.action)}
                className={`px-4 py-2 text-sm text-white rounded-lg font-medium transition-colors ${confirm.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'}`}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function CommandeDetailModal({ commande, onClose, onAskConfirm, onPrint, onGeneratePDF, onOpenModif, onReponseClient, isRole }: any) {
  const items: CommandeItem[] = commande.items ?? []
  const client = commande.client || {}
  const currentStep = WORKFLOW.indexOf(commande.statut)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Commande #{commande.numero_facture || commande.id.slice(-8)}</h3>
            <p className="text-sm text-slate-500">{format(new Date(commande.date_commande), "EEEE d MMMM yyyy à HH:mm", { locale: fr })}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <XCircle size={20} />
          </button>
        </div>

        {/* Barre de progression workflow */}
        {commande.statut !== 'annulee' && (
          <div className="px-6 pt-4 pb-2">
            <div className="flex items-center gap-1">
              {WORKFLOW.map((step, i) => {
                const done = i <= currentStep
                const active = i === currentStep
                return (
                  <div key={step} className="flex items-center flex-1 min-w-0">
                    <div className={`flex flex-col items-center flex-1 min-w-0`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${active ? 'bg-teal-600 text-white ring-2 ring-teal-200' : done ? 'bg-teal-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                        {done && !active ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs mt-1 hidden sm:block truncate ${active ? 'text-teal-700 font-semibold' : done ? 'text-teal-600' : 'text-slate-400'}`}>
                        {WORKFLOW_LABELS[step]}
                      </span>
                    </div>
                    {i < WORKFLOW.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-1 ${i < currentStep ? 'bg-teal-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Corps */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-500 mb-1">Client</p>
              <p className="font-semibold text-slate-800">{client.nom || '—'}</p>
              {client.telephone && <p className="text-sm text-slate-500">{client.telephone}</p>}
              {client.adresse && <p className="text-sm text-slate-500">{client.adresse}</p>}
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-slate-500">Statut</p>
                <StatutBadge statut={commande.statut} />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-500">Paiement</p>
                <PaiementBadge statut={commande.statut_paiement} />
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-xl font-bold text-slate-800">{commande.total.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-slate-700 mb-2 text-sm">Produits commandés</h4>
            {items.length === 0 ? (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 text-sm text-amber-700">
                Aucun article trouvé pour cette commande. Les lignes n'ont peut-être pas été enregistrées correctement lors de la création.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium">Médicament</th>
                      <th className="text-right px-4 py-2 font-medium">Qté</th>
                      <th className="text-right px-4 py-2 font-medium">Prix unit.</th>
                      <th className="text-right px-4 py-2 font-medium">Sous-total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2">{item.medicament?.nom || '—'}</td>
                        <td className="px-4 py-2 text-right">{item.quantite}</td>
                        <td className="px-4 py-2 text-right">{item.prix_unitaire.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-2 text-right font-semibold">{(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} FCFA</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 font-bold text-right">Total</td>
                      <td className="px-4 py-2 font-bold text-right text-teal-700">{commande.total.toLocaleString('fr-FR')} FCFA</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Bloc modification en attente de réponse */}
          {commande.statut === 'modification_en_attente_client' && (
            <div className={`rounded-xl border-2 p-4 ${commande.client?.user_id ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
              {commande.client?.user_id ? (
                // Client avec compte — en attente réponse portail
                <div className="flex items-start gap-3">
                  <UserCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-blue-800">En attente de réponse du client (portail)</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Le client <strong>{commande.client?.nom}</strong> verra la proposition dans son espace "Mes commandes" et pourra l'accepter ou la refuser.
                    </p>
                    {commande.notes_modification && (
                      <p className="text-xs text-blue-700 mt-2 italic">Note envoyée : « {commande.notes_modification} »</p>
                    )}
                  </div>
                </div>
              ) : (
                // Client sans compte — staff doit contacter par téléphone
                <div>
                  <div className="flex items-start gap-3 mb-3">
                    <Phone size={18} className="text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Client sans compte — contact téléphonique requis</p>
                      <p className="text-xs text-orange-600 mt-1">
                        Ce client n'a pas de portail. Contactez-le et enregistrez sa réponse ci-dessous.
                      </p>
                      {commande.client?.telephone && (
                        <a href={`tel:${commande.client.telephone}`}
                          className="inline-flex items-center gap-1.5 mt-2 text-sm font-semibold text-orange-700 hover:text-orange-900">
                          <Phone size={14} /> {commande.client.telephone}
                        </a>
                      )}
                      {commande.notes_modification && (
                        <p className="text-xs text-orange-700 mt-2 italic">À communiquer : « {commande.notes_modification} »</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => onReponseClient(commande.id, true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
                      <UserCheck size={15} /> Client a accepté
                    </button>
                    <button onClick={() => onReponseClient(commande.id, false)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors">
                      <UserX size={15} /> Client a refusé
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-200 flex gap-3 flex-wrap justify-between">
          <div className="flex gap-2">
            <button onClick={() => onPrint(commande)} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg">
              <Printer size={14} /> Ticket
            </button>
            <button onClick={() => onGeneratePDF(commande)} className="flex items-center gap-2 px-3 py-2 text-sm border border-teal-300 hover:bg-teal-50 text-teal-700 rounded-lg">
              PDF
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Proposer une modification au client */}
            {['en_attente','confirmee'].includes(commande.statut) && commande.statut_paiement === 'en_attente' && isRole('superadmin','admin','employe') && (
              <button onClick={onOpenModif}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg">
                <Edit3 size={14} /> Proposer modification
              </button>
            )}

            {/* Avancer dans le workflow */}
            {commande.statut === 'en_attente' && isRole('superadmin','admin','employe') && (
              <button onClick={() => onAskConfirm(commande.id, 'confirmee', `Confirmer la commande #${commande.numero_facture || commande.id.slice(-8)} ?`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium">
                <ChevronRight size={14} /> Confirmer la commande
              </button>
            )}
            {commande.statut === 'confirmee' && isRole('superadmin','admin','employe') && (
              <button onClick={() => onAskConfirm(commande.id, 'preparee', `Marquer cette commande comme préparée (prête à être livrée) ?`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
                <PackageCheck size={14} /> Marquer préparée
              </button>
            )}

            {/* Confirmer paiement */}
            {commande.statut_paiement === 'en_attente' && commande.statut !== 'annulee' && isRole('superadmin','admin','employe') && (
              <button onClick={() => onAskConfirm(commande.id, 'paiement', `Confirmer le paiement de ${commande.total.toLocaleString('fr-FR')} FCFA ?`)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium">
                <CheckCircle size={14} /> Paiement reçu
              </button>
            )}

            {/* Retour arrière — admin seulement */}
            {commande.statut === 'confirmee' && isRole('superadmin','admin') && (
              <button onClick={() => onAskConfirm(commande.id, 'en_attente', 'Remettre cette commande en attente ? (annule la confirmation)', true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg">
                <RotateCcw size={14} /> Remettre en attente
              </button>
            )}
            {commande.statut === 'preparee' && isRole('superadmin','admin') && (
              <button onClick={() => onAskConfirm(commande.id, 'confirmee', 'Repasser cette commande en "Confirmée" ?', true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg">
                <RotateCcw size={14} /> Retour confirmée
              </button>
            )}

            {/* Annuler */}
            {commande.statut !== 'annulee' && commande.statut !== 'livree' && isRole('superadmin','admin') && (
              <button onClick={() => onAskConfirm(commande.id, 'annulee', 'Annuler définitivement cette commande ?', true)}
                className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg">
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ModificationModal({ commande, onClose, onSaved }: any) {
  const [items, setItems] = useState<any[]>((commande.items ?? []).map((i: any) => ({ ...i, nouvelleQty: i.quantite })))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const nouveauTotal = items.reduce((s: number, i: any) => s + i.nouvelleQty * i.prix_unitaire, 0)
  const hasChanges = items.some((i: any) => i.nouvelleQty !== i.quantite)

  async function handleSave() {
    if (!note.trim()) { toast.error('Ajoutez une note expliquant la modification'); return }
    if (!hasChanges) { toast.error('Aucune quantité modifiée'); return }
    const invalidItem = items.find((i: any) => i.nouvelleQty <= 0)
    if (invalidItem) { toast.error('Les quantités doivent être supérieures à 0'); return }

    setSaving(true)
    try {
      // Mettre à jour chaque item modifié
      for (const item of items) {
        if (item.nouvelleQty !== item.quantite) {
          const { error } = await supabase.from('commande_items').update({
            quantite_originale: item.quantite_originale ?? item.quantite,
            quantite: item.nouvelleQty,
          }).eq('id', item.id)
          if (error) throw new Error(error.message)
        }
      }

      // Mettre à jour la commande
      const { error } = await supabase.from('commandes').update({
        statut: 'modification_en_attente_client',
        modification_proposee: true,
        notes_modification: note.trim(),
        modifie_at: new Date().toISOString(),
        total: nouveauTotal,
      }).eq('id', commande.id)
      if (error) throw new Error(error.message)

      toast.success('Modification proposée au client')
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Proposer une modification</h2>
          <p className="text-sm text-slate-500 mt-1">Commande #{commande.numero_facture || commande.id.slice(-8)} · {commande.client?.nom}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-700">
            Modifiez les quantités ci-dessous. Le client devra accepter ou refuser la modification.
          </div>

          <div className="space-y-2">
            {items.map((item: any, idx: number) => {
              const changed = item.nouvelleQty !== item.quantite
              return (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-xl border ${changed ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-800 truncate">{item.medicament?.nom}</p>
                    <p className="text-xs text-slate-400">{item.prix_unitaire.toLocaleString('fr-FR')} FCFA/u</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {changed && <span className="text-xs text-slate-400 line-through">{item.quantite}</span>}
                    <input
                      type="number" min="1" value={item.nouvelleQty}
                      onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, nouvelleQty: Math.max(1, parseInt(e.target.value) || 1) } : it))}
                      className={`w-16 text-center border rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400 ${changed ? 'border-orange-400 text-orange-700' : 'border-slate-300'}`}
                    />
                    <span className="text-xs text-slate-500 w-24 text-right">
                      {(item.nouvelleQty * item.prix_unitaire).toLocaleString('fr-FR')} FCFA
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center py-2 border-t border-slate-200">
            <span className="font-semibold text-slate-700">Nouveau total</span>
            <span className="font-bold text-lg text-teal-700">{nouveauTotal.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note pour le client * <span className="font-normal text-slate-400">(expliquez la raison)</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
              placeholder="Ex : Stock insuffisant, seulement 9 unités disponibles au lieu de 12 commandées."
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
          <button onClick={handleSave} disabled={saving || !hasChanges}
            className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-40 font-medium transition-colors">
            {saving ? 'Envoi...' : 'Envoyer au client'}
          </button>
        </div>
      </div>
    </div>
  )
}

function printTicket(commande: any) {
  const items = commande.items ?? []
  const client = commande.client || {}
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  if (!printWindow) return
  printWindow.document.write(`
    <!DOCTYPE html><html><head>
    <title>Ticket - ${commande.numero_facture || commande.id.slice(-8)}</title>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: 'Courier New', monospace; font-size:12px; width:80mm; padding:10px; }
      .center { text-align:center; } .bold { font-weight:bold; }
      .line { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display:flex; justify-content:space-between; padding:2px 0; }
      .total { font-size:14px; font-weight:bold; }
    </style></head><body>
    <div class="center bold" style="font-size:16px">PHARMAGROSS TCHAD</div>
    <div class="center">Grossiste Pharmaceutique</div>
    <div class="line"></div>
    <div class="row"><span>Commande:</span><span>${commande.numero_facture || commande.id.slice(-8)}</span></div>
    <div class="row"><span>Client:</span><span>${client.nom || '—'}</span></div>
    <div class="row"><span>Date:</span><span>${format(new Date(commande.date_commande), 'dd/MM/yyyy HH:mm')}</span></div>
    <div class="line"></div>
    ${items.map((item: any) => `
      <div class="bold">${item.medicament?.nom || '—'}</div>
      <div class="row">
        <span>${item.quantite} x ${item.prix_unitaire.toLocaleString('fr-FR')} FCFA</span>
        <span>${(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} FCFA</span>
      </div>`).join('')}
    <div class="line"></div>
    <div class="row total"><span>TOTAL</span><span>${commande.total.toLocaleString('fr-FR')} FCFA</span></div>
    <div class="line"></div>
    <div class="center">Merci de votre confiance</div>
    <div class="center">Paiement en espèces</div>
    </body></html>`)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700',
    confirmee: 'bg-teal-100 text-teal-700',
    preparee: 'bg-indigo-100 text-indigo-700',
    livree: 'bg-green-100 text-green-700',
    annulee: 'bg-red-100 text-red-700',
    modification_en_attente_client: 'bg-orange-100 text-orange-700',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente', confirmee: 'Confirmée', preparee: 'Préparée',
    livree: 'Livrée', annulee: 'Annulée', modification_en_attente_client: 'Modif. en attente',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] || 'bg-slate-100 text-slate-600'}`}>{labels[statut] || statut}</span>
}

function PaiementBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700',
    paye: 'bg-green-100 text-green-700',
    annule: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = { en_attente: 'En attente', paye: 'Payé', annule: 'Annulé' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] || 'bg-slate-100 text-slate-600'}`}>{labels[statut] || statut}</span>
}
