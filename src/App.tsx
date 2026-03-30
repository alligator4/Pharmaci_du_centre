import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/auth/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Medicaments from './pages/medicaments/Medicaments'
import Stock from './pages/stock/Stock'
import Arrivages from './pages/arrivages/Arrivages'
import Commandes from './pages/commandes/Commandes'
import Clients from './pages/clients/Clients'
import Paiements from './pages/paiements/Paiements'
import Rapports from './pages/rapports/Rapports'
import Alertes from './pages/alertes/Alertes'
import Utilisateurs from './pages/users/Utilisateurs'
import Catalogue from './pages/portal/Catalogue'
import MesCommandes from './pages/portal/MesCommandes'
import Promotions from './pages/promotions/Promotions'
import Livraisons from './pages/livraisons/Livraisons'
import RapportsClients from './pages/rapports/RapportsClients'
import ClickCollect from './pages/portal/ClickCollect'

function ProtectedRoute({ children, roles }: { children: React.ReactElement; roles?: string[] }) {
  const { profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!profile) return <Navigate to="/login" replace />

  if (roles && !roles.includes(profile.role)) {
    if (profile.role === 'client') return <Navigate to="/catalogue" replace />
    if (profile.role === 'livreur') return <Navigate to="/livraisons" replace />
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  const { profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Staff */}
      <Route path="/dashboard" element={
        <ProtectedRoute roles={['superadmin','admin','employe']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/medicaments" element={
        <ProtectedRoute roles={['superadmin','admin']}>
          <Medicaments />
        </ProtectedRoute>
      } />
      <Route path="/stock" element={
        <ProtectedRoute roles={['superadmin','admin','employe']}>
          <Stock />
        </ProtectedRoute>
      } />
      <Route path="/arrivages" element={
        <ProtectedRoute roles={['superadmin','admin','employe']}>
          <Arrivages />
        </ProtectedRoute>
      } />
      <Route path="/commandes" element={
        <ProtectedRoute roles={['superadmin','admin','employe']}>
          <Commandes />
        </ProtectedRoute>
      } />
      <Route path="/livraisons" element={
        <ProtectedRoute roles={['superadmin','admin','employe','livreur']}>
          <Livraisons />
        </ProtectedRoute>
      } />
      <Route path="/clients" element={
        <ProtectedRoute roles={['superadmin','admin']}>
          <Clients />
        </ProtectedRoute>
      } />
      <Route path="/paiements" element={
        <ProtectedRoute roles={['superadmin','admin','employe']}>
          <Paiements />
        </ProtectedRoute>
      } />
      <Route path="/promotions" element={
        <ProtectedRoute roles={['superadmin','admin']}>
          <Promotions />
        </ProtectedRoute>
      } />
      <Route path="/rapports" element={
        <ProtectedRoute roles={['superadmin','admin']}>
          <Rapports />
        </ProtectedRoute>
      } />
      <Route path="/rapports-clients" element={
        <ProtectedRoute roles={['superadmin','admin']}>
          <RapportsClients />
        </ProtectedRoute>
      } />
      <Route path="/alertes" element={
        <ProtectedRoute roles={['superadmin','admin','employe']}>
          <Alertes />
        </ProtectedRoute>
      } />
      <Route path="/utilisateurs" element={
        <ProtectedRoute roles={['superadmin']}>
          <Utilisateurs />
        </ProtectedRoute>
      } />

      {/* Portail client */}
      <Route path="/catalogue" element={
        <ProtectedRoute roles={['client']}>
          <Catalogue />
        </ProtectedRoute>
      } />
      <Route path="/click-collect" element={
        <ProtectedRoute roles={['client']}>
          <ClickCollect />
        </ProtectedRoute>
      } />
      <Route path="/mes-commandes" element={
        <ProtectedRoute roles={['client']}>
          <MesCommandes />
        </ProtectedRoute>
      } />

      {/* Redirections par défaut selon rôle */}
      <Route path="/" element={
        profile?.role === 'client'
          ? <Navigate to="/catalogue" replace />
          : profile?.role === 'livreur'
            ? <Navigate to="/livraisons" replace />
            : <Navigate to="/dashboard" replace />
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { borderRadius: '12px', fontSize: '14px', maxWidth: '400px' },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  )
}
