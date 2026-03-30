import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { Medicament } from '../../types'
import { Plus, TruckIcon, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const EMPTY = { medicament_id: '', pays_origine: '', prix_achat: 0, quantite: 0,
  date_reception: new Date().toISOString().split('T')[0], date_expiration: '', numero_lot: '' }

export default function Arrivages() {
  const [lots, setLots] = useState<any[]>([])
  const [medicaments, setMedicaments] = useState<Pick<Medicament,'id'|'nom'|'code'>[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: lotsData }, { data: medsData }] = await Promise.all([
      supabase.from('lots').select('*, medicament:medicaments(nom)').order('created_at', { ascending: false }),
      supabase.from('medicaments').select('id,nom,code').eq('actif', true).order('nom'),
    ])
    setLots(lotsData ?? [])
    setMedicaments(medsData ?? [])
    setLoading(false)
  }

  async function handleSave() {
    if (!form.medicament_id) { toast.error('Sélectionnez un médicament'); return }
    if (!form.pays_origine.trim()) { toast.error("Pays d'origine requis"); return }
    if (form.prix_achat <= 0) { toast.error("Prix d'achat invalide"); return }
    if (form.quantite <= 0) { toast.error('Quantité invalide'); return }
    if (!form.date_expiration) { toast.error("Date d'expiration requise"); return }
    if (form.date_expiration <= form.date_reception) { toast.error("La date d'expiration doit être postérieure à la date de réception"); return }
    if (!form.numero_lot.trim()) { toast.error('Numéro de lot requis'); return }

    setSaving(true)
    const { error } = await supabase.from('lots').insert({ ...form, quantite_initiale: form.quantite, actif: true })
    if (error) toast.error('Erreur: ' + error.message)
    else { toast.success('Arrivage enregistré'); setShowModal(false); setForm({ ...EMPTY }); fetchData() }
    setSaving(false)
  }

  const filtered = lots.filter(l =>
    l.medicament?.nom?.toLowerCase().includes(search.toLowerCase()) ||
    l.pays_origine.toLowerCase().includes(search.toLowerCase()) ||
    l.numero_lot.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Arrivages">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher arrivage..."
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nouvel arrivage
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400"><TruckIcon size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun arrivage enregistré</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Médicament</th>
                    <th className="text-left px-4 py-3 font-medium">Pays</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">N° Lot</th>
                    <th className="text-right px-4 py-3 font-medium">Prix achat</th>
                    <th className="text-right px-4 py-3 font-medium">Qté init.</th>
                    <th className="text-right px-4 py-3 font-medium">Qté restante</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Réception</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Expiration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(lot => {
                    const daysToExp = Math.ceil((new Date(lot.date_expiration).getTime() - Date.now()) / 86400000)
                    return (
                      <tr key={lot.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{lot.medicament?.nom}</td>
                        <td className="px-4 py-3 text-slate-600">{lot.pays_origine}</td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell font-mono text-xs">{lot.numero_lot}</td>
                        <td className="px-4 py-3 text-right font-semibold">{lot.prix_achat.toLocaleString('fr-FR')} FCFA</td>
                        <td className="px-4 py-3 text-right text-slate-600">{lot.quantite_initiale}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${lot.quantite === 0 ? 'text-red-600' : lot.quantite <= 5 ? 'text-amber-600' : 'text-green-700'}`}>{lot.quantite}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{format(new Date(lot.date_reception), 'dd/MM/yyyy')}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`${daysToExp < 0 ? 'text-red-600 font-semibold' : daysToExp <= 30 ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                            {format(new Date(lot.date_expiration), 'dd/MM/yyyy')}{daysToExp < 0 ? ' (EXPIRÉ)' : daysToExp <= 30 ? ` (${daysToExp}j)` : ''}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-200"><h3 className="text-lg font-semibold">Enregistrer un arrivage</h3></div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Médicament *</label>
                <select value={form.medicament_id} onChange={e => setForm({ ...form, medicament_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Sélectionner un médicament</option>
                  {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} {m.code ? `(${m.code})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Pays d'origine *", key: 'pays_origine', type: 'text', placeholder: 'Cameroun, France...' },
                  { label: 'N° de lot *', key: 'numero_lot', type: 'text', placeholder: 'LOT-2024-001' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                    <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                ))}
                {[
                  { label: "Prix d'achat (FCFA) *", key: 'prix_achat' },
                  { label: 'Quantité *', key: 'quantite' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                    <input type="number" value={(form as any)[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: +e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                ))}
                {[
                  { label: 'Date de réception *', key: 'date_reception' },
                  { label: "Date d'expiration *", key: 'date_expiration' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                    <input type="date" value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : "Enregistrer l'arrivage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
