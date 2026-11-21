import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Globe,
  Mail,
  MapPin,
  Phone,
  QrCode,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  FooterBackgroundGradient,
  TextHoverEffect,
} from '@/components/ui/hover-footer';

interface FooterNavItem {
  label: string;
  to: string;
  pulse?: boolean;
}

export function Footer() {
  const { user, isAuthenticated } = useAuth();
  const canOrganize = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';

  const discoverLinks: FooterNavItem[] = [
    { label: 'Home', to: '/' },
    { label: 'Browse Events', to: '/events', pulse: true },
    ...(isAuthenticated && user?.role !== 'SCANNER'
      ? [
          { label: 'My Ticket Wallet', to: '/my-tickets' },
          { label: 'Order History', to: '/my-account' },
        ]
      : [{ label: 'Member Sign In', to: '/login' }]),
  ];

  const platformLinks: FooterNavItem[] = [
    { label: 'For Business & Events', to: '/organization' },
    ...(canOrganize
      ? [
          { label: 'Organizer Studio', to: '/organizer' },
          { label: 'Create Event', to: '/organizer/events/new' },
        ]
      : [
          { label: 'Host an Event', to: '/register/organization' },
          ...(!isAuthenticated
            ? [{ label: 'Customer Sign Up', to: '/register' }]
            : []),
        ]),
    ...(user?.role === 'ADMIN' ? [{ label: 'Admin Console', to: '/admin' }] : []),
    ...(isAuthenticated ? [{ label: 'Inspect Ticket', to: '/tickets' }] : []),
  ];

  const contactInfo = [
    {
      icon: <Mail size={17} className="text-[#10B981] shrink-0" />,
      text: 'support@eticket.com.kh',
      href: 'mailto:support@eticket.com.kh',
    },
    {
      icon: <Phone size={17} className="text-[#10B981] shrink-0" />,
      text: '+855 23 880 420',
      href: 'tel:+85523880420',
    },
    {
      icon: <MapPin size={17} className="text-[#10B981] shrink-0" />,
      text: 'Diamond Island, Phnom Penh',
    },
  ];

  const quickRouteIcons = [
    { icon: <Ticket size={18} />, label: 'Browse Events', to: '/events' },
    { icon: <CalendarDays size={18} />, label: 'Home Discovery', to: '/' },
    {
      icon: <QrCode size={18} />,
      label: canOrganize ? 'Gate Scanner Studio' : 'My Tickets',
      to: canOrganize ? '/organizer/scanner' : '/my-tickets',
    },
    {
      icon: <ShieldCheck size={18} />,
      label: canOrganize ? 'Organizer Studio' : 'Register Organization',
      to: canOrganize ? '/organizer' : '/register/organization',
    },
    {
      icon: <Globe size={18} />,
      label: isAuthenticated ? 'My Account' : 'Sign In',
      to: isAuthenticated ? '/my-account' : '/login',
    },
  ];

  return (
    <div className="no-print mx-auto w-full max-w-[1320px] px-[clamp(18px,3vw,40px)] pb-6 pt-4">
      <footer className="bg-[#052E25] border border-[#145C48]/70 relative h-fit rounded-3xl overflow-hidden shadow-2xl text-[#C2D9CF]">
        <div className="max-w-7xl mx-auto p-8 sm:p-12 lg:p-14 z-40 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 lg:gap-14 pb-10">
            {/* Brand section */}
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2.5">
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[#087F5B] text-white shadow"
                  aria-hidden="true"
                >
                  <Ticket size={18} />
                </span>
                <span className="text-white text-xl font-bold tracking-tight">
                  Universal E-Ticket
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[#C2D9CF]">
                Modern ticketing infrastructure for concerts, conferences,
                cultural festivals, and live venues—built for speed, clarity, and
                gate integrity.
              </p>
            </div>

            {/* Discover */}
            <div>
              <h4 className="text-white text-base font-semibold mb-5">
                Discover
              </h4>
              <ul className="space-y-3 text-sm">
                {discoverLinks.map((link) => (
                  <li key={link.to + link.label} className="relative w-fit">
                    <Link
                      to={link.to}
                      className="text-[#C2D9CF] hover:text-[#34D399] transition-colors"
                    >
                      {link.label}
                    </Link>
                    {link.pulse && (
                      <span
                        aria-hidden="true"
                        className="absolute top-1 -right-3.5 w-2 h-2 rounded-full bg-[#10B981] animate-pulse"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Organizers & Platform */}
            <div>
              <h4 className="text-white text-base font-semibold mb-5">
                Organizers &amp; Gate
              </h4>
              <ul className="space-y-3 text-sm">
                {platformLinks.map((link) => (
                  <li key={link.to + link.label}>
                    <Link
                      to={link.to}
                      className="text-[#C2D9CF] hover:text-[#34D399] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h4 className="text-white text-base font-semibold mb-5">
                Contact Us
              </h4>
              <ul className="space-y-3.5 text-sm">
                {contactInfo.map((item) => (
                  <li key={item.text} className="flex items-center space-x-3">
                    {item.icon}
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-[#C2D9CF] hover:text-[#34D399] transition-colors"
                      >
                        {item.text}
                      </a>
                    ) : (
                      <span className="text-[#C2D9CF]">{item.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <hr className="border-t border-[#145C48]/70 my-6" />

          {/* Footer bottom */}
          <div className="flex flex-col md:flex-row justify-between items-center text-xs sm:text-sm gap-4">
            <div className="flex items-center space-x-5 text-[#91A198]">
              {quickRouteIcons.map(({ icon, label, to }) => (
                <Link
                  key={label}
                  to={to}
                  aria-label={label}
                  title={label}
                  className="hover:text-[#34D399] transition-colors"
                >
                  {icon}
                </Link>
              ))}
            </div>

            <p className="text-center md:text-right text-[#91A198]">
              &copy; {new Date().getFullYear()} Universal E-Ticketing Platform ·
              Ivory &amp; Emerald System
            </p>
          </div>
        </div>

        {/* Interactive Forest/Emerald Brand Hover Typography */}
        <div className="lg:flex hidden h-[15rem] -mt-10 -mb-12 relative z-20 px-8">
          <TextHoverEffect text="E-TICKET" />
        </div>

        <FooterBackgroundGradient />
      </footer>
    </div>
  );
}

export default Footer;
