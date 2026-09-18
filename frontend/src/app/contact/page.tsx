// frontend/src/app/contact/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import NavBar from '../components/NavBar';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageSquareText,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type FormState = {
  name: string;
  email: string;
  subject: string;
  category: 'General' | 'Booking' | 'Support' | 'Partnership';
  message: string;
  consent: boolean;
};

const initial: FormState = {
  name: '',
  email: '',
  subject: '',
  category: 'General',
  message: '',
  consent: true,
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function ContactPage() {
  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false;
    if (!isEmail(form.email)) return false;
    if (!form.subject.trim()) return false;
    if (!form.message.trim() || form.message.trim().length < 10) return false;
    return true;
  }, [form]);

  const charCount = form.message.length;
  const msgHint =
    charCount === 0
      ? 'Tell us what you need help with.'
      : charCount < 10
      ? 'Add a bit more detail (at least 10 characters).'
      : `${charCount}/2000`;

  const update = (k: keyof FormState, v: any) => {
    setForm((p) => ({ ...p, [k]: v }));
    setError(null);
    setSent(false);
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      // No backend endpoint provided, so we simulate a real submit.
    
      await new Promise((r) => setTimeout(r, 700));

      setSent(true);
      setForm(initial);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-900 font-sans pt-16 md:pt-20">
      <NavBar />

      {/* Header */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rounded-3xl border border-emerald-200 bg-white shadow-sm overflow-hidden"
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <MessageSquareText className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  Get in touch
                </h1>
                <p className="mt-2 text-slate-600 max-w-2xl">
                  Questions about routes, bookings, or partnerships? Send us a message and we’ll get back to you.
                </p>
              </div>
            </div>

            {/* Quick chips */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { label: 'Booking help', val: 'Booking' },
                { label: 'Trail info', val: 'General' },
                { label: 'Support', val: 'Support' },
                { label: 'Partnership', val: 'Partnership' },
              ].map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => update('category', c.val as FormState['category'])}
                  className={`h-9 px-3 rounded-full border text-sm transition ${
                    form.category === c.val
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-2 bg-gradient-to-r from-emerald-300 via-emerald-200 to-emerald-100" />
        </motion.div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6">
          {/* Form */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 sm:p-7"
          >
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Alerts */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="min-w-0">{error}</span>
                  </motion.div>
                )}

                {sent && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Message sent! We’ll reply soon.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Your name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Sero Trekker"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className={`w-full h-11 rounded-2xl border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      form.email && !isEmail(form.email) ? 'border-rose-300' : 'border-slate-200'
                    }`}
                    placeholder="you@example.com"
                    required
                  />
                  {form.email && !isEmail(form.email) && (
                    <p className="mt-1 text-xs text-rose-600">Please enter a valid email.</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => update('category', e.target.value)}
                      className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>General</option>
                      <option>Booking</option>
                      <option>Support</option>
                      <option>Partnership</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.subject}
                    onChange={(e) => update('subject', e.target.value)}
                    className="w-full h-11 rounded-2xl border border-slate-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Booking issue / Trail details"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Message <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => update('message', e.target.value.slice(0, 2000))}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Write your message here…"
                  required
                />
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{msgHint}</span>
                  <span>{charCount}/2000</span>
                </div>
              </div>

              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => update('consent', e.target.checked)}
                  className="mt-1"
                />
                <span className="leading-snug">
                  You can email me back with updates about my request.
                </span>
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || !canSubmit}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800 disabled:opacity-60"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'Sending…' : 'Send message'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm(initial);
                    setError(null);
                    setSent(false);
                  }}
                  className="h-11 px-5 rounded-full border border-slate-200 text-sm hover:bg-slate-50"
                >
                  Reset
                </button>

                <span className="text-xs text-slate-500">
                  Typical reply time: <span className="font-medium text-slate-700">within 24 hours</span>
                </span>
              </div>
            </form>
          </motion.section>

          {/* Right sidebar */}
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="space-y-4"
          >
            {/* Contact cards */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
              <h3 className="text-lg font-semibold">Contact info</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Mail className="w-4.5 h-4.5 text-emerald-700" />
                  </div>
                  <div>
                    <p className="font-medium">Email</p>
                    <p className="text-slate-600">support@serotrek.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                    <Phone className="w-4.5 h-4.5 text-sky-700" />
                  </div>
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-slate-600">+977-98XXXXXXXX</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                    <MapPin className="w-4.5 h-4.5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-slate-600">Kathmandu, Nepal</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    <Clock className="w-4.5 h-4.5 text-slate-700" />
                  </div>
                  <div>
                    <p className="font-medium">Hours</p>
                    <p className="text-slate-600">Sun–Fri • 9:00–18:00</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 mt-0.5 text-slate-600" />
                  <p className="text-slate-700">
                    Tip: For booking issues, include your trek name + date so we can help faster.
                  </p>
                </div>
              </div>
            </div>

            {/* Mini FAQ */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5">
              <h3 className="text-lg font-semibold">Quick answers</h3>
              <div className="mt-4 space-y-3">
                {[
                  {
                    q: 'How do I book a trek?',
                    a: 'Open a trail page and tap “Book”. If you are not logged in, you will be redirected to login.',
                  },
                  {
                    q: 'Can I upload reviews with photos?',
                    a: 'Yes — when you submit a review, you can attach up to 6 photos (PNG/JPG/WEBP).',
                  },
                  {
                    q: 'Why don’t I see recommendations?',
                    a: 'Recommendations improve after you rate/review a few treks. New users may see popular picks first.',
                  },
                ].map((item) => (
                  <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer list-none flex items-start justify-between gap-3">
                      <span className="text-sm font-medium text-slate-900">{item.q}</span>
                      <span className="text-slate-400 group-open:rotate-45 transition">+</span>
                    </summary>
                    <p className="mt-2 text-sm text-slate-600">{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </motion.aside>
        </div>
      </main>
    </div>
  );
}
