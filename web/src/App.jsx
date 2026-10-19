import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Spinner from './components/ui/Spinner'

// Layouts
import CustomerLayout from './components/layout/CustomerLayout'
import AdminLayout from './components/layout/AdminLayout'
import PartnerLayout from './components/layout/PartnerLayout'

// Public pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PartnerLoginPage from './pages/PartnerLoginPage'
import PartnerRegisterPage from './pages/PartnerRegisterPage'

// Customer pages (lazy)
const DashboardPage = lazy(() => import('./pages/customer/DashboardPage'))
const ServicesPage = lazy(() => import('./pages/customer/ServicesPage'))
const ServiceDetailPage = lazy(() => import('./pages/customer/ServiceDetailPage'))
const MyVehiclesPage = lazy(() => import('./pages/customer/MyVehiclesPage'))
const BookingWizard = lazy(() => import('./pages/customer/BookingWizard'))
const MyBookingsPage = lazy(() => import('./pages/customer/MyBookingsPage'))
const BookingDetailPage = lazy(() => import('./pages/customer/BookingDetailPage'))
const NotificationsPage = lazy(() => import('./pages/customer/NotificationsPage'))
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage'))

// Admin pages (lazy)
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage'))
const AdminBookingDetailPage = lazy(() => import('./pages/admin/AdminBookingDetailPage'))
const AdminCustomersPage = lazy(() => import('./pages/admin/AdminCustomersPage'))
const AdminCustomerDetailPage = lazy(() => import('./pages/admin/AdminCustomerDetailPage'))
const AdminVehiclesPage = lazy(() => import('./pages/admin/AdminVehiclesPage'))
const AdminServicesPage = lazy(() => import('./pages/admin/AdminServicesPage'))
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'))
const AdminSchedulePage = lazy(() => import('./pages/admin/AdminSchedulePage'))
const AdminReportsPage = lazy(() => import('./pages/admin/AdminReportsPage'))
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'))
const AdminPartnersPage = lazy(() => import('./pages/admin/AdminPartnersPage'))
const AdminPartnerDetailPage = lazy(() => import('./pages/admin/AdminPartnerDetailPage'))

// Partner pages (lazy)
const PartnerDashboardPage = lazy(() => import('./pages/partner/PartnerDashboardPage'))
const PartnerJobsPage = lazy(() => import('./pages/partner/PartnerJobsPage'))
const PartnerJobPage = lazy(() => import('./pages/partner/PartnerJobPage'))
const PartnerProfilePage = lazy(() => import('./pages/partner/PartnerProfilePage'))

function ProtectedRoute({ children, role }) {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) return <Spinner message="Loading..." />
  if (!isAuthenticated) {
    // Send partners to partner-login, others to login
    if (role === 'partner') return <Navigate to="/partner-login" replace />
    return <Navigate to="/login" replace />
  }

  if (role === 'customer' && user.role !== 'customer') {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'partner') return <Navigate to="/partner" replace />
  }
  if (role === 'admin' && user.role !== 'admin') {
    return <Navigate to="/login" replace />
  }
  if (role === 'partner' && user.role !== 'partner') {
    return <Navigate to="/partner-login" replace />
  }

  return children
}

export default function App() {
  return (
    <Suspense fallback={<Spinner message="Loading..." />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/partner-login" element={<PartnerLoginPage />} />
        <Route path="/partner-register" element={<PartnerRegisterPage />} />

        {/* Customer routes */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute role="customer">
              <CustomerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="services/:id" element={<ServiceDetailPage />} />
          <Route path="vehicles" element={<MyVehiclesPage />} />
          <Route path="book" element={<BookingWizard />} />
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="bookings/:id" element={<BookingDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:id" element={<AdminBookingDetailPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
          <Route path="partners" element={<AdminPartnersPage />} />
          <Route path="partners/:id" element={<AdminPartnerDetailPage />} />
          <Route path="vehicles" element={<AdminVehiclesPage />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Partner routes */}
        <Route
          path="/partner/*"
          element={
            <ProtectedRoute role="partner">
              <PartnerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PartnerDashboardPage />} />
          <Route path="jobs" element={<PartnerJobsPage />} />
          <Route path="jobs/:id" element={<PartnerJobPage />} />
          <Route path="profile" element={<PartnerProfilePage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
