import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Loader2, Cross, Activity, Shield } from 'lucide-react'

export default function Login() {
  const { signIn, profile } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      const destination = profile.role === 'client' ? '/catalogue' : '/dashboard'
      navigate(destination, { replace: true })
    }
  }, [profile, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await signIn(email, password)
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2a2a 50%, #0f172a 100%)' }}>
      {/* Panneau gauche décoratif */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Cercles décoratifs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0d9488, transparent)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0891b2, transparent)' }} />

        <div className="relative z-10 text-center max-w-sm">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-6 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
            <Cross className="text-white" size={36} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">PharmaGross Tchad</h1>
          <p className="text-teal-300 text-lg mb-8">Système de Gestion Pharmaceutique</p>

          <div className="space-y-3 text-left">
            {['Gestion des stocks & arrivages', 'Suivi FIFO des lots', 'Commandes en temps réel', 'Tableaux de bord & rapports'].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(13,148,136,0.3)', border: '1px solid rgba(13,148,136,0.5)' }}>
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                </div>
                <span className="text-slate-300 text-sm">{feat}</span>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-2 justify-center">
            <Activity size={14} className="text-teal-400" />
            <span className="text-xs text-teal-400 font-medium">Système opérationnel · 24/7</span>
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Séparateur vertical */}
      <div className="hidden lg:block w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgba(13,148,136,0.3), transparent)' }} />

      {/* Formulaire */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-xl"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
              <Cross className="text-white" size={26} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-white">PharmaGross Tchad</h1>
            <p className="text-teal-400 text-sm mt-1">Gestion Pharmaceutique</p>
          </div>

          <div className="rounded-3xl p-8 shadow-2xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}>

            <div className="flex items-center gap-3 mb-7">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(13,148,136,0.2)', border: '1px solid rgba(13,148,136,0.3)' }}>
                <Shield size={18} className="text-teal-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Connexion sécurisée</h2>
                <p className="text-xs text-slate-400">Accès réservé au personnel autorisé</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-3 rounded-xl text-sm flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                  onFocus={e => { e.target.style.border = '1px solid rgba(13,148,136,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)' }}
                  onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                  placeholder="votre@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition-all pr-11"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                    onFocus={e => { e.target.style.border = '1px solid rgba(13,148,136,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)' }}
                    onBlur={e => { e.target.style.border = '1px solid rgba(255,255,255,0.12)'; e.target.style.boxShadow = 'none' }}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
                style={{
                  background: loading ? 'rgba(13,148,136,0.5)' : 'linear-gradient(135deg, #0d9488, #0891b2)',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(13,148,136,0.4)',
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <p className="text-center text-xs text-slate-500">
                PharmaGross · Système Intranet · N'Djamena, Tchad
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
