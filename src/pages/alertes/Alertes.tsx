import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import { AlertTriangle, CalendarClock, Package } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export default function Alertes() {
  const [stockFaible, setStockFaible] = useState<any[]>([])
  const [expirationsProches, setExpirationsProches] = useState<any[]>([])
  const [expires, setExpires] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAlertes() }, [])

  async function fetchAlertes() {
    const today = new Date().toISOString().split('T')[0]
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [{ data: allStocks }, { data: lotsExp }, { data: lotsExpires }] = await Promise.all([
      supabase.from('stock_medicament').select('*'),
      supabase.from('lots').select('*, medicament:medicaments(nom)').lte('date_expiration', in30Days).gt('date_expiration', today).gt('quantite', 0).order('date_expiration'),
      supabase.from('lots').select('*, medicament:medicaments(nom)').lt('date_expiration', today).gt('quantite', 0).order('date_expiration'),
    ])

    setStockFaible((allStocks ?? []).filter(s => s.quantite_totale <= s.seuil_alerte && s.quantite_totale > 0))
    setExpirationsProches(lotsExp ?? [])
    setExpires(lotsExpires ?? [])
    setLoading(false)
  }

  const total = stockFaible.length + expirationsProches.length + expires.length

  return (
    <Layout title="Alertes">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="text-red-600" size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Alertes & Notifications</h2>
            <p className="text-slate-500 text-sm">{total} alerte(s) active(s)</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            {expires.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-base font-semibold text-red-700 mb-3"><CalendarClock size={18} /> Lots expirés ({expires.length})</h3>
                <div className="space-y-2">
                  {expires.map(lot => (
                    <div key={lot.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div>
                        <p className="font-semibold text-red-800">{lot.medicament?.nom}</p>
                        <p className="text-sm text-red-600">Lot {lot.numero_lot} • {lot.pays_origine}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-700">Qté: {lot.quantite}</p>
                        <p className="text-xs text-red-500">Exp: {format(new Date(lot.date_expiration), 'dd/MM/yyyy')}</p>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">EXPIRÉ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {expirationsProches.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-base font-semibold text-amber-700 mb-3"><CalendarClock size={18} /> Expirent dans 30 jours ({expirationsProches.length})</h3>
                <div className="space-y-2">
                  {expirationsProches.map(lot => {
                    const days = differenceInDays(new Date(lot.date_expiration), new Date())
                    return (
                      <div key={lot.id} className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div>
                          <p className="font-semibold text-amber-800">{lot.medicament?.nom}</p>
                          <p className="text-sm text-amber-600">Lot {lot.numero_lot} • {lot.pays_origine}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-amber-700">Qté: {lot.quantite}</p>
                          <p className="text-xs text-amber-500">Exp: {format(new Date(lot.date_expiration), 'dd/MM/yyyy')}</p>
                          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">{days}j restants</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {stockFaible.length > 0 && (
              <section>
                <h3 className="flex items-center gap-2 text-base font-semibold text-orange-700 mb-3"><Package size={18} /> Stock faible ({stockFaible.length})</h3>
                <div className="space-y-2">
                  {stockFaible.map((s: any) => (
                    <div key={s.medicament_id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-xl">
                      <div>
                        <p className="font-semibold text-orange-800">{s.nom}</p>
                        {s.code && <p className="text-sm text-orange-600">Code: {s.code}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-700">{s.quantite_totale} / {s.seuil_alerte}</p>
                        <div className="w-24 bg-orange-200 rounded-full h-1.5 mt-1">
                          <div className="bg-orange-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, (s.quantite_totale / s.seuil_alerte) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {total === 0 && (
              <div className="text-center py-16 text-slate-400">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="text-green-600" size={32} />
                </div>
                <p className="text-lg font-medium text-green-600">Aucune alerte</p>
                <p className="text-sm mt-1">Tous les stocks sont en bon état</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
