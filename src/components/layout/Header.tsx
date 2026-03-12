import { Menu, Bell, LogOut, Cross, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import ChangePasswordModal from './ChangePasswordModal'

interface HeaderProps {
  onMenuClick: () => void
  title?: string
}

const roleBadge: Record<string, { label: string; style: React.CSSProperties }> = {
  superadmin: { label: 'Super Admin', style: { background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' } },
  admin: { label: 'Admin', style: { background: 'rgba(168,85,247,0.15)', color: '#d8b4fe', border: '1px solid rgba(168,85,247,0.3)' } },
  employe: { label: 'Employé', style: { background: 'rgba(13,148,136,0.15)', color: '#5eead4', border: '1px solid rgba(13,148,136,0.3)' } },
  client: { label: 'Client', style: { background: 'rgba(8,145,178,0.15)', color: '#7dd3fc', border: '1px solid rgba(8,145,178,0.3)' } },
}

export default function Header({ onMenuClick, title }: HeaderProps) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showChangePwd, setShowChangePwd] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const badge = roleBadge[profile?.role ?? 'employe']

  return (
  <>
    <header className="sticky top-0 z-10 px-4 h-14 flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,0.97)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 8px rgba(13,148,136,0.08)',
        backdropFilter: 'blur(8px)',
      }}>
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-teal-50 hover:text-teal-600 transition-colors"
        >
          <Menu size={20} />
        </button>
        {/* Logo compact affiché sur desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
            <Cross size={12} className="text-white" strokeWidth={3} />
          </div>
        </div>
        {title && (
          <h1 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <span className="hidden sm:inline text-slate-300">|</span>
            {title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-xl text-slate-500 hover:bg-teal-50 hover:text-teal-600 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-500" />
        </button>

        <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
            {profile?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-semibold text-slate-700 leading-tight">{profile?.name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-medium leading-tight" style={badge.style}>
              {badge.label}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowChangePwd(true)}
          className="p-2 rounded-xl text-slate-500 hover:bg-amber-50 hover:text-amber-500 transition-colors"
          title="Changer mon mot de passe"
        >
          <KeyRound size={18} />
        </button>

        <button
          onClick={handleSignOut}
          className="p-2 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          title="Déconnexion"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>

    {showChangePwd && (
      <ChangePasswordModal onClose={() => setShowChangePwd(false)} />
    )}
  </>
  )
}
