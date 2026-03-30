import { useEffect, useState } from 'react'
import { supabase, supabaseAuth } from '../../lib/supabase'
import Layout from '../../components/layout/Layout'
import type { Profile, UserRole } from '../../types'
import { Plus, Edit2, Trash2, RefreshCw, UserCheck, AlertCircle, KeyRound } from 'lucide-react'
import ChangePasswordModal from '../../components/ChangePasswordModal'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'superadmin', label: 'Super Admin', desc: 'Accès total + gestion utilisateurs' },
  { value: 'admin', label: 'Admin', desc: 'Gestion complète sauf utilisateurs' },
  { value: 'employe', label: 'Employé', desc: 'Stock, ventes, paiements' },
  { value: 'client', label: 'Client', desc: 'Catalogue + commandes uniquement' },
  { value: 'livreur', label: 'Livreur', desc: 'Livraisons + preuve de dépôt' },
]
const roleColors: Record<string, string> = {
  superadmin: 'bg-red-100 text-red-700',
  admin: 'bg-purple-100 text-purple-700',
  employe: 'bg-teal-100 text-teal-700',
  client: 'bg-blue-100 text-blue-700',
  livreur: 'bg-amber-100 text-amber-700',
}

export default function Utilisateurs() {
  const { profile: currentProfile } = useAuth()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'employe' as UserRole, password: '' })
  const [saving, setSaving] = useState(false)
  const [saveStep, setSaveStep] = useState('')
  const [resetPasswordFor, setResetPasswordFor] = useState<{ id: string; email: string } | null>(null)

  useEffect(() => { fetchProfiles() }, [])

  async function fetchProfiles() {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('actif', true).order('name')
    setProfiles(data ?? [])
    setLoading(false)
  }

  function openCreate() { setEditing(null); setForm({ name: '', email: '', role: 'employe', password: '' }); setShowModal(true) }
  function openEdit(p: Profile) {
    setEditing(p)
    setForm({ name: p.name, email: p.email, role: p.role, password: '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return }
    setSaving(true)

    if (editing) {
      const { error } = await supabase.from('profiles').update({ name: form.name, role: form.role }).eq('id', editing.id)
      if (error) toast.error(error.message)
      else { toast.success('Utilisateur mis à jour'); setShowModal(false); fetchProfiles() }
    } else {
      if (!form.email.trim()) { toast.error("L'email est requis"); setSaving(false); return }
      if (form.password.length < 6) { toast.error('Mot de passe minimum 6 caractères'); setSaving(false); return }

      setSaveStep('Création du compte…')
      const { data: signUpData, error: signUpError } = await supabaseAuth.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { name: form.name } }
      })

      if (signUpError) {
        if (signUpError.status === 429) {
          toast.error(
            'Limite Supabase atteinte (3 comptes/heure). Allez dans le Dashboard Supabase → Authentication → Users → "Add user" pour créer manuellement.',
            { duration: 10000 }
          )
        } else {
          toast.error('Erreur: ' + signUpError.message)
        }
        setSaving(false); setSaveStep(''); return
      }

      if (!signUpData.user) { toast.error('Compte non créé'); setSaving(false); setSaveStep(''); return }

      setSaveStep('Mise à jour du profil…')

      // Attendre que le trigger handle_new_user crée le profil (polling max 5s)
      let profileReady = false
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 500))
        const { data: p } = await supabase.from('profiles').select('id').eq('id', signUpData.user.id).single()
        if (p) { profileReady = true; break }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: form.name, role: form.role, actif: true })
        .eq('id', signUpData.user.id)

      if (updateError || !profileReady) {
        await supabase.from('profiles').insert({ id: signUpData.user.id, name: form.name, email: form.email, role: form.role, actif: true })
      }


      // Si le rôle est "client", créer automatiquement la fiche client liée
      if (form.role === 'client') {
        setSaveStep('Création de la fiche client…')
        await supabase.from('clients').insert({
          nom: form.name,
          email: form.email,
          user_id: signUpData.user.id,
          actif: true,
        })
      }
      await navigator.clipboard.writeText(`Email: ${form.email}\nMot de passe: ${form.password}`).catch(() => {})
      toast.success(`✓ Compte "${form.name}" créé ! Identifiants copiés dans le presse-papier.`, { duration: 6000 })
      setShowModal(false); setSaveStep(''); fetchProfiles()
    }
    setSaving(false); setSaveStep('')
  }

  async function handleDeactivate(id: string) {
    if (id === currentProfile?.id) { toast.error('Impossible de désactiver votre propre compte'); return }
    if (!confirm('Désactiver cet utilisateur ?')) return
    await supabase.from('profiles').update({ actif: false }).eq('id', id)
    toast.success('Utilisateur désactivé'); fetchProfiles()
  }

  return (
    <Layout title="Utilisateurs">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Gestion des utilisateurs</h2>
            <p className="text-sm text-slate-500">{profiles.length} utilisateur(s) actif(s)</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchProfiles} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"><RefreshCw size={16} /></button>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} /> Nouvel utilisateur
            </button>
          </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            <strong>Limite Supabase :</strong> 3 créations/heure sur le plan gratuit. Avec un abonnement Pro, cette limite est supprimée.
            En cas d'erreur 429, utilisez le <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-medium">Dashboard Supabase</a> pour créer manuellement.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLES.map(r => (
            <div key={r.value} className="bg-white rounded-xl border border-slate-200 p-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[r.value]}`}>{r.label}</span>
              <p className="text-xs text-slate-500 mt-1.5 leading-tight">{r.desc}</p>
              <p className="text-lg font-bold text-slate-700 mt-1">{profiles.filter(p => p.role === r.value).length}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center p-12"><div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : profiles.length === 0 ? (
            <div className="text-center p-12 text-slate-400"><UserCheck size={40} className="mx-auto mb-3 opacity-30" /><p>Aucun utilisateur</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {profiles.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        {p.name}{p.id === currentProfile?.id && <span className="ml-1 text-xs text-slate-400">(vous)</span>}
                      </p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[p.role] || 'bg-slate-100 text-slate-600'}`}>
                      {ROLES.find(r => r.value === p.role)?.label || p.role}
                    </span>
                    <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-teal-50 text-teal-600 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => setResetPasswordFor({ id: p.id, email: p.email })} className="p-1.5 hover:bg-amber-50 text-amber-500 rounded-lg" title="Réinitialiser le mot de passe"><KeyRound size={14} /></button>
                    {p.id !== currentProfile?.id && (
                      <button onClick={() => handleDeactivate(p.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center"><UserCheck className="text-teal-600" size={20} /></div>
              <h3 className="text-lg font-semibold text-slate-800">{editing ? 'Modifier utilisateur' : 'Créer un utilisateur'}</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nom complet *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Prénom Nom"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Mot de passe * (min. 6 caractères)</label>
                    <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Ex: Pharma@2024"
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono tracking-wide" />
                    <p className="text-xs text-slate-400 mt-1">Communiquez ce mot de passe à l'utilisateur</p>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Rôle *</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r.value} type="button" onClick={() => setForm({ ...form, role: r.value })}
                      className={`text-left p-3 rounded-xl border-2 transition-all ${form.role === r.value ? 'border-teal-500 bg-teal-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${roleColors[r.value]}`}>{r.label}</span>
                      <p className="text-xs text-slate-500 mt-1 leading-tight">{r.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} disabled={saving} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Annuler</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-xl disabled:opacity-60 flex items-center gap-2 font-medium">
                {saving && <RefreshCw size={14} className="animate-spin" />}
                {saving ? saveStep || 'Traitement…' : editing ? 'Enregistrer' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPasswordFor && (
        <ChangePasswordModal
          targetUserId={resetPasswordFor.id}
          targetUserName={resetPasswordFor.email}
          onClose={() => setResetPasswordFor(null)}
        />
      )}
    </Layout>
  )
}
