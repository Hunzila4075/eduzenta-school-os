import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import PublicNavbar from '../../components/navbar/PublicNavbar';
import EduzentaLogo from '../../components/common/EduzentaLogo';
import {
  ShieldCheck, School, UserCheck, FileCheck2, CreditCard, CalendarCheck,
  ArrowRight, ChevronDown, Sparkles, Lock, Download, BarChart3, CheckCircle2, Users
} from 'lucide-react';

export default function LandingPage() {
  const { setCurrentView } = useApp();
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    { q: "What is Eduzenta SaaS School OS?", a: "Eduzenta is an all-in-one multi-tenant cloud SaaS system that streamlines school operations, fee collection, bulk result card PDF generation, attendance tracking, and faculty workflows from a single unified portal." },
    { q: "How does the Unified Login system handle role security?", a: "Eduzenta features a single clean login portal. Users enter their assigned credentials, and the smart authentication engine directs Super Admins, School Admins, or Faculty to their dashboards while enforcing subscription payment locks." },
    { q: "Can School Admins override teacher attendance records?", a: "Once a teacher submits daily attendance, the entry locks immediately. Only authorized School Admins retain override and delete permissions." },
    { q: "How does the Fee Chalan and Result Card PDF engine work?", a: "Admins can bulk generate roll-number-wise fee chalans and official printable student result cards with auto grade calculations, signature blocks, and watermark footers." },
    { q: "How does the broadcast system work?", a: "Super Admins can publish rich announcements, video links, and priority directives to specific or all school admins with real-time unread badges." }
  ];

  const heroCards = [
    { icon: Users, label: 'Student Database', color: 'from-blue-500 to-indigo-600', stat: 'Real-time class-wise roster' },
    { icon: CalendarCheck, label: 'Attendance Engine', color: 'from-emerald-500 to-teal-600', stat: 'Locked teacher registers' },
    { icon: FileCheck2, label: 'Result Cards PDF', color: 'from-purple-500 to-[#5A3193]', stat: 'Bulk printable reports' }
  ];

  const features = [
    { icon: School, title: 'Multi-School Management', desc: 'Onboard and manage multiple institutions from one unified platform with full data isolation.' },
    { icon: UserCheck, title: 'Teacher Class Isolation', desc: 'Teachers see only assigned classes - enforced server-side across the whole system.' },
    { icon: CalendarCheck, title: 'Attendance Engine', desc: 'Daily registers with locked submissions and admin override controls.' },
    { icon: FileCheck2, title: 'Result Cards PDF', desc: 'Bulk multi-page result cards with auto grades and signature blocks.' },
    { icon: CreditCard, title: 'Fee Chalan Engine', desc: 'Automated monthly chalans with server-calculated totals and A4 layouts.' },
    { icon: Download, title: 'Admit Card Generator', desc: 'Official admit cards from real student records with school branding.' }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans selection:bg-pink-100 selection:text-pink-700">
      <PublicNavbar />

      {/* HERO */}
      <section className="relative pt-16 pb-20 overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-pink-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-indigo-200/30 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-purple-200 text-purple-700 text-xs font-bold mb-6 shadow-sm">
            <Sparkles className="w-4 h-4 text-pink-500" />
            <span>Next-Generation SaaS School Management System</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-tight text-slate-900 max-w-5xl mx-auto">
            Empowering Modern Education with{' '}
            <span className="bg-gradient-to-r from-[#5A3193] via-[#7042b3] to-pink-500 bg-clip-text text-transparent">Eduzenta OS</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-500 max-w-3xl mx-auto font-normal leading-relaxed">
            A multi-school management solution connecting Super Admins, School Leaders, and Faculty with automated fee chalans, strict attendance engines, and printable PDF result cards.
          </p>
<div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setCurrentView('login')}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl qobe-btn-faculty text-white text-sm font-black shadow-lg shadow-purple-700/30 transition-all transform hover:-translate-y-0.5 min-h-[48px]"
            >
              <Lock className="w-4 h-4" />
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-sm font-black shadow-sm hover:border-purple-400 hover:text-[#5A3193] transition-all min-h-[48px]"
            >
              Explore Features
            </button>
          </div>

          {/* 3D-style dashboard mockup card */}
          <div className="mt-16 max-w-4xl mx-auto relative">
            <div className="relative rounded-3xl bg-white border border-slate-200 shadow-2xl shadow-slate-300/60 overflow-hidden text-left">
              <div className="flex items-center gap-1.5 px-5 py-3 border-b border-slate-100 bg-slate-50/80">
                <span className="w-3 h-3 rounded-full bg-pink-300" />
                <span className="w-3 h-3 rounded-full bg-amber-300" />
                <span className="w-3 h-3 rounded-full bg-emerald-300" />
                <span className="ml-3 text-[10px] font-mono text-slate-400">app.eduzenta.com - School Operating System</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                {heroCards.map(card => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center mb-3 shadow-md`}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-black text-slate-900">{card.label}</p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">{card.stat}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-pink-500">Platform Features</span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">Everything your school needs, in one place</h2>
            <p className="text-sm text-slate-500 mt-3 max-w-2xl mx-auto">Purpose-built modules that keep class isolation, real data, and institutional branding consistent across every screen.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(f => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#5A3193] to-pink-500 text-white flex items-center justify-center mb-4 shadow-md">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-900">{f.title}</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
{/* HIGHLIGHTS */}
      <section id="highlights" className="py-20 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-purple-600">Platform Highlights</span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">Built for operators, trusted by institutions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {[
              { icon: ShieldCheck, title: 'Role-Based Security', desc: 'Super Admin, School Admin, and Teacher access routes are enforced on the backend, not just hidden in the UI.' },
              { icon: BarChart3, title: 'Real-Time Dashboard', desc: 'Live student counts, fee collections, and attendance summaries computed from the database.' },
              { icon: CreditCard, title: 'Server-Calculated Fees', desc: 'Chalan totals are computed server-side; the frontend always displays persisted values, never made-up amounts.' },
              { icon: CheckCircle2, title: 'Branding Everywhere', desc: 'School name, logo, and address propagate identically into dashboards, result cards, challans, admit cards, and PDFs.' }
            ].map(h => (
              <div key={h.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-[#5A3193] flex items-center justify-center shrink-0">
                  <h.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{h.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT / ARCHITECTURE */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-pink-500">About Eduzenta</span>
            <h2 className="text-3xl font-black text-slate-900 mt-2 leading-tight">A multi-tenant cloud architecture built for scale</h2>
            <p className="text-sm text-slate-500 mt-4 leading-relaxed">
              Each school is fully isolated in its own tenant boundary. Admins manage their real class catalog while teachers are bound to only the classes assigned to them. Every document - result cards, fee challans, and admit cards - is generated from genuine database records with the school's own branding woven throughout.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {['Single unified login with automatic role detection', 'Server-enforced teacher class isolation', 'Persistent fee, marks, attendance, and admit card records', 'Isolated print and PDF rendering for clean documents'].map(item => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-[#5A3193] via-[#4C2A7B] to-pink-600 p-8 text-white shadow-2xl shadow-purple-900/25">
            <EduzentaLogo variant="dark" className="h-9 mb-6" />
            <p className="text-lg font-black leading-snug">One platform. Every role. Consistent real data everywhere.</p>
            <p className="text-xs text-purple-100 mt-3 leading-relaxed">
              From class assignment to branded PDF output, Eduzenta keeps a single source of truth so nothing is ever faked or duplicated.
            </p>
          </div>
        </div>
      </section>
{/* FAQS */}
      <section id="faqs" className="py-20 bg-slate-50/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-purple-600">Have Questions?</span>
            <h2 className="text-3xl font-black text-slate-900 mt-2">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all">
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-slate-900 hover:text-[#5A3193] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${activeFaq === idx ? 'rotate-180 text-pink-500' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <EduzentaLogo variant="light" className="h-8" />
            <p className="text-xs text-slate-500 font-medium">
              Enterprise SaaS School OS (c) {new Date().getFullYear()} Eduzenta Inc. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500 mt-1">
              <span className="text-purple-700 font-semibold">Eduzenta - Developed by <strong className="text-pink-600">Hunzila Khan</strong></span>
              <span>•</span>
              <a href="mailto:eduzentawithkhan@gmail.com" className="hover:text-[#5A3193] transition-colors">eduzentawithkhan@gmail.com</a>
              <span>•</span>
              <a href="tel:+923330935652" className="hover:text-[#5A3193] transition-colors font-mono">+92 333 0935652</a>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-semibold">
            <button onClick={() => setCurrentView('login')} className="hover:text-[#5A3193] transition-colors">Unified Login</button>
            <a href="#features" className="hover:text-[#5A3193] transition-colors">Platform Features</a>
            <a href="#about" className="hover:text-[#5A3193] transition-colors">Architecture</a>
            <a href="mailto:support@eduzenta.com" className="hover:text-[#5A3193] transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}