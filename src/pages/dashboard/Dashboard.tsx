import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import {
  ShoppingCart, TrendingUp, Clock, CheckCircle, Package, CalendarClock, DollarSign
} from 'lucide-react'
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { format, startOfDay, endOfDay, startOfMonth } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Stats {
  ventes_jour: number
  nb_commandes_jour: number
  commandes_en_attente: number
  commandes_payees: number
  revenu_mois: number
  stock_faible: number
  expirations_30j: number
}

interface TopMedicament {
  nom: string
  total_vendu: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    ventes_jour: 0, nb_commandes_jour: 0, commandes_en_attente: 0,
    commandes_payees: 0, revenu_mois: 0, stock_faible: 0, expirations_30j: 0
  })
  const [topMeds, setTopMeds] = useState<TopMedicament[]>([])
  const [recentCommandes, setRecentCommandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboard()

    const channel = supabase.channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' }, () => {
        fetchDashboard()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchDashboard() {
    const today = new Date()
    const todayStart = startOfDay(today).toISOString()
    const todayEnd = endOfDay(today).toISOString()
    const monthStart = startOfMonth(today).toISOString()
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      { data: commandesJour },
      { data: commandesEnAttente },
      { data: commandesPayees },
      { data: revenuMoisCmds },
      { data: stockData },
      { data: lotsExp },
      { data: topItems },
      { data: recentes },
    ] = await Promise.all([
      supabase.from('commandes').select('total').gte('date_commande', todayStart).lte('date_commande', todayEnd),
      supabase.from('commandes').select('id').eq('statut_paiement', 'en_attente').neq('statut', 'annulee'),
      supabase.from('commandes').select('id').eq('statut_paiement', 'paye'),
      supabase.from('commandes').select('total').eq('statut_paiement', 'paye').gte('date_commande', monthStart),
      supabase.from('stock_medicament').select('quantite_totale, seuil_alerte'),
      supabase.from('lots').select('id').lte('date_expiration', in30Days).gt('quantite', 0),
      supabase.from('commande_items').select('quantite, medicament:medicaments(nom)'),
      supabase.from('commandes').select('*, client:clients(nom)').order('date_commande', { ascending: false }).limit(5),
    ])

    const ventesJour = (commandesJour ?? []).reduce((s, c) => s + (c.total || 0), 0)
    const revenuMoisTotal = (revenuMoisCmds ?? []).reduce((s, c) => s + (c.total || 0), 0)
    const stockFaibleCount = (stockData ?? []).filter(s => s.quantite_totale <= s.seuil_alerte && s.quantite_totale > 0).length

    const medMap: Record<string, number> = {}
    ;(topItems ?? []).forEach((item: any) => {
      const nom = item.medicament?.nom || 'Inconnu'
      medMap[nom] = (medMap[nom] || 0) + item.quantite
    })
    const topList = Object.entries(medMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nom, total_vendu]) => ({ nom, total_vendu }))

    setStats({
      ventes_jour: ventesJour,
      nb_commandes_jour: (commandesJour ?? []).length,
      commandes_en_attente: (commandesEnAttente ?? []).length,
      commandes_payees: (commandesPayees ?? []).length,
      revenu_mois: revenuMoisTotal,
      stock_faible: stockFaibleCount,
      expirations_30j: (lotsExp ?? []).length,
    })
    setTopMeds(topList)
    setRecentCommandes(recentes ?? [])
    setLoading(false)
  }

  const COLORS = ['#0d9488','#0891b2','#f59e0b','#ef4444','#8b5cf6']

  if (loading) return (
    <Layout title="Tableau de bord">
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  )

  return (
    <Layout title="Tableau de bord">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Tableau de bord</h2>
            <p className="text-slate-500 text-sm">{format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Ventes du jour"
            value={`${stats.ventes_jour.toLocaleString('fr-FR')} FCFA`}
            icon={<TrendingUp size={20} />}
            color="teal"
            sub={`${stats.nb_commandes_jour} commande(s)`}
          />
          <StatCard
            title="En attente paiement"
            value={stats.commandes_en_attente.toString()}
            icon={<Clock size={20} />}
            color="amber"
            sub="commandes"
          />
          <StatCard
            title="Commandes payées"
            value={stats.commandes_payees.toString()}
            icon={<CheckCircle size={20} />}
            color="green"
            sub="total"
          />
          <StatCard
            title="Revenu du mois"
            value={`${stats.revenu_mois.toLocaleString('fr-FR')} FCFA`}
            icon={<DollarSign size={20} />}
            color="purple"
            sub="encaissé"
          />
        </div>

        {(stats.stock_faible > 0 || stats.expirations_30j > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.stock_faible > 0 && (
              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Package className="text-amber-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-amber-800">{stats.stock_faible} lot(s) en stock faible</p>
                  <p className="text-amber-600 text-sm">Quantité inférieure au seuil d'alerte</p>
                </div>
              </div>
            )}
            {stats.expirations_30j > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <CalendarClock className="text-red-600 shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-red-800">{stats.expirations_30j} lot(s) expirent dans 30j</p>
                  <p className="text-red-600 text-sm">Vérifiez les dates d'expiration</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(13,148,136,0.06)' }}>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Package className="text-teal-600" size={18} />
              Top 5 Médicaments vendus
            </h3>
            {topMeds.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <ReBarChart data={topMeds} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="total_vendu" name="Quantité vendue" radius={[0,4,4,0]}>
                    {topMeds.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">Aucune vente enregistrée</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 8px rgba(13,148,136,0.06)' }}>
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <ShoppingCart className="text-teal-600" size={18} />
              Commandes récentes
            </h3>
            <div className="space-y-2">
              {recentCommandes.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-8">Aucune commande</p>
              ) : recentCommandes.map(cmd => (
                <div key={cmd.id} className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{cmd.client?.nom ?? '—'}</p>
                    <p className="text-xs text-slate-500">{format(new Date(cmd.date_commande), 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">{cmd.total.toLocaleString('fr-FR')} FCFA</p>
                    <StatusBadge statut={cmd.statut} paiement={cmd.statut_paiement} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ title, value, icon, color, sub }: {
  title: string; value: string; icon: React.ReactNode; color: string; sub?: string
}) {
  const styles: Record<string, { card: React.CSSProperties; icon: React.CSSProperties; text: string }> = {
    teal:   { card: { background: 'linear-gradient(135deg, #0d9488, #0891b2)', boxShadow: '0 4px 15px rgba(13,148,136,0.3)' }, icon: { background: 'rgba(255,255,255,0.2)' }, text: 'text-white' },
    amber:  { card: { background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }, icon: { background: 'rgba(255,255,255,0.2)' }, text: 'text-white' },
    green:  { card: { background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }, icon: { background: 'rgba(255,255,255,0.2)' }, text: 'text-white' },
    purple: { card: { background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }, icon: { background: 'rgba(255,255,255,0.2)' }, text: 'text-white' },
    red:    { card: { background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 15px rgba(239,68,68,0.3)' }, icon: { background: 'rgba(255,255,255,0.2)' }, text: 'text-white' },
  }
  const s = styles[color] ?? styles.teal
  return (
    <div className="rounded-2xl p-4" style={s.card}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-medium opacity-80 mb-1 ${s.text}`}>{title}</p>
          <p className={`text-lg font-bold leading-tight ${s.text}`}>{value}</p>
          {sub && <p className={`text-xs opacity-70 mt-0.5 ${s.text}`}>{sub}</p>}
        </div>
        <div className="text-white p-2 rounded-xl" style={s.icon}>{icon}</div>
      </div>
    </div>
  )
}

function StatusBadge({ statut, paiement }: { statut: string; paiement: string }) {
  if (paiement === 'paye') return <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Payé</span>
  if (statut === 'annulee') return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Annulé</span>
  return <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">En attente</span>
}
