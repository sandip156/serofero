// frontend/src/app/settings/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '../components/NavBar';
import Image from 'next/image';

export default function SettingsPage() {
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;
    if (!token) {
      router.replace(`/login?redirect=${encodeURIComponent('/settings')}`);
      return;
    }

    const storedName = localStorage.getItem('user_name');
    const storedEmail = localStorage.getItem('user_email');
    setName(storedName);
    setEmail(storedEmail);
    setLoading(false);
  }, [router]);

  const save = () => {
    if (name) localStorage.setItem('user_name', name);
    alert('Saved (demo). Refresh navbar to see changes.');
  };

  const signOut = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_email');
    localStorage.removeItem('is_admin');
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900">
      <NavBar />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Page header */}
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Account settings
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600">
            Manage your profile details and account information.
          </p>
        </header>

        {/* Content */}
        {loading ? (
          <div className="rounded-2xl bg-white border border-emerald-100 p-6 shadow-sm">
            <p className="text-sm text-slate-600">
              Loading your settings…
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(260px,1fr)]">
            {/* Main account card */}
            <section className="rounded-2xl bg-white border border-emerald-100 p-5 sm:p-6 shadow-sm space-y-5">
              {/* Avatar + basic info */}
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden">
                  <Image
                    src="/icons/user.png"
                    alt="User avatar"
                    fill
                    className="object-contain p-2"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Signed in as
                  </p>
                  <p className="font-semibold truncate">
                    {email || 'Unknown user'}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700">
                    Profile
                  </h2>
                  <p className="text-xs text-slate-500">
                    This name is shown in the navigation bar and on trip
                    plans.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Display name
                    </label>
                    <input
                      type="text"
                      value={name ?? ''}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Your name"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-600">
                      Email (read only)
                    </label>
                    <input
                      type="email"
                      value={email ?? ''}
                      disabled
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={save}
                    className="inline-flex items-center rounded-full bg-emerald-700 text-white px-5 py-2 text-sm font-medium hover:bg-emerald-800"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </section>

            {/* Side column */}
            <aside className="space-y-4">
              <section className="rounded-2xl bg-white border border-emerald-100 p-4 sm:p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  Security
                </h2>
                <p className="text-xs text-slate-500">
                  Password & sign-in options are not wired up yet in this
                  demo.
                </p>
                <button
                  type="button"
                  className="mt-1 inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  disabled
                >
                  Change password (coming soon)
                </button>
              </section>

              <section className="rounded-2xl bg-white border border-rose-100 p-4 sm:p-5 shadow-sm space-y-3">
                <h2 className="text-sm font-semibold text-slate-800">
                  Sign out
                </h2>
                <p className="text-xs text-slate-500">
                  You&apos;ll need to log in again to access saved treks and
                  plans.
                </p>
                <button
                  onClick={signOut}
                  className="inline-flex items-center justify-center rounded-full bg-rose-600 text-white px-4 py-2 text-xs font-semibold hover:bg-rose-700"
                >
                  Sign out
                </button>
              </section>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
