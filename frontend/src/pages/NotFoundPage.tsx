import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass size={26} />}
      title="Page not found"
      description="The URL you requested does not match an active route in Universal E-Ticket."
      action={
        <Link to="/events" className="btn btn-primary">
          Browse Events
        </Link>
      }
    />
  );
}
