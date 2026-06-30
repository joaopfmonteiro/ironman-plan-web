import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login'
import { RegisterPage } from './pages/Register'
import { SetupPage } from './pages/Setup'
import { ProfilePage } from './pages/Profile'
import { DashboardPage } from './pages/Dashboard'
import { PlansPage } from './pages/Plans'
import { PlanDetailPage } from './pages/PlanDetail'
import { RacesPage } from './pages/Races'
import { TemplatesPage } from './pages/Templates'
import { WeightPage } from './pages/Weight'

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Layout />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/setup" element={<SetupPage />} />

        {/* Protected — Layout provides the <Outlet /> */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/:id" element={<PlanDetailPage />} />
          <Route path="/races" element={<RacesPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/weight" element={<WeightPage />} />
        </Route>

        {/* Fallback */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
