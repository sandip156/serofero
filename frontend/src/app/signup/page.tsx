// frontend/src/app/signup/page.tsx
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
  '/image/hero-9.jpg',
];

// ✅ you can edit this list
const ADDRESS_OPTIONS = [
  'Kathmandu, Nepal',
  'Pokhara, Nepal',
  'Lalitpur, Nepal',
  'Bhaktapur, Nepal',
  'Chitwan, Nepal',
  'Butwal, Nepal',
  'Dharan, Nepal',
  'Biratnagar, Nepal',
  'Janakpur, Nepal',
  'Dhangadhi, Nepal',
  'Other',
];

export default function SignupPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get('redirect') ?? '/login';

  const [currentSlide, setCurrentSlide] = useState(0);

  // form fields
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [age, setAge] = useState('');
  const [address, setAddress] = useState('Kathmandu, Nepal');
  const [customAddress, setCustomAddress] = useState('');

  // ✅ Email + password at the end
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // If already logged in, send them away from signup
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('auth_token')) {
      router.replace('/');
    }
  }, [router]);

  // Slideshow
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

    // ✅ Contact required now
    if (!name.trim() || !contact.trim() || !email.trim() || !pwd) {
      setErrorMsg('Name, contact, email and password are required');
      return;
    }

    const finalAddress = address === 'Other' ? customAddress.trim() : address;

    // If user chooses "Other" but leaves it empty
    if (address === 'Other' && !finalAddress) {
      setErrorMsg('Please enter your address');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('http://localhost:8080/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          age,
          address: finalAddress,
          email: email.trim(),
          password: pwd,
        }),
      });

      const result = await res.json();
      const { success, message, error } = result;

      if (success) {
        setSuccessMsg(message || 'Signup successful');
        setTimeout(() => router.replace(redirect), 800);
      } else if (error) {
        const details = error?.details?.[0]?.message;
        setErrorMsg(details || message || 'Signup failed');
      } else {
        setErrorMsg(message || 'Signup failed');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen text-slate-900">
      <section className="relative min-h-screen pt-24 pb-16">
        {/* Background slideshow */}
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

        {/* Center card */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10 flex items-center justify-center">
          <div className="mx-auto w-full max-w-md bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 p-6 md:p-8">
            <h1 className="text-2xl font-bold text-center">Create your account</h1>
            <p className="text-center text-slate-600 mb-4">
              Join SeroTrek and start exploring.
            </p>

            {errorMsg && (
              <p className="mb-2 text-sm text-red-600 text-center">{errorMsg}</p>
            )}
            {successMsg && (
              <p className="mb-2 text-sm text-emerald-600 text-center">{successMsg}</p>
            )}

            <form className="space-y-4" onSubmit={onSubmit}>
              {/* NAME */}
              <div>
                <label className="block text-sm font-medium mb-1">Full name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Your full name"
                />
              </div>

              {/* CONTACT + AGE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Contact number
                  </label>
                  <input
                    type="tel"
                    required // ✅ required now
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Age</label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 24"
                  />
                </div>
              </div>

              {/* ✅ ADDRESS SELECT */}
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {ADDRESS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>

                {/* If "Other", show custom input */}
                {address === 'Other' && (
                  <input
                    type="text"
                    value={customAddress}
                    onChange={(e) => setCustomAddress(e.target.value)}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Enter your address"
                    required
                  />
                )}
              </div>

              {/* ✅ EMAIL (last) */}
              <div>
                <label className="block text-sm font-medium mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@gmail.com"
                />
              </div>

              {/* ✅ PASSWORD (last) */}
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-full bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition disabled:opacity-60"
              >
                {loading ? 'Signing up...' : 'Sign up'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="text-emerald-700 hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
