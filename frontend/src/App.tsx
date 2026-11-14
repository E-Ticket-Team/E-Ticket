import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { TicketLookupPage } from './pages/TicketLookupPage';
import { ScannerPage } from './pages/ScannerPage';
import { OrganizerDashboardPage } from './pages/OrganizerDashboardPage';
import { EventFormPage } from './pages/EventFormPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/tickets" element={<TicketLookupPage />} />
          <Route path="/tickets/:code" element={<TicketLookupPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/organizer" element={<OrganizerDashboardPage />} />
          <Route path="/organizer/events/new" element={<EventFormPage />} />
          <Route path="/organizer/events/:id/edit" element={<EventFormPage />} />
          <Route path="/status" element={<SystemStatusPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
