// frontend/src/app/forgot-password/page.tsx
'use client';

import React, { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ForgotPasswordPage() {
  const sp = useSearchParams();
  const prefill = sp.get('email') ?? '';

  const [email, setEmail] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setEmail(prefill), [prefill]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMsg(null);
    setDevLink(null);
    setCopied(false);

    if (!email?.trim()) {
      setMsg('Email is required.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:8080/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      setMsg(
        data?.message || 'If that email exists, a reset link has been sent.'
      );

      // DEV help: backend returns devResetLink if SMTP not configured
      if (data?.devResetLink) setDevLink(String(data.devResetLink));
    } catch (err: any) {
      setMsg(err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  async function copyDevLink() {
    if (!devLink) return;
    try {
      await navigator.clipboard.writeText(devLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        <p className="text-sm text-slate-600 mt-1">
          Enter your email and we’ll send a reset link.
        </p>

        {msg && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            {msg}

            {devLink && (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="text-xs font-semibold text-emerald-800">
                  DEV reset link (for testing)
                </div>

                <div className="mt-2 flex items-start gap-2">
                  {/* Use <a> for absolute URL to avoid Next Link edge-cases */}
                  <a
                    className="text-emerald-700 underline break-all text-xs"
                    href={devLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {devLink}
                  </a>

                  <button
                    type="button"
                    onClick={copyDevLink}
                    className="shrink-0 text-xs px-3 py-1 rounded-full border border-emerald-200 bg-white hover:bg-emerald-50"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="mt-2 text-[11px] text-emerald-800/80">
                  In production, you’ll send this link via email instead.
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@gmail.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send reset link'}
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
