import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import { CreditCard, CheckCircle, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'

export default function Paiements() {
  const { user } = useAuth()
  const [commandes, setCommandes] = useState<any[]>([])
  const [paiements, setPaiements] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'en_attente' | 'historique'>('en_attente')
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: cmds }, { data: pays }] = await Promise.all([
      supabase.from('commandes').select('*, client:clients(nom,telephone)').neq('statut', 'annulee').order('date_commande', { ascending: false }),
      supabase.from('paiements').select('*, commande:commandes(numero_facture, client:clients(nom))').order('date_paiement', { ascending: false }),
    ])
    setCommandes(cmds ?? [])
    setPaiements(pays ?? [])
    setLoading(false)
  }

  async function confirmerPaiement(commande: any) {
    try {
      await supabase.from('paiements').insert({
        commande_id: commande.id, montant: commande.total,
        mode_paiement: 'cash', date_paiement: new Date().toISOString(), enregistre_par: user?.id,
      })
      await supabase.from('commandes').update({ statut_paiement: 'paye' }).eq('id', commande.id)
      toast.success('Paiement confirmé')
      fetchData()
    } catch { toast.error('Erreur confirmation') }
  }

  const attente = commandes.filter(c =>
    c.statut_paiement === 'en_attente' &&
    (c.client?.nom?.toLowerCase().includes(search.toLowerCase()) || c.numero_facture?.includes(search))
  )
  const historiqueFiltered = paiements.filter(p =>
    p.commande?.client?.nom?.toLowerCase().includes(search.toLowerCase()) ||
    p.commande?.numero_facture?.includes(search)
  )

  return (
    <Layout title="Paiements">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab('en_attente')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'en_attente' ? 'bg-amber-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              En attente ({commandes.filter(c => c.statut_paiement === 'en_attente').length})
            </button>
            <button onClick={() => setTab('historique')} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'historique' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
              Historique
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === 'en_attente' ? (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {attente.length === 0 ? (
              <div className="text-center p-12 text-slate-400">
                <CheckCircle size={40} className="mx-auto mb-3 opacity-30 text-green-400" />
                <p>Aucun paiement en attente</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">N° Facture</th>
                      <th className="text-left px-4 py-3 font-medium">Client</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date commande</th>
                      <th className="text-right px-4 py-3 font-medium">Montant dû</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attente.map(cmd => (
                      <tr key={cmd.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{cmd.numero_facture || cmd.id.slice(-8)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{cmd.client?.nom || '—'}</p>
                          {cmd.client?.telephone && <p className="text-xs text-slate-400">{cmd.client.telephone}</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{format(new Date(cmd.date_commande), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{cmd.total.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3">
                          <button onClick={() => confirmerPaiement(cmd)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
                            <CheckCircle size={12} /> Confirmer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {historiqueFiltered.length === 0 ? (
              <div className="text-center p-12 text-slate-400"><CreditCard size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun paiement</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-left px-4 py-3 font-medium">N° Facture</th>
                      <th className="text-left px-4 py-3 font-medium">Client</th>
                      <th className="text-right px-4 py-3 font-medium">Montant</th>
                      <th className="text-center px-4 py-3 font-medium">Mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historiqueFiltered.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{format(new Date(p.date_paiement), 'dd/MM/yyyy HH:mm')}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.commande?.numero_facture || '—'}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.commande?.client?.nom || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{p.montant.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3 text-center"><span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Espèces</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
