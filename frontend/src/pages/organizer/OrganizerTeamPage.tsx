import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus,
  QrCode,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/services/api';
import { eventsService } from '@/services/events.service';
import { organizerService } from '@/services/organizer.service';
import type { EventItem, OrganizerTeamMember } from '@/types/api';
import { formatPersonName } from '@/utils/format';
import { AlertBanner } from '@/components/AlertBanner';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/common/Skeleton';
import { OrganizerWorkspaceLayout } from '@/components/dashboard/OrganizerWorkspaceLayout';

export function OrganizerTeamPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [team, setTeam] = useState<OrganizerTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [assignAllEvents, setAssignAllEvents] = useState(true);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [evPage, teamData] = await Promise.all([
        eventsService.list({ mine: true, page: 1, limit: 100 }),
        organizerService.getTeamMembers(),
      ]);
      setEvents(evPage.items);
      setTeam(teamData);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load organization team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleEventSelection(eventId: string) {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId],
    );
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    if (!assignAllEvents && selectedEventIds.length === 0) {
      setError('Select at least one created event or choose All Created Events.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await organizerService.assignTeamMember({
        email: email.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        password: password.trim() || undefined,
        eventIds: assignAllEvents ? undefined : selectedEventIds,
      });
      showToast(`Authorized ${email.trim()} for event gate check-in.`, {
        variant: 'success',
      });
      setEmail('');
      setFirstName('');
      setLastName('');
      setPassword('');
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to assign staff member.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(userId: string, eventId?: string) {
    try {
      await organizerService.removeTeamMember(userId, eventId);
      showToast(
        eventId ? 'Removed event gate access.' : 'Removed staff member from organization events.',
        { variant: 'info' },
      );
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to revoke staff access.');
    }
  }

  return (
    <OrganizerWorkspaceLayout
      pageTitle="Team & Role Access"
      headerActions={
        <div className="flex items-center gap-2">
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="btn btn-secondary btn-sm">
              <ShieldCheck size={14} />
              <span>Admin Role Directory</span>
            </Link>
          )}
          <Link to="/organizer/scanner" className="btn btn-primary btn-sm">
            <QrCode size={14} />
            <span>Open Gate Scanner</span>
          </Link>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {error && <AlertBanner variant="error" message={error} />}

        {/* What Each Organization Role Can Do */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#E3EBE5] rounded-2xl p-5 shadow-[0_2px_10px_rgba(5,46,37,0.04)]">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-8 rounded-lg bg-[#E7F5EE] text-[#087F5B] flex items-center justify-center">
                <ShieldCheck size={17} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#052E25]">
                  Organization Owner (ORGANIZER)
                </h2>
                <p className="text-[11px] text-[#64766D]">Full event &amp; revenue control</p>
              </div>
            </div>
            <p className="text-xs text-[#53665E] leading-relaxed">
              Creates events, sets ticket tier capacity &amp; prices, views buyer contact lists, inspects check-in logs, scans tickets for their own events, and assigns Gate Staff below.
            </p>
          </div>

          <div className="bg-white border border-[#E3EBE5] rounded-2xl p-5 shadow-[0_2px_10px_rgba(5,46,37,0.04)]">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="w-8 h-8 rounded-lg bg-[#E7F5EE] text-[#087F5B] flex items-center justify-center">
                <QrCode size={17} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#052E25]">
                  Assigned Gate Staff (SCANNER)
                </h2>
                <p className="text-[11px] text-[#64766D]">Scoped strictly to assigned events</p>
              </div>
            </div>
            <p className="text-xs text-[#53665E] leading-relaxed">
              Can open the Gate Check-In Terminal only for events you grant below, verify ETK1 QR passes or manual codes, and block duplicate entries—with zero access to finances or settings.
            </p>
          </div>
        </div>

        {loading ? (
          <Skeleton height={240} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={<CalendarPlus size={26} />}
            title="Create an Event Before Adding Gate Staff"
            description="Staff permissions are scoped directly to events created by your organization. Launch your first event to assign check-in staff."
            action={
              <Link to="/organizer/events/new" className="btn btn-primary">
                <CalendarPlus size={16} />
                <span>Create Your First Event</span>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* Add / Assign Staff Form */}
            <form
              onSubmit={handleAddMember}
              className="xl:col-span-5 bg-white border border-[#E3EBE5] rounded-2xl p-6 shadow-[0_2px_10px_rgba(5,46,37,0.04)] flex flex-col gap-4"
            >
              <div className="flex items-center gap-2.5 pb-3 border-b border-[#E3EBE5]">
                <span className="w-8 h-8 rounded-lg bg-[#E7F5EE] text-[#087F5B] flex items-center justify-center">
                  <UserPlus size={16} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#052E25]">
                    Add Gate Staff &amp; Assign Events
                  </h2>
                  <p className="text-[11px] text-[#64766D]">
                    Assign an existing SCANNER or create a new staff login.
                  </p>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="staff-email" className="input-label">
                  Staff Email *
                </label>
                <input
                  id="staff-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="door-staff@yourcompany.com"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="input-group">
                  <label htmlFor="staff-first" className="input-label">
                    First Name
                  </label>
                  <input
                    id="staff-first"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Dara"
                    className="input"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="staff-last" className="input-label">
                    Last Name
                  </label>
                  <input
                    id="staff-last"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Sok"
                    className="input"
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="staff-password" className="input-label">
                  Initial Password (for new account)
                </label>
                <input
                  id="staff-password"
                  type="password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Leave blank if email already exists (min 8 chars)"
                  className="input"
                />
              </div>

              <div className="border-t border-[#E3EBE5] pt-3">
                <div className="text-xs font-bold text-[#052E25] mb-2">
                  Allowed Created Events *
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#102A21] mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignAllEvents}
                    onChange={(e) => setAssignAllEvents(e.target.checked)}
                  />
                  <span>All My Created Events ({events.length})</span>
                </label>

                {!assignAllEvents && (
                  <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 border border-[#E3EBE5] rounded-xl p-2.5 bg-[#FAFCFA]">
                    {events.map((ev) => (
                      <label
                        key={ev.id}
                        className="flex items-center gap-2 text-xs text-[#102A21] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEventIds.includes(ev.id)}
                          onChange={() => toggleEventSelection(ev.id)}
                        />
                        <span className="truncate">{ev.title}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="btn btn-primary"
              >
                <UserPlus size={15} />
                <span>{submitting ? 'Assigning...' : 'Add Staff & Grant Gate Scope'}</span>
              </button>
            </form>

            {/* Authorized Staff Directory */}
            <div className="xl:col-span-7 bg-white border border-[#E3EBE5] rounded-2xl shadow-[0_2px_10px_rgba(5,46,37,0.04)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#E3EBE5] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-[#087F5B]" />
                  <h2 className="text-sm font-bold text-[#052E25]">
                    Authorized Organization Gate Staff
                  </h2>
                </div>
                <span className="text-xs font-semibold text-[#64766D] tabular-nums">
                  {team.length} staff member(s)
                </span>
              </div>

              {team.length === 0 ? (
                <div className="p-10 text-center text-sm text-[#64766D]">
                  No external gate scanners added yet. Organizations can scan their own created events directly in Gate Scanner, or add staff on the left.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#F6F8F5] border-b border-[#E3EBE5]">
                        <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                          Staff Member
                        </th>
                        <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                          Role &amp; Duty
                        </th>
                        <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                          Authorized Events
                        </th>
                        <th className="py-3 px-4 text-left text-[11px] font-bold uppercase tracking-wider text-[#53665E]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((member) => (
                        <tr
                          key={member.user.id}
                          className="border-b border-[#E3EBE5] last:border-b-0 hover:bg-[#FAFCFA]"
                        >
                          <td className="py-3.5 px-4 text-xs">
                            <div className="font-bold text-[#052E25]">
                              {formatPersonName(member.user)}
                            </div>
                            <div className="text-[#64766D]">{member.user.email}</div>
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            <StatusBadge status={member.user.role} />
                            <div className="text-[11px] text-[#64766D] mt-1">
                              Gate Check-In Only
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5">
                              {member.events.map((ev) => (
                                <span
                                  key={ev.id}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E7F5EE] border border-[#D5EDE1] text-[11px] font-semibold text-[#064E3B]"
                                >
                                  <span className="max-w-[160px] truncate">{ev.title}</span>
                                  <button
                                    type="button"
                                    aria-label={`Remove ${member.user.email} from ${ev.title}`}
                                    onClick={() => handleRevoke(member.user.id, ev.id)}
                                    className="hover:text-[#DC2626]"
                                  >
                                    <X size={11} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleRevoke(member.user.id)}
                              className="btn btn-danger btn-sm"
                              title="Revoke access from all events"
                            >
                              <Trash2 size={13} />
                              <span>Revoke</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </OrganizerWorkspaceLayout>
  );
}
