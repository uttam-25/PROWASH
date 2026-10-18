import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Spinner from './components/ui/Spinner'

// Layouts
import CustomerLayout from './components/layout/CustomerLayout'
import AdminLayout from './components/layout/AdminLayout'

// Public pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

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

function ProtectedRoute({ children, role }) {
  const { isLoading, isAuthenticated, user } = useAuth()

  if (isLoading) return <Spinner message="Loading..." />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role === 'customer' && user.role === 'owner') return <Navigate to="/admin" replace />
  if (role === 'owner' && user.role === 'customer') return <Navigate to="/dashboard" replace />

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
            <ProtectedRoute role="owner">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:id" element={<AdminBookingDetailPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
          <Route path="vehicles" element={<AdminVehiclesPage />} />
          <Route path="services" element={<AdminServicesPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="schedule" element={<AdminSchedulePage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
