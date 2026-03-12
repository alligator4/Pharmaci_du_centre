import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import { Download, FileSpreadsheet } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { exportCommandesToExcel, exportVentesToExcel } from '../../lib/excel'

export default function Rapports() {
  const [ventesJour, setVentesJour] = useState<any[]>([])
  const [topMeds, setTopMeds] = useState<any[]>([])
  const [allCommandes, setAllCommandes] = useState<any[]>([])
  const [allItems, setAllItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState<7 | 30 | 90>(30)

  useEffect(() => { fetchData() }, [periode])

  async function fetchData() {
    setLoading(true)
    const dateDebut = subDays(new Date(), periode).toISOString()

    const [{ data: cmds }, { data: items }] = await Promise.all([
      supabase.from('commandes')
        .select('*, client:clients(nom)')
        .gte('date_commande', dateDebut)
        .order('date_commande'),
      supabase.from('commande_items')
        .select('*, medicament:medicaments(nom), commande:commandes(numero_facture, client:clients(nom))')
        .gte('created_at', dateDebut),
    ])

    const commandesList = cmds ?? []
    const itemsList = items ?? []
    setAllCommandes(commandesList)
    setAllItems(itemsList)

    const ventesByDay: Record<string, number> = {}
    for (let i = periode - 1; i >= 0; i--) {
      const day = format(subDays(new Date(), i), 'dd/MM')
      ventesByDay[day] = 0
    }
    commandesList.filter(c => c.statut_paiement === 'paye').forEach(c => {
      const day = format(new Date(c.date_commande), 'dd/MM')
      if (ventesByDay[day] !== undefined) ventesByDay[day] += c.total
    })
    setVentesJour(Object.entries(ventesByDay).map(([date, total]) => ({ date, total })))

    const medMap: Record<string, number> = {}
    itemsList.forEach((item: any) => {
      const nom = item.medicament?.nom || 'Inconnu'
      medMap[nom] = (medMap[nom] || 0) + item.quantite
    })
    setTopMeds(
      Object.entries(medMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
        .map(([nom, total]) => ({ nom, total }))
    )

    setLoading(false)
  }

  const totalVentes = allCommandes.filter(c => c.statut_paiement === 'paye').reduce((s, c) => s + c.total, 0)
  const nbCommandes = allCommandes.length
  const nbPayees = allCommandes.filter(c => c.statut_paiement === 'paye').length
  const COLORS = ['#0d9488','#0891b2','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#6366f1']

  return (
    <Layout title="Rapports">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Rapports & Statistiques</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {([7, 30, 90] as const).map(p => (
              <button key={p} onClick={() => setPeriode(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${periode === p ? 'bg-teal-600 text-white' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'}`}>
                {p}j
              </button>
            ))}
            <button onClick={() => exportCommandesToExcel(allCommandes)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <FileSpreadsheet size={14} /> Commandes
            </button>
            <button onClick={() => exportVentesToExcel(allItems)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
              <Download size={14} /> Ventes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: `Revenu (${periode}j)`, value: `${totalVentes.toLocaleString('fr-FR')} FCFA`, color: 'text-teal-700' },
            { label: 'Nb commandes', value: nbCommandes.toString(), color: 'text-slate-800' },
            { label: 'Commandes payées', value: `${nbPayees} (${nbCommandes > 0 ? Math.round(nbPayees/nbCommandes*100) : 0}%)`, color: 'text-green-700' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Ventes quotidiennes (FCFA)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={ventesJour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(ventesJour.length / 7)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`${v.toLocaleString('fr-FR')} FCFA`, 'Ventes']} />
                  <Line type="monotone" dataKey="total" stroke="#0d9488" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Top 10 médicaments vendus</h3>
              {topMeds.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Aucune donnée</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topMeds} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="nom" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="total" name="Quantité" radius={[0,4,4,0]}>
                      {topMeds.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
