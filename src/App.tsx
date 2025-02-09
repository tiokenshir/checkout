import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { theme } from './theme'
import { CheckoutPage } from './pages/CheckoutPage'
import { ProductPage } from './pages/ProductPage'
import { SuccessPage } from './pages/SuccessPage'
import { ExpiredPage } from './pages/ExpiredPage'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminProducts } from './pages/admin/Products'
import { AdminOrders } from './pages/admin/Orders'
import { Settings } from './pages/admin/Settings'
import { Reports } from './pages/admin/Reports'
import { Backup } from './pages/admin/Backup'
import { AuditLogs } from './pages/admin/AuditLogs'
import { ScheduledReports } from './pages/admin/ScheduledReports'
import { Analytics } from './pages/admin/Analytics'
import { Forecasts } from './pages/admin/Forecasts'
import { Storage } from './pages/admin/Storage'
import { Integrations } from './pages/admin/Integrations'
import { Workflows } from './pages/admin/Workflows'
import { Rules } from './pages/admin/Rules'
import { Coupons } from './pages/admin/Coupons'
import { Profile } from './pages/admin/Profile'
import { AdminLayout } from './components/layouts/AdminLayout'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LoginPage } from './pages/LoginPage'
import { ProtectedRoute } from './components/ProtectedRoute'

function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <ThemeProvider>
          <AuthProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/p/:productId" element={<ProductPage />} />
                <Route path="/checkout/:productId" element={<CheckoutPage />} />
                <Route path="/success/:orderId" element={<SuccessPage />} />
                <Route path="/expired" element={<ExpiredPage />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="scheduled-reports" element={<ScheduledReports />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="backup" element={<Backup />} />
                  <Route path="audit" element={<AuditLogs />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="forecasts" element={<Forecasts />} />
                  <Route path="storage" element={<Storage />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="workflows" element={<Workflows />} />
                  <Route path="rules" element={<Rules />} />
                  <Route path="coupons" element={<Coupons />} />
                </Route>
              </Routes>
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </ChakraProvider>
    </>
  )
}

export default App