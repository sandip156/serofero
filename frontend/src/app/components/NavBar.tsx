// frontend/src/app/components/NavBar.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import clsx from 'clsx';
import { Bookmark, Menu, X, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import SearchBar from './SearchBar';

function getInitials(nameOrEmail: string | null) {
  if (!nameOrEmail) return 'S';
  const base = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0]! : nameOrEmail;
  const words = base.split(/[._-\s]+/).filter(Boolean);
  if (!words.length) return 'S';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0] + words[1]![0]).toUpperCase();
}

const NavBar: React.FC = () => {
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw || '/';
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const [userName, setUserName] = React.useState<string | null>(null);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);
  const [authed, setAuthed] = React.useState(false);

  const readAuth = React.useCallback(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    const name = localStorage.getItem('user_name');
    const email = localStorage.getItem('user_email');

    const isAuthed = !!token;

    setAuthed(isAuthed);

    // ✅ important: if not authed, clear user fields (prevents “previous user” UI)
    if (!isAuthed) {
      setUserName(null);
      setUserEmail(null);
      return;
    }

    setUserName(name);
    setUserEmail(email);
  }, []);

  // ✅ Always keep navbar in sync (same-tab localStorage updates won't trigger "storage")
  React.useEffect(() => {
    readAuth();

    const onStorage = () => readAuth(); // other tabs
    const onFocus = () => readAuth(); // returning to tab
    const onAuthChanged = () => readAuth(); // optional custom event
    const onVis = () => {
      if (!document.hidden) readAuth();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    window.addEventListener('auth-changed', onAuthChanged as EventListener);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('auth-changed', onAuthChanged as EventListener);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [readAuth]);

  // ✅ route change: close menus AND re-read auth (login -> destination updates UI instantly)
  React.useEffect(() => {
    setOpen(false);
    setMenuOpen(false);
    readAuth();
  }, [pathname, readAuth]);

  // (extra safety) if login sets token first and name/email slightly later
  React.useEffect(() => {
    if (authed && !(userName || userEmail)) {
      const id = window.setTimeout(() => readAuth(), 200);
      return () => window.clearTimeout(id);
    }
  }, [authed, userName, userEmail, readAuth]);

  const isHome = pathname === '/';
  const showNavSearch = !isHome;
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isAuthPage) return null;

  const navShell = clsx(
    'fixed top-0 left-0 right-0 z-50 transition-colors',
    isHome ? 'bg-transparent text-white' : 'bg-[#DFF5E4] text-emerald-900'
  );

  const linkBase = clsx(
    'rounded-full px-3 py-1.5 text-[15px] focus:outline-none focus-visible:ring-2',
    isHome
      ? 'text-white/90 hover:text-white focus-visible:ring-white/60'
      : 'hover:bg-emerald-900/5 focus-visible:ring-emerald-500'
  );
  const linkActive = isHome ? '' : 'bg-emerald-900/10';

  const pillBorder = isHome
    ? 'border-transparent bg-transparent hover:bg-white/10'
    : 'border-emerald-300 hover:bg-emerald-900/5';

  const avatarBg = isHome ? 'bg-white/10 text-white' : 'bg-emerald-700 text-white';

  const redirectLogin = (target = pathname || '/') =>
    router.push(`/login?redirect=${encodeURIComponent(target)}`);

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_email');
      localStorage.removeItem('is_admin');

      // optional: let any other listeners update immediately
      window.dispatchEvent(new Event('auth-changed'));
    }

    setAuthed(false);
    setUserName(null);
    setUserEmail(null);
    setMenuOpen(false);
    router.push('/login');
  };

  const initials = getInitials(userName ?? userEmail ?? null);

  return (
    <nav className={navShell} aria-label="Primary navigation">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
        {/* DESKTOP */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto] items-center gap-4 h-16">
          {/* LEFT */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="SeroTrek logo" width={40} height={40} className="block" />
            <span className={clsx('text-xl font-extrabold tracking-tight leading-none', isHome ? 'text-white' : 'text-emerald-900')}>
              SeroTrek
            </span>
          </Link>

          {/* CENTER */}
          {showNavSearch ? (
            <div className="justify-self-center w-full max-w-md">
              <SearchBar
                variant="nav"
                className="w-full"
                placeholder="Search trails, parks, or cities"
              />
            </div>
          ) : (
            <div className="justify-self-center w-full max-w-md" />
          )}

          {/* RIGHT */}
          <div className="flex items-center justify-end gap-1">
            <ul className="flex items-center gap-1">
              <li>
                <Link className={clsx(linkBase, pathname.startsWith('/destination') && linkActive)} href="/destination">
                  Explore
                </Link>
              </li>
              <li>
                <a
                  className={clsx(linkBase, pathname.startsWith('/saved') && linkActive)}
                  onClick={(e) => {
                    e.preventDefault();
                    authed ? router.push('/saved') : redirectLogin('/saved');
                  }}
                  href={authed ? '/saved' : `/login?redirect=${encodeURIComponent('/saved')}`}
                >
                  Saved
                </a>
              </li>
              <li>
                <Link className={clsx(linkBase, pathname.startsWith('/contact') && linkActive)} href="/contact">
                  Contact
                </Link>
              </li>
            </ul>

            {/* Auth pill */}
            {!authed ? (
              <button
                onClick={() => redirectLogin()}
                className={clsx('ml-2 inline-flex items-center gap-2 rounded-full px-3 py-2 border', pillBorder)}
                aria-label="Login"
              >
                <span className={clsx('inline-grid place-items-center w-8 h-8 rounded-full text-xs font-semibold leading-none', avatarBg)}>
                  {initials}
                </span>
                <span className={clsx('text-sm font-medium leading-none', isHome ? 'text-white' : 'text-emerald-900')}>
                  Login
                </span>
              </button>
            ) : (
              <div className="relative ml-2">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className={clsx('flex items-center gap-2 rounded-full px-3 py-2 border', pillBorder)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <span className={clsx('inline-grid place-items-center w-8 h-8 rounded-full text-xs font-semibold', avatarBg)}>
                    {getInitials(userName ?? userEmail ?? null)}
                  </span>
                  <span className={clsx('text-sm font-medium max-w-[12rem] truncate', isHome ? 'text-white' : 'text-emerald-900')}>
                    {userName ?? userEmail ?? 'User'}
                  </span>
                  <ChevronDown className={clsx('w-4 h-4', isHome ? 'text-white' : 'text-emerald-900/80')} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-2xl shadow-xl overflow-hidden z-50 bg-white text-gray-900 border border-slate-200"
                  >
                    <div className="py-1">
                      <a
                        className="block px-4 py-2 text-sm hover:bg-slate-50"
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuOpen(false);
                          router.push('/saved');
                        }}
                        href="/saved"
                        role="menuitem"
                      >
                        Saved
                      </a>
                      <a
                        className="block px-4 py-2 text-sm hover:bg-slate-50"
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuOpen(false);
                          router.push('/settings');
                        }}
                        href="/settings"
                        role="menuitem"
                      >
                        Settings
                      </a>
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        role="menuitem"
                      >
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MOBILE */}
        <div className="md:hidden h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SeroTrek logo" width={36} height={36} className="block" />
            <span className={clsx('text-lg font-extrabold', isHome ? 'text-white' : 'text-emerald-900')}>
              SeroTrek
            </span>
          </Link>

          <div className="flex items-center gap-1.5">
            <button
              aria-label="Saved"
              className={clsx(
                'inline-flex items-center justify-center rounded-full p-2',
                isHome ? 'hover:bg-white/10 text-white' : 'hover:bg-emerald-900/5 text-emerald-900'
              )}
              onClick={() => (authed ? router.push('/saved') : redirectLogin('/saved'))}
              title="Saved"
            >
              <Bookmark className="w-5 h-5" />
            </button>

            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className={clsx(
                'inline-flex items-center justify-center rounded-full p-2',
                isHome ? 'hover:bg-white/10 text-white' : 'hover:bg-emerald-900/5 text-emerald-900'
              )}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden fixed inset-x-0 top-0 z-50 pt-16 h-screen bg-white text-gray-900">
          <div className="absolute right-4 top-3">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="p-2 rounded-full hover:bg-black/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="px-4 py-4 space-y-4 text-lg font-medium">
            {showNavSearch && (
              <SearchBar
                variant="nav"
                className="w-full"
                placeholder="Search trails, parks, or cities"
                onNavigate={() => setOpen(false)}
              />
            )}

            <Link className="block py-2" href="/destination" onClick={() => setOpen(false)}>
              Explore
            </Link>

            <a
              className="block py-2"
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                authed ? router.push('/saved') : redirectLogin('/saved');
              }}
              href={authed ? '/saved' : `/login?redirect=${encodeURIComponent('/saved')}`}
            >
              Saved
            </a>

            <a
              className="block py-2"
              onClick={(e) => {
                e.preventDefault();
                setOpen(false);
                authed ? router.push('/settings') : redirectLogin('/settings');
              }}
              href={authed ? '/settings' : `/login?redirect=${encodeURIComponent('/settings')}`}
            >
              Settings
            </a>

            {!authed ? (
              <button
                onClick={() => {
                  setOpen(false);
                  redirectLogin();
                }}
                className="mt-2 inline-flex items-center justify-center rounded-full border px-4 py-2"
              >
                Login
              </button>
            ) : (
              <div className="mt-2">
                <div className="mb-2 text-sm">
                  Signed in as <span className="font-semibold">{userName ?? userEmail}</span>
                </div>
                <button
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-rose-600"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
