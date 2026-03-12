import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, Package, TruckIcon, ShoppingCart, Users, CreditCard,
  BarChart3, Settings, Pill, AlertTriangle, X, ShoppingBag, Activity, Cross
} from 'lucide-react'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, roles: ['superadmin','admin','employe'] },
  { path: '/medicaments', label: 'Médicaments', icon: Pill, roles: ['superadmin','admin'] },
  { path: '/stock', label: 'Stock & Lots', icon: Package, roles: ['superadmin','admin','employe'] },
  { path: '/arrivages', label: 'Arrivages', icon: TruckIcon, roles: ['superadmin','admin','employe'] },
  { path: '/commandes', label: 'Commandes', icon: ShoppingCart, roles: ['superadmin','admin','employe'] },
  { path: '/clients', label: 'Clients', icon: Users, roles: ['superadmin','admin'] },
  { path: '/paiements', label: 'Paiements', icon: CreditCard, roles: ['superadmin','admin','employe'] },
  { path: '/rapports', label: 'Rapports', icon: BarChart3, roles: ['superadmin','admin'] },
  { path: '/alertes', label: 'Alertes', icon: AlertTriangle, roles: ['superadmin','admin','employe'] },
  { path: '/utilisateurs', label: 'Utilisateurs', icon: Settings, roles: ['superadmin'] },
]

const clientNavItems = [
  { path: '/catalogue', label: 'Catalogue', icon: ShoppingBag, roles: ['client'] },
  { path: '/mes-commandes', label: 'Mes Commandes', icon: ShoppingCart, roles: ['client'] },
]

const roleLabel: Record<string, string> = {
  superadmin: 'Super Admin', admin: 'Administrateur',
  employe: 'Employé', client: 'Client'
}
const roleBg: Record<string, string> = {
  superadmin: 'bg-red-500/20 text-red-300 border border-red-500/30',
  admin: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  employe: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  client: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { profile } = useAuth()
  const location = useLocation()

  const isClient = profile?.role === 'client'
  const items = isClient
    ? clientNavItems
    : navItems.filter(i => profile && i.roles.includes(profile.role))

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 flex flex-col
        transform transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
        style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0c1a2e 60%, #071a1a 100%)' }}
      >
        {/* Logo médical */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
              <Cross className="text-white" size={18} strokeWidth={3} />
            </div>
            <div>
              <p className="font-bold text-white text-sm tracking-wide">PharmaGross</p>
              <p className="text-xs text-teal-400 font-medium">Tchad · Intranet</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg">
            <X size={18} />
          </button>
        </div>

        {/* Indicateur santé */}
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center gap-2">
          <Activity size={14} className="text-teal-400" />
          <span className="text-xs text-teal-300 font-medium">Système opérationnel</span>
          <div className="ml-auto w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 mt-2">
          {items.map(item => {
            const Icon = item.icon
            const active = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                  transition-all duration-150 group
                  ${active
                    ? 'text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }
                `}
                style={active ? {
                  background: 'linear-gradient(135deg, rgba(13,148,136,0.8), rgba(8,145,178,0.8))',
                } : {}}
              >
                <Icon size={17} className={active ? 'text-white' : 'text-slate-500 group-hover:text-teal-400'} />
                {item.label}
                {item.path === '/alertes' && (
                  <div className="ml-auto w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* Profil utilisateur */}
        <div className="p-3 border-t border-white/10">
          <div className="px-3 py-2.5 rounded-xl bg-white/5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)' }}>
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${roleBg[profile?.role ?? 'employe']}`}>
                  {roleLabel[profile?.role ?? 'employe']}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
