// frontend/src/app/login/page.tsx
'use client';

import React, { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

const SLIDES = [
  '/image/hero-1.jpg',
  '/image/hero-4.jpg',
  '/image/hero-5.jpg',
  '/image/hero-7.jpg',
  '/image/hero-8.jpg',
  '/image/hero-10.jpg',
];

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') ?? '/';

  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ✅ If already logged in, redirect based on admin status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('auth_token');
    const isAdminStored = localStorage.getItem('is_admin') === '1';

    if (token) {
      router.replace(isAdminStored ? '/admin' : redirect);
    }
  }, [router, redirect]);

  // ✅ Background slideshow
  useEffect(() => {
    if (SLIDES.length <= 1) return;
    const id = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % SLIDES.length),
      5000
    );
    return () => clearInterval(id);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !pwd) {
      setErrorMsg('All fields are required');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('http://localhost:8080/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd }),
      });

      const result = await res.json();

      // ✅ include contact from backend response (so we can autofill in booking)
      const { success, message, error, jwtToken, name, isAdmin, contact } = result;

      if (success) {
        setSuccessMsg(message || 'Login successful');

        if (jwtToken) localStorage.setItem('auth_token', jwtToken);
        if (name) localStorage.setItem('user_name', name);

        localStorage.setItem('user_email', email);
        localStorage.setItem('is_admin', isAdmin ? '1' : '0');

        // ✅ Save contact to use in booking page autofill
        if (contact !== undefined && contact !== null) {
          localStorage.setItem('user_contact', String(contact));
        } else {
          // optional: clear old saved value if backend didn't send it
          localStorage.removeItem('user_contact');
        }

        // ✅ redirect admin -> /admin, normal user -> redirect (or '/')
        const nextPath = isAdmin ? '/admin' : redirect;

        setTimeout(() => router.replace(nextPath), 800);
        return;
      }

      // ✅ error handling
      if (error) {
        const details = error?.details?.[0]?.message;
        setErrorMsg(details || message || 'Login failed');
      } else {
        setErrorMsg(message || 'Login failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // ✅ prefill email on forgot-password page (optional)
  const forgotHref =
    email?.trim().length > 0
      ? `/forgot-password?email=${encodeURIComponent(email.trim())}`
      : '/forgot-password';

  return (
    <div className="min-h-screen text-slate-900">
      <section className="relative min-h-screen pt-24 pb-16">
        <div className="absolute inset-0">
          {SLIDES.map((src, idx) => (
            <Image
              key={src}
              src={src}
              alt=""
              fill
              sizes="100vw"
              priority={idx === 0}
              className={`object-cover transition-opacity duration-1000 ease-in-out ${
                idx === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ objectPosition: 'center 28%' }}
            />
          ))}
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 flex items-center justify-center">
          <div className="mx-auto w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-center">Welcome back.</h1>
            <p className="text-center text-slate-600 mb-4">
              Log in and start exploring.
            </p>

            {errorMsg && (
              <p className="mb-2 text-sm text-red-600 text-center">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="mb-2 text-sm text-emerald-600 text-center">{successMsg}</p>
            )}

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    required
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 hover:text-emerald-700"
                  >
                    {showPwd ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className="mt-2 text-right">
                  <Link
                    href={forgotHref}
                    className="text-xs font-medium text-emerald-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition disabled:opacity-60"
              >
                {loading ? 'Logging in...' : 'Log in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-emerald-700 hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
