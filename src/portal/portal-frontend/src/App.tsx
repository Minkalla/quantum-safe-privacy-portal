import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ConsentProvider } from './contexts/ConsentContext'
import { BrandingProvider } from './contexts/BrandingContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ConsentPage from './pages/ConsentPage'
import ProtectedRoute from './components/auth/ProtectedRoute'

function App() {
  return (
    <BrandingProvider>
      <AuthProvider>
        <ConsentProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="consent" 
                  element={
                    <ProtectedRoute>
                      <ConsentPage />
                    </ProtectedRoute>
                  } 
                />
              </Route>
            </Routes>
          </Router>
        </ConsentProvider>
      </AuthProvider>
    </BrandingProvider>
  )
}

export default App
