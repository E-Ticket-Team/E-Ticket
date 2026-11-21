import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarPlus,
  CheckCircle2,
  Layers,
  QrCode,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function OrganizationLandingPage() {
  const { user } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const heroParallaxRef = useRef<HTMLDivElement | null>(null);
  const passParallaxRef = useRef<HTMLDivElement | null>(null);
  const gridParallaxRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroParallaxRef,
    offset: ['start start', 'end start'],
  });

  const { scrollYProgress: passProgress } = useScroll({
    target: passParallaxRef,
    offset: ['start end', 'end start'],
  });

  const { scrollYProgress: gridProgress } = useScroll({
    target: gridParallaxRef,
    offset: ['start end', 'end start'],
  });

  const heroBackY = useTransform(heroProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, 56]);
  const heroMainY = useTransform(heroProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -34]);
  const heroFloatY = useTransform(heroProgress, [0, 1], prefersReducedMotion ? [0, 0] : [0, -78]);
  const passCardY = useTransform(passProgress, [0, 1], prefersReducedMotion ? [0, 0] : [36, -36]);
  const passLayerBgY = useTransform(passProgress, [0, 1], prefersReducedMotion ? [0, 0] : [-20, 24]);
  const bentoLeftY = useTransform(gridProgress, [0, 1], prefersReducedMotion ? [0, 0] : [18, -18]);
  const bentoRightY = useTransform(gridProgress, [0, 1], prefersReducedMotion ? [0, 0] : [34, -34]);

  const canOrganize = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
  const createEventHref = canOrganize ? '/organizer/events/new' : '/register/organization';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 72 }}>
      {/* Parallax Business Hero: Create Your First Event */}
      <section
        ref={heroParallaxRef}
        className="landing-hero relative overflow-hidden"
        style={{ paddingTop: 18, paddingBottom: 42 }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 w-[440px] h-[440px] rounded-full bg-[#E7F5EE] blur-3xl opacity-80"
        />

        <div className="landing-hero-grid" style={{ gap: 40 }}>
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className="eyebrow-label" style={{ marginBottom: 14 }}>
              <Building2 size={14} />
              <span>Universal E-Ticket Business Platform</span>
            </div>

            <h1 className="hero-title">
              Create Your First Event{' '}
              <span className="text-emerald">In Minutes.</span>
            </h1>

            <p className="landing-hero-desc" style={{ maxWidth: 540 }}>
              Built for venues, festivals, conferences, and independent promoters. Configure pricing tiers, sell tickets directly with zero login friction, and verify every QR pass at the door.
            </p>

            <div className="landing-hero-actions">
              <Link to={createEventHref} className="btn btn-primary btn-lg">
                <CalendarPlus size={18} />
                <span>Create Your First Event</span>
                <ArrowRight size={16} />
              </Link>

              <a href="#how-it-works" className="btn btn-secondary btn-lg">
                <span>See How It Works</span>
              </a>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 20,
                marginTop: 26,
                fontSize: '0.84rem',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} color="var(--color-primary)" />
                <span>Atomic 15-min inventory holds</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} color="var(--color-primary)" />
                <span>HMAC-signed QR check-ins</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} color="var(--color-primary)" />
                <span>Guest &amp; member checkout</span>
              </span>
            </div>
          </motion.div>

          {/* Multi-Layer Parallax Studio Showcase */}
          <div className="relative min-h-[370px] flex items-center justify-center py-4">
            {/* Background parallax frame */}
            <motion.div
              style={{ y: heroBackY }}
              aria-hidden="true"
              className="absolute inset-x-4 top-6 bottom-2 rounded-3xl bg-[#E7F5EE] border border-[#D5EDE1]"
            />

            {/* Primary Forest Studio Telemetry Card */}
            <motion.div
              style={{ y: heroMainY }}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative z-10 w-full max-w-[440px] rounded-2xl bg-[#052E25] text-white p-6 border border-[#145C48] shadow-[0_24px_60px_rgba(5,46,37,0.24)]"
            >
              <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/15">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#087F5B] text-white">
                    <BarChart3 size={17} />
                  </span>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-[#95E0C2] font-semibold">
                      Organizer Studio Live
                    </div>
                    <div className="text-sm font-bold text-white">
                      Tech Expo &amp; Music Festival
                    </div>
                  </div>
                </div>
                <span className="badge badge-success">PUBLISHED</span>
              </div>

              <div className="grid grid-cols-2 gap-3 my-4">
                <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3.5">
                  <div className="text-[11px] text-[#C2D9CF] font-medium">
                    Net Settled Revenue
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1 tabular-nums">
                    $24,890.00
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.06] border border-white/10 p-3.5">
                  <div className="text-[11px] text-[#C2D9CF] font-medium">
                    Verified Gate Scans
                  </div>
                  <div className="text-xl font-extrabold text-[#6EE7B7] mt-1 tabular-nums">
                    94.2%
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-3.5 py-2.5">
                  <span className="font-semibold text-white">VIP All-Access Pass</span>
                  <span className="tabular-nums text-[#95E0C2] font-semibold">
                    199 / 200 seats left · $99
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.06] px-3.5 py-2.5">
                  <span className="font-semibold text-white">General Admission</span>
                  <span className="tabular-nums text-[#C2D9CF]">
                    1,000 seats open · $25
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Foreground Floating Parallax Card */}
            <motion.div
              style={{ y: heroFloatY }}
              className="hidden sm:flex items-center gap-3 absolute -bottom-3 -left-2 z-20 rounded-2xl bg-white border border-[#C8D6CD] px-4 py-3 shadow-[0_16px_38px_rgba(6,78,59,0.14)]"
            >
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#E7F5EE] text-[#087F5B]">
                <ShieldCheck size={18} />
              </span>
              <div>
                <div className="text-xs font-bold text-[#052E25]">
                  Single-Entry QR Verified
                </div>
                <div className="text-[11px] text-[#64766D]">
                  Duplicate scans blocked at venue gates
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Hairline Metrics Strip */}
        <div className="metrics-strip">
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">15 min</div>
            <div className="metrics-strip-label">Exclusive checkout seat lock</div>
          </div>
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">100%</div>
            <div className="metrics-strip-label">Serializable oversell protection</div>
          </div>
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">ETK1</div>
            <div className="metrics-strip-label">Cryptographic QR gate passes</div>
          </div>
          <div className="metrics-strip-item">
            <div className="metrics-strip-value tabular-nums">0-Login</div>
            <div className="metrics-strip-label">Instant guest ticket checkout</div>
          </div>
        </div>
      </section>

      {/* Moved & Upgraded How It Works Section with Scroll Parallax */}
      <section id="how-it-works" ref={passParallaxRef} className="feature-split">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5 }}
        >
          <div className="eyebrow-label" style={{ marginBottom: 10 }}>
            <span>How It Works</span>
          </div>
          <h2 className="section-title" style={{ marginBottom: 12 }}>
            Built for real venues, not spreadsheets.
          </h2>
          <p className="page-subtitle" style={{ marginBottom: 24 }}>
            Every reservation locks inventory cleanly, issues verified passes upon payment settlement, and validates entry once at the door.
          </p>

          <div className="editorial-list">
            <div className="editorial-list-item">
              <div className="editorial-index">01</div>
              <div>
                <h3 className="card-title">Atomic Seat Reservation</h3>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-text-secondary)',
                    marginTop: 4,
                  }}
                >
                  Selected tiers are held exclusively for 15 minutes during checkout so popular shows never oversell.
                </p>
              </div>
            </div>

            <div className="editorial-list-item">
              <div className="editorial-index">02</div>
              <div>
                <h3 className="card-title">Instant Boarding-Pass Wallet</h3>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-text-secondary)',
                    marginTop: 4,
                  }}
                >
                  Confirmed orders issue unique QR credentials immediately at checkout and inside My Tickets, ready for offline download or print.
                </p>
              </div>
            </div>

            <div className="editorial-list-item">
              <div className="editorial-index">03</div>
              <div>
                <h3 className="card-title">Single-Entry Gate Check-In</h3>
                <p
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-text-secondary)',
                    marginTop: 4,
                  }}
                >
                  Authorized venue staff scan passes via camera or USB reader with immediate duplicate-scan blocking.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Parallax Tactile Digital Pass Card */}
        <div className="relative py-4">
          <motion.div
            style={{ y: passLayerBgY }}
            aria-hidden="true"
            className="absolute inset-0 rounded-3xl bg-[#F1F6F1] border border-[#E3EBE5]"
          />

          <motion.div
            style={{ y: passCardY }}
            className="relative z-10 m-4 sm:m-6"
          >
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-elevated)',
              }}
            >
              <div
                style={{
                  padding: '24px 26px',
                  borderBottom: '2px dashed var(--color-border-strong)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <span className="badge badge-info">VIP ALL-ACCESS</span>
                  <span className="badge badge-success">VALID</span>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                  Cambodia Tech Expo &amp; Music Festival 2026
                </h3>
                <p
                  style={{
                    fontSize: '0.86rem',
                    color: 'var(--color-text-secondary)',
                    marginTop: 6,
                  }}
                >
                  Diamond Island Exhibition Center
                </p>
              </div>

              <div
                style={{
                  padding: '20px 26px',
                  backgroundColor: 'var(--color-ivory)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16,
                }}
              >
                <div>
                  <div className="meta-caption">Pass Code</div>
                  <div className="code-chip" style={{ marginTop: 4 }}>
                    ETK1 · VERIFIED
                  </div>
                </div>
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-white)',
                    border: '1px solid var(--color-border-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-forest-dark)',
                  }}
                  aria-hidden="true"
                >
                  <QrCode size={32} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Business Event Ticketing Capabilities (Parallax Two-Column Bento) */}
      <section ref={gridParallaxRef}>
        <div className="section-header" style={{ marginBottom: 28 }}>
          <div>
            <div className="eyebrow-label" style={{ marginBottom: 8 }}>
              <Sparkles size={14} />
              <span>Designed for Business Operations</span>
            </div>
            <h2 className="section-title">Everything Your Event Team Needs</h2>
            <p className="page-subtitle">
              From pricing strategy to live venue entry metrics—managed in one quiet workspace.
            </p>
          </div>
          <Link to={createEventHref} className="btn btn-primary">
            <span>{canOrganize ? 'Open Studio' : 'Register Organization'}</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="grid-2" style={{ alignItems: 'start' }}>
          <motion.div style={{ y: bentoLeftY }} className="space-y-6">
            <div className="card card-padded">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#E7F5EE] text-[#087F5B]">
                  <Layers size={19} />
                </span>
                <h3 className="card-title">Multi-Tier Pricing &amp; Seat Controls</h3>
              </div>
              <p className="text-sm text-[#53665E] leading-relaxed">
                Define Early Bird, General Admission, VIP, and Backstage allocations with automatic real-time inventory decrements inside PostgreSQL Serializable transactions.
              </p>
            </div>

            <div className="card card-padded">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#E7F5EE] text-[#087F5B]">
                  <Users size={19} />
                </span>
                <h3 className="card-title">Guest + Member Instant Conversion</h3>
              </div>
              <p className="text-sm text-[#53665E] leading-relaxed">
                Attendees can purchase tickets without logging in using just their name and email—receiving instant signed QR passes upon confirmation—or track everything in their Wallet.
              </p>
            </div>
          </motion.div>

          <motion.div style={{ y: bentoRightY }} className="space-y-6">
            <div className="card card-padded">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#E7F5EE] text-[#087F5B]">
                  <BarChart3 size={19} />
                </span>
                <h3 className="card-title">Live Revenue &amp; Check-In Telemetry</h3>
              </div>
              <p className="text-sm text-[#53665E] leading-relaxed">
                Track daily ticket sales, gross vs. net settled revenue after refunds, per-tier capacity sell-through, and live check-in rates from Organizer Dashboard.
              </p>
            </div>

            <div className="card card-padded">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#E7F5EE] text-[#087F5B]">
                  <QrCode size={19} />
                </span>
                <h3 className="card-title">Dedicated Venue Gate Scanners</h3>
              </div>
              <p className="text-sm text-[#53665E] leading-relaxed">
                Assign `SCANNER` accounts per event directly in Event Settings. Door staff validate tickets with mobile cameras or manual code lookup—zero duplicate entry possible.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final Business CTA */}
      <section className="promo-forest">
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--color-primary-soft)',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              marginBottom: 8,
            }}
          >
            Launch Today
          </div>
          <h2 className="section-title" style={{ color: 'var(--color-white)' }}>
            Ready to Create Your First Event?
          </h2>
          <p>
            Set up your organization profile, publish your first event listing with bespoke tiers, and start welcoming guests cleanly.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link
            to={createEventHref}
            className="btn btn-lg"
            style={{
              backgroundColor: 'var(--color-white)',
              color: 'var(--color-forest-dark)',
              borderColor: 'var(--color-white)',
            }}
          >
            <Ticket size={17} />
            <span>Create Your First Event</span>
            <ArrowRight size={17} />
          </Link>
          <Link
            to="/events"
            className="btn btn-lg"
            style={{
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: 'var(--color-white)',
              borderColor: 'rgba(255,255,255,0.28)',
            }}
          >
            <span>Browse Live Events</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
