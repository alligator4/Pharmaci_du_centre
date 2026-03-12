import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { Medicament } from '../../types'
import { Plus, Search, Edit2, Trash2, Pill } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { nom: '', code: '', description: '', forme: '', dosage: '', marge: 500, seuil_alerte: 10 }

export default function Medicaments() {
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Medicament | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchMeds() }, [])

  async function fetchMeds() {
    const { data } = await supabase.from('medicaments').select('*').eq('actif', true).order('nom')
    setMedicaments(data ?? [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setShowModal(true) }
  function openEdit(m: Medicament) {
    setEditing(m)
    setForm({ nom: m.nom, code: m.code ?? '', description: m.description ?? '', forme: m.forme ?? '', dosage: m.dosage ?? '', marge: m.marge, seuil_alerte: m.seuil_alerte })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nom.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    const op = editing
      ? supabase.from('medicaments').update(form).eq('id', editing.id)
      : supabase.from('medicaments').insert({ ...form, actif: true })
    const { error } = await op
    if (error) toast.error('Erreur: ' + error.message)
    else { toast.success(editing ? 'Médicament mis à jour' : 'Médicament créé'); setShowModal(false); fetchMeds() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Désactiver ce médicament ?')) return
    await supabase.from('medicaments').update({ actif: false }).eq('id', id)
    toast.success('Médicament désactivé'); fetchMeds()
  }

  const filtered = medicaments.filter(m => m.nom.toLowerCase().includes(search.toLowerCase()) || m.code?.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout title="Médicaments">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher médicament..."
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nouveau médicament
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400"><Pill size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun médicament</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nom</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Code</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Forme</th>
                    <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Dosage</th>
                    <th className="text-right px-4 py-3 font-medium">Marge (FCFA)</th>
                    <th className="text-right px-4 py-3 font-medium">Seuil alerte</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{m.nom}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{m.code || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{m.forme || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{m.dosage || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{m.marge.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{m.seuil_alerte}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(m)} className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg"><Edit2 size={14} /></button>
                          <button onClick={() => handleDelete(m.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-slate-200"><h3 className="text-lg font-semibold">{editing ? 'Modifier médicament' : 'Nouveau médicament'}</h3></div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nom *</label>
                  <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Paracétamol 500mg"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                {[
                  { l: 'Code', k: 'code', p: 'PARA500' }, { l: 'Forme', k: 'forme', p: 'Comprimé, sirop...' },
                  { l: 'Dosage', k: 'dosage', p: '500mg' }
                ].map(f => (
                  <div key={f.k}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{f.l}</label>
                    <input value={(form as any)[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.p}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Marge (FCFA) *</label>
                  <input type="number" value={form.marge} onChange={e => setForm({ ...form, marge: +e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Seuil alerte *</label>
                  <input type="number" value={form.seuil_alerte} onChange={e => setForm({ ...form, seuil_alerte: +e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50">
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
