import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import PublicNavbar from '../../components/navbar/PublicNavbar';
import EduzentaLogo from '../../components/common/EduzentaLogo';
import {
  ShieldCheck,
  School,
  UserCheck,
  FileCheck2,
  CreditCard,
  CalendarCheck,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Lock,
  Download,
  BarChart3,
  CheckCircle2
} from 'lucide-react';

export default function LandingPage() {
  const { setCurrentView } = useApp();
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    {
      q: "What is Eduzenta SaaS School OS?",
      a: "Eduzenta is an all-in-one multi-tenant cloud SaaS system built to streamline school operations, fee collection, bulk result card PDF generation, attendance tracking, and faculty workflows from a single unified portal."
    },
    {
      q: "How does the Unified Login system handle role security?",
      a: "Eduzenta features a single clean login portal. Users enter their assigned credentials, and our dynamic authentication engine seamlessly directs Super Admins, School Admins, or Faculty members to their respective dashboards while instantly enforcing subscription payment locks."
    },
    {
      q: "Can School Admins override teacher attendance records?",
      a: "Yes! Once a teacher submits daily attendance, the entry locks immediately to prevent unauthorized edits by faculty. Only authorized School Admins retain override and delete permissions."
    },
    {
      q: "How does the Fee Chalan and Printable Result Card PDF engine work?",
      a: "Eduzenta includes built-in continuous multi-page PDF export engines. Admins can bulk generate roll-number-wise fee chalans and official printable student result cards (complete with auto grade calculations, signature blocks, and mandatory watermark footers) with one click."
    },
    {
      q: "How does the Notes & Directives broadcast system work?",
      a: "Super Admins can publish rich announcements with image attachments, video links, and priority directives to specific or all school admins with real-time unread badges and embedded media player previews."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <PublicNavbar />

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-28 overflow-hidden gradient-hero">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 text-xs font-bold mb-6 shadow-inner animate-pulse">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Next-Generation SaaS School Management System</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none text-white max-w-5xl mx-auto">
            Empowering Modern Education with <span className="gradient-text">Eduzenta OS</span>
          </h1>

          <p className="mt-6 text-base sm:text-xl text-slate-400 max-w-3xl mx-auto font-normal leading-relaxed">
            A comprehensive, multi-school management solution connecting Super Admins, School Leaders, and Faculty with automated fee chalans, strict attendance engines, and printable PDF result cards.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setCurrentView('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-3 transform hover:-translate-y-0.5"
            >
              <span>Access Unified Portal</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold text-sm transition-colors text-center"
            >
              Explore Platform Features
            </a>
          </div>

          {/* Interactive Metric Badges */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <h4 className="text-2xl font-black text-white">500+</h4>
              <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">Active Schools</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <h4 className="text-2xl font-black text-teal-400">120K+</h4>
              <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">Students Managed</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <h4 className="text-2xl font-black text-blue-400">99.9%</h4>
              <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">SaaS Uptime</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md">
              <h4 className="text-2xl font-black text-purple-400">100%</h4>
              <p className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wider">PDF Automation</p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT EDUZENTA SECTION */}
      <section id="about" className="py-20 bg-slate-900/50 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-teal-400">About Eduzenta SaaS</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white mt-2 leading-tight">
                Architected for Multi-School Operations & Complete Control
              </h2>
              <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                Eduzenta provides an enterprise-grade cloud ecosystem where Super Admins can license schools, manage billing, and enforce lockout rules, while School Admins oversee faculty, maintain student databases, generate fee chalans, and publish academic report cards.
              </p>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300"><strong>Single Universal Login:</strong> Intelligent role-based redirection without confusing selector toggles.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300"><strong>Strict Lock Attendance Rules:</strong> Teacher attendance locks immediately upon submission, protecting data integrity.</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300"><strong>Bulk Multi-Page PDF Engine:</strong> Print entire class result cards, fee chalans, or admit cards in a single file.</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl relative">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-blue-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Super Admin Control</h4>
                      <p className="text-[11px] text-slate-400">Account Lockout & Subscription Management</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800/60">Active</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <School className="w-6 h-6 text-teal-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">School Admin Portal</h4>
                      <p className="text-[11px] text-slate-400">Student Database & Fee Engine</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-950 px-2.5 py-1 rounded-full border border-blue-800/60">Active</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-6 h-6 text-purple-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">Faculty Workflows</h4>
                      <p className="text-[11px] text-slate-400">Marks Upload & Daily Attendance</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-950 px-2.5 py-1 rounded-full border border-purple-800/60">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES HIGHLIGHT SECTION */}
      <section id="features" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-black uppercase tracking-widest text-blue-400">Enterprise Capabilities</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">Designed for End-to-End Educational Excellence</h2>
          <p className="mt-3 text-slate-400 text-sm">Explore the six pillars powering Eduzenta's SaaS infrastructure.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all hover:shadow-xl hover:shadow-blue-500/5 group">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Super Admin Control</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Full developer oversight, revenue metrics, IP session logging, and instant account locking for pending payments.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 transition-all hover:shadow-xl hover:shadow-teal-500/5 group">
            <div className="w-12 h-12 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Fee Chalan Engine</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Dynamic fee inputs (Tuition, Exam, Transport, Late Fee, Discounts) with automated monthly bulk generation and printable 3-part PDFs.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/5 group">
            <div className="w-12 h-12 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Printable Result Cards</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Compliant layout with Eduzenta logo, editable school header, auto grade calculations, teacher remarks, and mandatory disclaimer watermark footers.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all hover:shadow-xl hover:shadow-amber-500/5 group">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Strict Attendance Engine</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Teacher daily attendance locks immediately after submission. School Admins hold exclusive override and deletion rights.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all hover:shadow-xl hover:shadow-emerald-500/5 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Admit Card Generator</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Single-click multi-page admit cards PDF export for the entire school or assigned teacher class groups.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all hover:shadow-xl hover:shadow-rose-500/5 group">
            <div className="w-12 h-12 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Universal Profile & Security</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Standardized profile configuration with OTP password reset verification across all user roles.
            </p>
          </div>
        </div>
      </section>

      {/* FAQS SECTION */}
      <section id="faqs" className="py-20 bg-slate-900/40 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-teal-400">Have Questions?</span>
            <h2 className="text-3xl font-black text-white mt-2">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm font-bold text-white hover:text-blue-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${activeFaq === idx ? 'rotate-180 text-blue-400' : ''}`} />
                </button>

                {activeFaq === idx && (
                  <div className="px-5 pb-5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <EduzentaLogo variant="dark" className="h-8" />
            <p className="text-xs text-slate-500 font-medium">
              Enterprise SaaS School OS © {new Date().getFullYear()} Eduzenta Inc. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400 mt-1">
              <span className="text-purple-400/90 font-semibold">Eduzenta — Developed by <strong className="text-purple-300">Hunzila Khan</strong></span>
              <span>•</span>
              <a href="mailto:eduzentawithkhan@gmail.com" className="hover:text-white transition-colors">eduzentawithkhan@gmail.com</a>
              <span>•</span>
              <a href="tel:+923330935652" className="hover:text-white transition-colors font-mono">+92 333 0935652</a>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400 font-semibold">
            <button onClick={() => setCurrentView('login')} className="hover:text-white transition-colors">Unified Login</button>
            <a href="#features" className="hover:text-white transition-colors">Platform Features</a>
            <a href="#about" className="hover:text-white transition-colors">Architecture</a>
            <a href="mailto:support@eduzenta.com" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
