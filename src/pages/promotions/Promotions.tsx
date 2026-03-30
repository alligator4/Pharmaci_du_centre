import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { Promotion, Medicament } from '../../types'
import { Tag, Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const EMPTY = {
  nom: '', description: '', type: 'remise_pct' as const,
  valeur: '', code_promo: '', medicament_id: '',
  date_debut: '', date_fin: '', actif: true, min_quantite: '1',
}

const TYPE_LABELS: Record<string, string> = {
  remise_pct: '% Remise',
  remise_fixe: 'Montant fixe',
  offre_moment: "Offre du moment",
  campagne: 'Campagne',
}
const TYPE_COLORS: Record<string, string> = {
  remise_pct: 'bg-teal-100 text-teal-700',
  remise_fixe: 'bg-blue-100 text-blue-700',
  offre_moment: 'bg-amber-100 text-amber-700',
  campagne: 'bg-purple-100 text-purple-700',
}

export default function Promotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: promos }, { data: meds }] = await Promise.all([
      supabase.from('promotions').select('*').order('created_at', { ascending: false }),
      supabase.from('medicaments').select('id, nom, code').eq('actif', true).order('nom'),
    ])
    setPromotions(promos ?? [])
    setMedicaments(meds ?? [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY })
    setShowModal(true)
  }

  function openEdit(p: Promotion) {
    setEditing(p)
    setForm({
      nom: p.nom, description: p.description ?? '', type: p.type,
      valeur: String(p.valeur), code_promo: p.code_promo ?? '',
      medicament_id: p.medicament_id ?? '',
      date_debut: p.date_debut.slice(0, 16),
      date_fin: p.date_fin.slice(0, 16),
      actif: p.actif, min_quantite: String(p.min_quantite),
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nom.trim()) { toast.error('Le nom est requis'); return }
    if (!form.valeur || isNaN(Number(form.valeur)) || Number(form.valeur) <= 0) {
      toast.error('La valeur doit être un nombre positif'); return
    }
    if (!form.date_debut || !form.date_fin) { toast.error('Les dates sont requises'); return }
    if (new Date(form.date_fin) <= new Date(form.date_debut)) {
      toast.error('La date de fin doit être après la date de début'); return
    }
    if (form.type === 'remise_pct' && Number(form.valeur) > 100) {
      toast.error('Une remise en % ne peut pas dépasser 100'); return
    }

    setSaving(true)
    const payload = {
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      type: form.type,
      valeur: Number(form.valeur),
      code_promo: form.code_promo.trim() || null,
      medicament_id: form.medicament_id || null,
      date_debut: new Date(form.date_debut).toISOString(),
      date_fin: new Date(form.date_fin).toISOString(),
      actif: form.actif,
      min_quantite: Number(form.min_quantite) || 1,
    }

    const op = editing
      ? supabase.from('promotions').update(payload).eq('id', editing.id)
      : supabase.from('promotions').insert(payload)

    const { error } = await op
    if (error) toast.error(error.message)
    else {
      toast.success(editing ? 'Promotion mise à jour' : 'Promotion créée')
      setShowModal(false)
      fetchAll()
    }
    setSaving(false)
  }

  async function toggleActif(p: Promotion) {
    const { error } = await supabase.from('promotions').update({ actif: !p.actif }).eq('id', p.id)
    if (error) toast.error(error.message)
    else {
      toast.success(p.actif ? 'Promotion désactivée' : 'Promotion activée')
      fetchAll()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cette promotion ?')) return
    const { error } = await supabase.from('promotions').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Promotion supprimée'); fetchAll() }
  }

  const now = new Date()
  const filtered = promotions.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.code_promo?.toLowerCase().includes(search.toLowerCase())
  )

  function getStatus(p: Promotion) {
    const debut = new Date(p.date_debut)
    const fin = new Date(p.date_fin)
    if (!p.actif) return { label: 'Inactif', cls: 'bg-slate-100 text-slate-500' }
    if (now < debut) return { label: 'Planifiée', cls: 'bg-blue-100 text-blue-600' }
    if (now > fin) return { label: 'Expirée', cls: 'bg-red-100 text-red-600' }
    return { label: 'En cours', cls: 'bg-green-100 text-green-700' }
  }

  return (
    <Layout title="Promotions">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher promotion..." className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
            <Plus size={16} /> Nouvelle promotion
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucune promotion</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {['Promotion', 'Type', 'Valeur', 'Médicament', 'Période', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(p => {
                    const status = getStatus(p)
                    const med = medicaments.find(m => m.id === p.medicament_id)
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{p.nom}</p>
                          {p.code_promo && <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {p.code_promo}</p>}
                          {p.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{p.description}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[p.type]}`}>
                            {TYPE_LABELS[p.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          {p.type === 'remise_pct' ? `${p.valeur}%` : `${p.valeur.toLocaleString('fr-FR')} FCFA`}
                          {p.min_quantite > 1 && <p className="text-xs text-slate-400">Min: {p.min_quantite} unités</p>}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">
                          {med ? <span className="bg-slate-100 px-2 py-0.5 rounded">{med.nom}</span> : <span className="text-slate-400">Tous produits</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Calendar size={12} />
                            <span>{format(new Date(p.date_debut), 'dd/MM/yy', { locale: fr })}</span>
                            <span>→</span>
                            <span>{format(new Date(p.date_fin), 'dd/MM/yy', { locale: fr })}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleActif(p)} title={p.actif ? 'Désactiver' : 'Activer'}
                              className="p-1.5 rounded hover:bg-slate-100 transition-colors">
                              {p.actif
                                ? <ToggleRight size={18} className="text-teal-600" />
                                : <ToggleLeft size={18} className="text-slate-400" />}
                            </button>
                            <button onClick={() => openEdit(p)}
                              className="p-1.5 rounded hover:bg-blue-50 text-blue-600 transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(p.id)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">{editing ? 'Modifier la promotion' : 'Nouvelle promotion'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Ex: Promo été 2025" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Valeur * {form.type === 'remise_pct' ? '(%)' : '(FCFA)'}
                  </label>
                  <input type="number" min="0" value={form.valeur} onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Qté min. déclenchement</label>
                  <input type="number" min="1" value={form.min_quantite} onChange={e => setForm(f => ({ ...f, min_quantite: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Code promo (optionnel)</label>
                  <input value={form.code_promo} onChange={e => setForm(f => ({ ...f, code_promo: e.target.value.toUpperCase() }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="EX: PROMO10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Médicament ciblé (laisser vide = tous)</label>
                <select value={form.medicament_id} onChange={e => setForm(f => ({ ...f, medicament_id: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Tous les médicaments</option>
                  {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} {m.code ? `(${m.code})` : ''}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Début *</label>
                  <input type="datetime-local" value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fin *</label>
                  <input type="datetime-local" value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="actif" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))}
                  className="w-4 h-4 rounded text-teal-600" />
                <label htmlFor="actif" className="text-sm text-slate-700">Promotion active</label>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
