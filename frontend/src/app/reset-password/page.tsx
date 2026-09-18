// frontend/src/app/reset-password/page.tsx
'use client';

import React, { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = useMemo(() => sp.get('token') ?? '', [sp]);

  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);

    const p1 = pwd.trim();
    const p2 = pwd2.trim();

    if (!token) {
      setMsg('Missing reset token. Please open the reset link from your email.');
      return;
    }
    if (p1.length < 6) {
      setMsg('Password must be at least 6 characters.');
      return;
    }
    if (p1 !== p2) {
      setMsg('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      const res = await fetch('http://localhost:8080/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: p1 }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        setMsg(data?.message || 'Reset failed.');
        return;
      }

      setMsg('✅ Password reset successful. Redirecting to login…');
      setPwd('');
      setPwd2('');

      setTimeout(() => router.replace('/login'), 900);
    } catch (err: any) {
      setMsg(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-sm text-slate-600 mt-1">Enter your new password.</p>

        {!token && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Missing token. Please open the reset link from your email.
          </div>
        )}

        {msg && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            {msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">New password</label>
            <div className="relative">
              <input
                type={show1 ? 'text' : 'password'}
                required
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow1((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 hover:text-emerald-700"
              >
                {show1 ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm password</label>
            <div className="relative">
              <input
                type={show2 ? 'text' : 'password'}
                required
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-16 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShow2((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600 hover:text-emerald-700"
              >
                {show2 ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full h-11 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <div className="mt-5 text-sm">
          <Link href="/login" className="text-emerald-700 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
