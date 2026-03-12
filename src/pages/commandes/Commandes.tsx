import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { CommandeItem } from '../../types'
import { ShoppingCart, Search, Eye, Printer, CheckCircle, XCircle, Bell } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { generateFacturePDF } from '../../lib/pdf'
import { useAuth } from '../../contexts/AuthContext'

export default function Commandes() {
  const { isRole } = useAuth()
  const [commandes, setCommandes] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState<'all' | 'en_attente' | 'confirmee' | 'paye'>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [showDetail, setShowDetail] = useState(false)

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
    const { data: cmd } = await supabase
      .from('commandes')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single()
    const { data: items } = await supabase
      .from('commande_items')
      .select('*, medicament:medicaments(*)')
      .eq('commande_id', id)
    return { ...cmd, items }
  }

  async function openDetail(cmd: any) {
    const detail = await fetchCommandeDetail(cmd.id)
    setSelected(detail)
    setShowDetail(true)
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
      await supabase.from('commandes').update({ statut_paiement: 'paye', statut: 'livree' }).eq('id', id)
      toast.success('Paiement confirmé')
      fetchCommandes()
      if (showDetail && selected) openDetail({ id })
    } catch {
      toast.error('Erreur lors de la confirmation')
    }
  }

  async function handlePrintTicket(cmd: any) {
    const detail = await fetchCommandeDetail(cmd.id)
    if (!detail) { toast.error('Commande introuvable'); return }
    printTicket(detail)
  }

  async function handleGeneratePDF(cmd: any) {
    const detail = await fetchCommandeDetail(cmd.id)
    if (!detail) return
    try {
      const url = await generateFacturePDF(detail)
      window.open(url, '_blank')
    } catch {
      toast.error('Erreur génération PDF')
    }
  }

  const filtered = commandes.filter(c => {
    const matchSearch = c.client?.nom?.toLowerCase().includes(search.toLowerCase()) ||
      c.numero_facture?.toLowerCase().includes(search.toLowerCase()) ||
      c.id.includes(search)
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
            {(['all','en_attente','confirmee','paye'] as const).map(f => (
              <button key={f} onClick={() => setFiltre(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${filtre === f ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {f === 'all' ? 'Toutes' : f === 'en_attente' ? 'En attente' : f === 'confirmee' ? 'Confirmées' : 'Payées'}
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
                            <button onClick={() => confirmerPaiement(cmd.id, cmd.total)}
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

      {showDetail && selected && (
        <CommandeDetailModal
          commande={selected}
          onClose={() => setShowDetail(false)}
          onConfirmPaiement={confirmerPaiement}
          onPrint={printTicket}
          onGeneratePDF={handleGeneratePDF}
          onUpdateStatut={updateStatut}
          isRole={isRole}
        />
      )}
    </Layout>
  )
}

function CommandeDetailModal({ commande, onClose, onConfirmPaiement, onPrint, onGeneratePDF, onUpdateStatut, isRole }: any) {
  const items: CommandeItem[] = commande.items ?? []
  const client = commande.client || {}
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Commande #{commande.numero_facture || commande.id.slice(-8)}</h3>
            <p className="text-sm text-slate-500">{format(new Date(commande.date_commande), "EEEE d MMMM yyyy à HH:mm", { locale: fr })}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
            <XCircle size={20} />
          </button>
        </div>
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
                <p className="text-xs text-slate-500">Statut commande</p>
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
          </div>
        </div>
        <div className="p-6 border-t border-slate-200 flex gap-3 flex-wrap justify-between">
          <div className="flex gap-2">
            <button onClick={() => onPrint(commande)} className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors">
              <Printer size={14} /> Ticket
            </button>
            <button onClick={() => onGeneratePDF(commande)} className="flex items-center gap-2 px-3 py-2 text-sm border border-teal-300 hover:bg-teal-50 text-teal-700 rounded-lg transition-colors">
              PDF
            </button>
          </div>
          <div className="flex gap-2">
            {commande.statut === 'en_attente' && isRole('superadmin','admin','employe') && (
              <button onClick={() => { onUpdateStatut(commande.id, 'confirmee'); onClose() }}
                className="px-3 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
                Confirmer commande
              </button>
            )}
            {commande.statut_paiement === 'en_attente' && commande.statut !== 'annulee' && isRole('superadmin','admin','employe') && (
              <button onClick={() => { onConfirmPaiement(commande.id, commande.total); onClose() }}
                className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                Confirmer paiement
              </button>
            )}
            {commande.statut !== 'annulee' && isRole('superadmin','admin') && (
              <button onClick={() => { onUpdateStatut(commande.id, 'annulee'); onClose() }}
                className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                Annuler
              </button>
            )}
          </div>
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
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket - ${commande.numero_facture || commande.id.slice(-8)}</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: 'Courier New', monospace; font-size:12px; width:80mm; padding:10px; }
        .center { text-align:center; }
        .bold { font-weight:bold; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display:flex; justify-content:space-between; padding:2px 0; }
        .total { font-size:14px; font-weight:bold; }
      </style>
    </head>
    <body>
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
        </div>
      `).join('')}
      <div class="line"></div>
      <div class="row total">
        <span>TOTAL</span>
        <span>${commande.total.toLocaleString('fr-FR')} FCFA</span>
      </div>
      <div class="line"></div>
      <div class="center">Merci de votre confiance</div>
      <div class="center">Paiement en espèces</div>
    </body>
    </html>
  `)
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
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente', confirmee: 'Confirmée', preparee: 'Préparée', livree: 'Livrée', annulee: 'Annulée'
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
