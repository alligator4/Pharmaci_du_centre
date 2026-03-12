import { useState } from 'react'
import { supabase, supabaseAuth } from '../lib/supabase'
import { KeyRound, RefreshCw, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  /** Si null → changement du mot de passe de l'utilisateur connecté */
  targetUserId?: string | null
  targetUserName?: string
  onClose: () => void
}

export default function ChangePasswordModal({ targetUserId, targetUserName, onClose }: Props) {
  const [form, setForm] = useState({ newPassword: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const isSelf = !targetUserId

  async function handleSave() {
    if (form.newPassword.length < 6) {
      toast.error('Minimum 6 caractères')
      return
    }
    if (form.newPassword !== form.confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setSaving(true)

    if (isSelf) {
      // L'utilisateur connecté change son propre mot de passe
      const { error } = await supabase.auth.updateUser({ password: form.newPassword })
      if (error) {
        toast.error('Erreur : ' + error.message)
      } else {
        toast.success('Mot de passe mis à jour avec succès !')
        onClose()
      }
    } else {
      // Un admin change le mot de passe d'un autre utilisateur
      // via l'API Admin (nécessite la service_role key côté serveur)
      // Avec Supabase anon key, on ne peut pas faire ça directement.
      // Solution : utiliser supabase.auth.admin.updateUserById() depuis une Edge Function,
      // OU copier le nouveau mot de passe et demander à l'utilisateur de le changer à sa prochaine connexion.
      //
      // Solution de contournement avec le client secondaire :
      // On génère un lien de reset par email via l'API Supabase.
      const { error } = await supabaseAuth.auth.resetPasswordForEmail(
        targetUserName ?? '', // ici on passe l'email
        { redirectTo: window.location.origin + '/reset-password' }
      )
      if (error) {
        toast.error('Erreur : ' + error.message)
      } else {
        toast.success(
          `Un email de réinitialisation a été envoyé à ${targetUserName}.`,
          { duration: 7000 }
        )
        onClose()
      }
    }

    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <KeyRound className="text-amber-600" size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800">
              {isSelf ? 'Changer mon mot de passe' : `Réinitialiser le mot de passe`}
            </h3>
            {!isSelf && (
              <p className="text-xs text-slate-500">{targetUserName}</p>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {isSelf ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nouveau mot de passe *
                </label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.newPassword}
                    onChange={e => setForm({ ...form, newPassword: e.target.value })}
                    placeholder="Min. 6 caractères"
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.confirm}
                  onChange={e => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Répéter le mot de passe"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {form.confirm && form.newPassword !== form.confirm && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>
            </>
          ) : (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
              <p className="font-medium mb-1">Comment ça fonctionne ?</p>
              <p className="text-xs leading-relaxed">
                Un email de réinitialisation sera envoyé à <strong>{targetUserName}</strong>.
                L'utilisateur pourra définir un nouveau mot de passe via le lien reçu.
              </p>
              <p className="text-xs text-blue-500 mt-2">
                ⚠️ Assurez-vous que l'email est correct et que l'utilisateur y a accès.
              </p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-xl disabled:opacity-60 flex items-center gap-2 font-medium"
          >
            {saving && <RefreshCw size={14} className="animate-spin" />}
            {isSelf ? 'Mettre à jour' : 'Envoyer le lien'}
          </button>
        </div>
      </div>
    </div>
  )
}
