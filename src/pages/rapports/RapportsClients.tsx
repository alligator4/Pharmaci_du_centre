import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { RapportClient } from '../../types'
import { Users, TrendingUp, AlertCircle, Download, Search, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import * as XLSX from 'xlsx'

export default function RapportsClients() {
  const [rapports, setRapports] = useState<RapportClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<RapportClient | null>(null)
  const [commandes, setCommandes] = useState<any[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => { fetchRapports() }, [])

  async function fetchRapports() {
    const { data, error } = await supabase.from('rapport_client').select('*').order('chiffre_affaires', { ascending: false })
    if (error) {
      // Fallback si la vue n'existe pas encore
      const { data: clients } = await supabase.from('clients').select('*, commandes(*)').eq('actif', true)
      setRapports((clients ?? []).map((c: any) => ({
        client_id: c.id, nom: c.nom, telephone: c.telephone, email: c.email,
        nb_commandes: c.commandes?.length ?? 0,
        chiffre_affaires: c.commandes?.filter((co: any) => co.statut !== 'annulee').reduce((s: number, co: any) => s + co.total, 0) ?? 0,
        montant_encaisse: c.commandes?.filter((co: any) => co.statut_paiement === 'paye').reduce((s: number, co: any) => s + co.total, 0) ?? 0,
        montant_impaye: c.commandes?.filter((co: any) => co.statut_paiement === 'en_attente' && co.statut !== 'annulee').reduce((s: number, co: any) => s + co.total, 0) ?? 0,
        derniere_commande: c.commandes?.sort((a: any, b: any) => new Date(b.date_commande).getTime() - new Date(a.date_commande).getTime())[0]?.date_commande,
        nb_annulations: c.commandes?.filter((co: any) => co.statut === 'annulee').length ?? 0,
      })))
    } else {
      setRapports(data ?? [])
    }
    setLoading(false)
  }

  async function openDetail(r: RapportClient) {
    setSelected(r)
    setLoadingDetail(true)
    const { data } = await supabase
      .from('commandes')
      .select('*, commande_items(*, medicament:medicaments(nom))')
      .eq('client_id', r.client_id)
      .order('date_commande', { ascending: false })
    setCommandes(data ?? [])
    setLoadingDetail(false)
  }

  function exportExcel() {
    const rows = rapports.map(r => ({
      'Client': r.nom,
      'Téléphone': r.telephone ?? '',
      'Email': r.email ?? '',
      'Nb commandes': r.nb_commandes,
      'CA Total (FCFA)': r.chiffre_affaires,
      'Encaissé (FCFA)': r.montant_encaisse,
      'Impayé (FCFA)': r.montant_impaye,
      'Annulations': r.nb_annulations,
      'Dernière commande': r.derniere_commande ? format(new Date(r.derniere_commande), 'dd/MM/yyyy', { locale: fr }) : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Rapport clients')
    XLSX.writeFile(wb, `rapport-clients-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  const totalCA = rapports.reduce((s, r) => s + r.chiffre_affaires, 0)
  const totalImpaye = rapports.reduce((s, r) => s + r.montant_impaye, 0)
  const totalEncaisse = rapports.reduce((s, r) => s + r.montant_encaisse, 0)

  const filtered = rapports.filter(r =>
    r.nom.toLowerCase().includes(search.toLowerCase()) ||
    r.telephone?.includes(search) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Rapports clients">
      <div className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                <TrendingUp size={20} className="text-teal-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">CA Total</p>
                <p className="text-lg font-bold text-slate-800">{totalCA.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Encaissé</p>
                <p className="text-lg font-bold text-slate-800">{totalEncaisse.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Impayés</p>
                <p className="text-lg font-bold text-red-600">{totalImpaye.toLocaleString('fr-FR')} FCFA</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher client..." className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            <Download size={16} /> Exporter Excel
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucun client</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Client', 'Commandes', 'CA Total', 'Encaissé', 'Impayé', 'Dernière cmd', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(r => (
                    <tr key={r.client_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                            {r.nom.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{r.nom}</p>
                            {r.telephone && <p className="text-xs text-slate-400">{r.telephone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800">{r.nb_commandes}</span>
                        {r.nb_annulations > 0 && (
                          <span className="ml-1 text-xs text-red-500">({r.nb_annulations} annulées)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{r.chiffre_affaires.toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-green-700 font-medium">{r.montant_encaisse.toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3">
                        <span className={r.montant_impaye > 0 ? 'text-red-600 font-semibold' : 'text-slate-400'}>
                          {r.montant_impaye.toLocaleString('fr-FR')} FCFA
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {r.derniere_commande ? format(new Date(r.derniere_commande), 'd MMM yyyy', { locale: fr }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(r)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
                          <Eye size={12} /> Détail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal détail client */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{selected.nom}</h2>
                {selected.telephone && <p className="text-sm text-slate-500">{selected.telephone}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 border-b border-slate-100">
              {[
                { label: 'Commandes', value: selected.nb_commandes, color: 'text-slate-800' },
                { label: 'CA Total', value: `${selected.chiffre_affaires.toLocaleString('fr-FR')} F`, color: 'text-slate-800' },
                { label: 'Encaissé', value: `${selected.montant_encaisse.toLocaleString('fr-FR')} F`, color: 'text-green-700' },
                { label: 'Impayé', value: `${selected.montant_impaye.toLocaleString('fr-FR')} F`, color: selected.montant_impaye > 0 ? 'text-red-600' : 'text-slate-400' },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                  <p className={`font-bold text-sm ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Historique des commandes</h3>
              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : commandes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Aucune commande</p>
              ) : (
                <div className="space-y-3">
                  {commandes.map(cmd => (
                    <div key={cmd.id} className="border border-slate-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-slate-800">#{cmd.numero_facture || cmd.id.slice(-6)}</span>
                        <div className="flex items-center gap-2">
                          <StatutBadge statut={cmd.statut} />
                          <PaiementBadge statut={cmd.statut_paiement} />
                          <span className="font-semibold text-sm text-teal-600">{cmd.total.toLocaleString('fr-FR')} FCFA</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">{format(new Date(cmd.date_commande), 'd MMMM yyyy à HH:mm', { locale: fr })}</p>
                      <div className="space-y-1">
                        {(cmd.commande_items ?? []).map((item: any) => (
                          <div key={item.id} className="flex justify-between text-xs text-slate-600">
                            <span>{item.medicament?.nom} × {item.quantite}</span>
                            <span>{(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} FCFA</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

function StatutBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = {
    en_attente: 'bg-amber-100 text-amber-700', confirmee: 'bg-teal-100 text-teal-700',
    preparee: 'bg-blue-100 text-blue-700', livree: 'bg-green-100 text-green-700', annulee: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    en_attente: 'En attente', confirmee: 'Confirmée', preparee: 'Préparée', livree: 'Livrée', annulee: 'Annulée',
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] || 'bg-slate-100 text-slate-600'}`}>{labels[statut] || statut}</span>
}

function PaiementBadge({ statut }: { statut: string }) {
  const map: Record<string, string> = { en_attente: 'bg-amber-100 text-amber-700', paye: 'bg-green-100 text-green-700', annule: 'bg-red-100 text-red-700' }
  const labels: Record<string, string> = { en_attente: 'Non payé', paye: 'Payé', annule: 'Annulé' }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[statut] || 'bg-slate-100 text-slate-600'}`}>{labels[statut] || statut}</span>
}
