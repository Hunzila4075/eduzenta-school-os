import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import EduzentaLogo from '../../components/common/EduzentaLogo';
import Modal from '../../components/common/Modal';
import { loginUser as loginUserApi } from '../../services/api';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';

export default function UnifiedLoginPage() {
  const { loginUser, setCurrentView, addToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  // Validation State
  const [inlineError, setInlineError] = useState('');
  const [emailHasError, setEmailHasError] = useState(false);

  // Forgot Password "Contact your admin" Modal State
  const [contactAdminModalOpen, setContactAdminModalOpen] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setInlineError('');
    setEmailHasError(false);

    if (!email.trim()) {
      setEmailHasError(true);
      setInlineError('User Name cannot be blank.');
      return;
    }
    if (!password) {
      setInlineError('Password field cannot be blank.');
      return;
    }

    setIsLoggingIn(true);

    try {
      const apiRes = await loginUserApi(email, password);
      if (apiRes?.token) {
        localStorage.setItem('token', apiRes.token);
        localStorage.setItem('eduzenta_token', apiRes.token);
        if (apiRes.user) {
          localStorage.setItem('eduzenta_user', JSON.stringify(apiRes.user));
        }
      }
    } catch (err) {
      console.warn('[LOGIN API WARNING] Remote backend auth error:', err.message);
    } finally {
      setIsLoggingIn(false);
    }

    const result = loginUser(email, password);
    if (!result.success && !result.locked) {
      setEmailHasError(true);
      setInlineError(result.error || 'Invalid Credentials. Please check assigned email and password.');
    }
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    addToast('Password Reset', 'Contact your admin to reset your credentials.', 'info');
    setContactAdminModalOpen(true);
  };

  return (
    <div className="min-h-screen qobe-login-backdrop flex flex-col justify-center items-center p-4 relative font-sans select-none">
      {/* Top Back Link */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => setCurrentView('landing')}
          className="text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-900/60 px-3.5 py-1.5 rounded-xl backdrop-blur-md border border-slate-700/60 shadow-sm min-h-[44px]"
        >
          ← Return to Public Website
        </button>
      </div>

      {/* QOBE Faculty Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 mx-auto">
        {/* Card Header matching exact spec */}
        <div className="flex flex-col items-center text-center mb-6">
          <EduzentaLogo variant="brand" className="h-10 mb-3" />
          <h2 className="text-2xl font-black text-[#2d1a4e] tracking-tight">Faculty Login</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Please fill out the following fields to login:
          </p>
        </div>

        {/* Real-time Inline Validation Warning */}
        {inlineError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{inlineError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {/* User Name / Email Input with red border when empty */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1"
            >
              User Name / Email <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
                name="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={e => { setEmail(e.target.value); setEmailHasError(false); setInlineError(''); }}
                placeholder="Enter your assigned email / username"
                className={`w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 rounded-xl border transition-all font-medium text-slate-900 focus:outline-none ${
                  emailHasError ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-300 focus:border-[#5A3193] focus:ring-2 focus:ring-purple-500/20'
                }`}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1"
            >
              Password <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:border-[#5A3193] focus:ring-2 focus:ring-purple-500/20 transition-all font-medium text-slate-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1 min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs py-1">
            <label htmlFor="login-remember" className="flex items-center gap-2 cursor-pointer text-slate-700 select-none">
              <input
                id="login-remember"
                name="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#5A3193] focus:ring-[#5A3193]"
              />
              <span className="font-semibold">Remember me</span>
            </label>
          </div>

          {/* Action Button: Solid QOBE Purple */}
          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full py-3 px-4 rounded-xl qobe-btn-primary text-xs font-black tracking-wide shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 min-h-[44px]"
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>{isLoggingIn ? 'Authenticating...' : 'Login'}</span>
            {!isLoggingIn && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Helper Link: "If you forgot your password you can reset it." */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs font-semibold">
          <button
            onClick={handleForgotPasswordClick}
            className="text-slate-500 hover:text-[#5A3193] transition-colors min-h-[36px]"
          >
            If you forgot your password you can reset it.
          </button>
        </div>
      </div>

      {/* Forgot Password Inline Modal displaying "Contact your admin" */}
      <Modal
        isOpen={contactAdminModalOpen}
        onClose={() => setContactAdminModalOpen(false)}
        title="Reset Password Instructions"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-purple-50 border border-purple-200 text-[#5A3193] flex items-center justify-center">
            <HelpCircle className="w-6 h-6" />
          </div>

          <h3 className="text-base font-black text-slate-900">Contact your admin</h3>

          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            Password resets for Eduzenta faculty and staff accounts are handled directly by your School Administrator or System Owner. Please contact your institution administrator to obtain your updated security credentials.
          </p>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => setContactAdminModalOpen(false)}
              className="px-6 py-2.5 rounded-xl qobe-btn-primary text-xs font-bold shadow-sm min-h-[44px]"
            >
              OK, Got It
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
