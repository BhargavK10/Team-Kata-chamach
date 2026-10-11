import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { GlobalCursorGlow } from './components/effects/CursorEffects.jsx'

const LandingPage = lazy(() => import('./pages/LandingPage.jsx'))
const AuthPage = lazy(() => import('./pages/AuthPage.jsx'))
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'))
const CompanyPage = lazy(() => import('./pages/CompanyPage.jsx'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))

export default function App() {
  return (
    <>
      <GlobalCursorGlow />
      <Suspense fallback={<div className="route-loading">Loading COR.P ANALYSIS…</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/company/:companyId" element={<CompanyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  )
}
