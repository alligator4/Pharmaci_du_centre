import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { Client } from '../../types'
import { Users, Plus, Search, Edit2, Trash2, Phone, MapPin } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY = { nom: '', telephone: '', adresse: '', email: '' }

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').eq('actif', true).order('nom')
    setClients(data ?? [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm({ ...EMPTY }); setShowModal(true) }
  function openEdit(c: Client) {
    setEditing(c)
    setForm({ nom: c.nom, telephone: c.telephone ?? '', adresse: c.adresse ?? '', email: c.email ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.nom.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)
    const op = editing
      ? supabase.from('clients').update(form).eq('id', editing.id)
      : supabase.from('clients').insert({ ...form, actif: true })
    const { error } = await op
    if (error) toast.error(error.message)
    else { toast.success(editing ? 'Client mis à jour' : 'Client créé'); setShowModal(false); fetchClients() }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Désactiver ce client ?')) return
    await supabase.from('clients').update({ actif: false }).eq('id', id)
    toast.success('Client désactivé'); fetchClients()
  }

  const filtered = clients.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()) || c.telephone?.includes(search))

  return (
    <Layout title="Clients">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher client..."
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nouveau client
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-12 text-slate-400"><Users size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun client</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(client => (
                <div key={client.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                      {client.nom.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm">{client.nom}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {client.telephone && <span className="flex items-center gap-1"><Phone size={10} />{client.telephone}</span>}
                        {client.adresse && <span className="hidden sm:flex items-center gap-1"><MapPin size={10} />{client.adresse}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(client)} className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => handleDelete(client.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-200"><h3 className="text-lg font-semibold">{editing ? 'Modifier client' : 'Nouveau client'}</h3></div>
            <div className="p-6 space-y-4">
              {[
                { label: 'Nom *', key: 'nom', placeholder: 'Nom complet' },
                { label: 'Téléphone', key: 'telephone', placeholder: '+235 XX XX XX XX' },
                { label: 'Email', key: 'email', placeholder: 'email@exemple.com' },
                { label: 'Adresse', key: 'adresse', placeholder: "N'Djamena, Tchad" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.placeholder}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
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
