import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { StockMedicament } from '../../types'
import { Package, AlertTriangle, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export default function Stock() {
  const [stocks, setStocks] = useState<StockMedicament[]>([])
  const [lots, setLots] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: stockData }, { data: lotsData }] = await Promise.all([
      supabase.from('stock_medicament').select('*').order('nom'),
      supabase.from('lots').select('*, medicament:medicaments(nom,marge)').eq('actif', true).order('prix_achat').order('date_reception'),
    ])
    setStocks(stockData ?? [])
    setLots(lotsData ?? [])
    setLoading(false)
  }

  function getLots(medicamentId: string) {
    return lots.filter(l => l.medicament_id === medicamentId)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const filtered = stocks.filter(s =>
    s.nom.toLowerCase().includes(search.toLowerCase()) || s.code?.toLowerCase().includes(search.toLowerCase())
  )
  const stockFaible = stocks.filter(s => s.quantite_totale <= s.seuil_alerte && s.quantite_totale > 0).length
  const rupture = stocks.filter(s => s.quantite_totale === 0).length

  return (
    <Layout title="Stock & Lots">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total références', value: stocks.length, color: '' },
            { label: 'Lots actifs', value: lots.filter(l => l.quantite > 0).length, color: '' },
            { label: 'Stock faible', value: stockFaible, color: stockFaible > 0 ? 'bg-amber-50 border-amber-200 text-amber-700' : '' },
            { label: 'Rupture', value: rupture, color: rupture > 0 ? 'bg-red-50 border-red-200 text-red-700' : '' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-4 ${s.color || 'bg-white border-slate-200'}`}>
              <p className="text-xs text-slate-500 mb-1">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher médicament..."
            className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400"><Package size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun médicament en stock</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(stock => {
                const lotsForMed = getLots(stock.medicament_id)
                const isExpanded = expanded.has(stock.medicament_id)
                const isFaible = stock.quantite_totale <= stock.seuil_alerte && stock.quantite_totale > 0
                const isRupture = stock.quantite_totale === 0
                const prixVente = stock.prix_achat_min ? stock.prix_achat_min + stock.marge : null
                return (
                  <div key={stock.medicament_id}>
                    <div onClick={() => toggleExpand(stock.medicament_id)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${isFaible ? 'bg-amber-50/50' : ''} ${isRupture ? 'bg-red-50/50' : ''}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Package className={`shrink-0 ${isRupture ? 'text-red-400' : isFaible ? 'text-amber-500' : 'text-slate-400'}`} size={18} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 text-sm">{stock.nom}</p>
                          {stock.code && <p className="text-xs text-slate-400">{stock.code}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="hidden sm:block text-right">
                          <p className="text-xs text-slate-400">Prix vente</p>
                          <p className="text-sm font-semibold text-green-700">{prixVente ? `${prixVente.toLocaleString('fr-FR')} FCFA` : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">Quantité</p>
                          <div className="flex items-center gap-1.5">
                            {(isFaible || isRupture) && <AlertTriangle size={14} className={isRupture ? 'text-red-500' : 'text-amber-500'} />}
                            <span className={`text-sm font-bold ${isRupture ? 'text-red-600' : isFaible ? 'text-amber-600' : 'text-slate-800'}`}>{stock.quantite_totale}</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-100 px-4 py-3">
                        <p className="text-xs font-medium text-slate-500 mb-2">Lots (ordre FIFO)</p>
                        {lotsForMed.length === 0 ? <p className="text-xs text-slate-400">Aucun lot actif</p> : (
                          <div className="space-y-1.5">
                            {lotsForMed.map((lot, idx) => {
                              const daysLeft = differenceInDays(new Date(lot.date_expiration), new Date())
                              const expiring = daysLeft <= 30
                              return (
                                <div key={lot.id} className={`flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs border ${idx === 0 ? 'border-teal-200' : 'border-slate-200'}`}>
                                  <div className="flex items-center gap-2">
                                    {idx === 0 && <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded font-medium">FIFO</span>}
                                    <span className="font-medium">{lot.pays_origine}</span>
                                    <span className="text-slate-400">Lot: {lot.numero_lot}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span>Qté: <strong>{lot.quantite}</strong></span>
                                    <span>Achat: <strong>{lot.prix_achat.toLocaleString('fr-FR')} FCFA</strong></span>
                                    <span className={`${expiring ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                                      Exp: {format(new Date(lot.date_expiration), 'dd/MM/yyyy')}{expiring && ` (${daysLeft}j)`}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
