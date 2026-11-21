import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { TicketLookupPage } from './pages/TicketLookupPage';
import { ScannerPage } from './pages/ScannerPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterCustomerPage } from './pages/auth/RegisterCustomerPage';
import { RegisterOrganizationPage } from './pages/auth/RegisterOrganizationPage';
import { CheckoutPage } from './pages/customer/CheckoutPage';
import { MyTicketsPage } from './pages/customer/MyTicketsPage';
import { MyAccountPage } from './pages/customer/MyAccountPage';
import { OrganizerDashboardPage } from './pages/organizer/OrganizerDashboardPage';
import { EventFormPage } from './pages/organizer/EventFormPage';
import { OrganizerAttendeesPage } from './pages/organizer/OrganizerAttendeesPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              {/* Public Discovery & Auth */}
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterCustomerPage />} />
              <Route
                path="/register/organization"
                element={<RegisterOrganizationPage />}
              />
              <Route path="/status" element={<SystemStatusPage />} />

              {/* Authenticated Customer Flows */}
              <Route
                path="/my-account"
                element={
                  <ProtectedRoute>
                    <MyAccountPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-tickets"
                element={
                  <ProtectedRoute>
                    <MyTicketsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout/:orderId"
                element={
                  <ProtectedRoute>
                    <CheckoutPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets"
                element={
                  <ProtectedRoute>
                    <TicketLookupPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tickets/:code"
                element={
                  <ProtectedRoute>
                    <TicketLookupPage />
                  </ProtectedRoute>
                }
              />

              {/* Gate Scanner */}
              <Route
                path="/scanner"
                element={
                  <ProtectedRoute allowedRoles={['SCANNER', 'ORGANIZER', 'ADMIN']}>
                    <ScannerPage />
                  </ProtectedRoute>
                }
              />

              {/* Organizer Studio */}
              <Route
                path="/organizer"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                    <OrganizerDashboardPage initialTab="overview" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                    <OrganizerDashboardPage initialTab="events" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/orders"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                    <OrganizerDashboardPage initialTab="orders" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/new"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                    <EventFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/events/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                    <EventFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/attendees"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                    <OrganizerAttendeesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organizer/check-ins"
                element={
                  <ProtectedRoute allowedRoles={['ORGANIZER', 'ADMIN']}>
                    <OrganizerAttendeesPage checkInsOnly />
                  </ProtectedRoute>
                }
              />

              {/* Admin Console */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
