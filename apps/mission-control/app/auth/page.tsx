'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { createBrowserClient } from '@agentcy/supabase';
import { Button } from '@agentcy/ui';
import { Mail, Lock, ArrowRight, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';

function ErrorMessage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');

    if (error || errorCode) {
      if (errorCode === 'otp_expired') {
        setMessage('This magic link has expired. Please request a new link.');
      } else if (errorDescription) {
        setMessage(decodeURIComponent(errorDescription).replace(/\+/g, ' '));
      } else {
        setMessage('Authentication failed. Please try again.');
      }
    }
  }, [searchParams]);

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2.5 p-3.5 bg-red-950/40 border border-red-500/30 rounded-sm text-xs text-red-200 mb-6 font-mono"
    >
      <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
      <div>
        <span className="font-bold uppercase tracking-wider block mb-0.5">SECURE_AUTH_ERROR:</span>
        {message}
      </div>
    </motion.div>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toISOString().replace('T', ' ').split('.')[0] + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-[9px] tracking-widest text-[#5a554f]">{time}</span>;
}

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const move = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.auth-header',
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.1 }
      );
      gsap.fromTo('.auth-card',
        { scale: 0.96, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1.2, ease: 'power3.out', delay: 0.2 }
      );
      gsap.fromTo('.auth-element',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, ease: 'power2.out', delay: 0.4 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  function getPasswordStrength(pw: string): { score: number; label: string; color: string; classes: string[] } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;

    const labels = ['INSUFFICIENT', 'WEAK', 'FAIR', 'GOOD', 'STRONG'];
    const colors = ['text-red-500', 'text-red-400', 'text-amber-500', 'text-[#e85d04]', 'text-emerald-500'];
    const barClasses = [
      'bg-red-500',
      'bg-red-400',
      'bg-amber-500',
      'bg-[#e85d04]',
      'bg-emerald-500',
    ];

    const currentBarClasses = Array.from({ length: 4 }, (_, idx) => {
      if (idx < score) return barClasses[score];
      return 'bg-[#1a1a1a]';
    });

    return { score, label: labels[score], color: colors[score], classes: currentBarClasses };
  }

  const strength = getPasswordStrength(password);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsSuccess(false);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (error) {
        setMessage(error.message);
      } else {
        setIsSuccess(true);
        setMessage('VERIFICATION_REQUIRED: Check your email for the confirmation link.');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage(error.message);
      } else {
        router.push('/dashboard');
      }
    }

    setIsLoading(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#0a0a0a] text-[#f5f0e8] overflow-hidden flex flex-col items-center justify-center px-4 selection:bg-[#e85d04] selection:text-white"
    >
      {/* Background Interactive Radial Gradient */}
      <div
        className="pointer-events-none fixed z-0 w-[500px] h-[500px] rounded-full opacity-20 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle, rgba(232,93,4,0.12) 0%, transparent 70%)',
          transform: `translate(${cursorPos.x - 250}px, ${cursorPos.y - 250}px)`,
          transition: 'transform 0.2s ease-out',
        }}
      />

      {/* Static Radial Gradients for glow */}
      <div
        className="absolute top-1/4 left-1/3 w-[600px] h-[600px] rounded-full opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232,93,4,0.2) 0%, transparent 60%)',
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(157,2,8,0.15) 0%, transparent 60%)',
          animation: 'pulse 10s ease-in-out infinite 2s',
        }}
      />

      {/* SVG Noise & Scanline overlays */}
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-10 opacity-[0.025]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
        }}
      />

      <div className="relative z-20 w-full max-w-[420px] flex flex-col gap-6">
        {/* Header Metadata */}
        <div className="auth-header flex items-center justify-between text-[9px] tracking-[0.25em] text-[#5a554f] uppercase border-b border-[#1a1a1a] pb-3">
          <span className="flex items-center gap-1.5 font-mono text-[#e85d04]">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-[#e85d04] animate-ping' : 'bg-[#e85d04]'}`} />
            GATEWAY_SECURE
          </span>
          <LiveClock />
        </div>

        {/* Auth Panel Card */}
        <div
          ref={cardRef}
          className="auth-card bg-[#0d0d0d]/80 backdrop-blur-xl border border-[#1a1a1a] hover:border-[#e85d04]/20 transition-all duration-700 p-8 rounded-sm shadow-2xl relative"
        >
          {/* Card Accent Top Line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#e85d04] to-transparent opacity-60" />

          {/* Logo & Subtitle */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 bg-[#e85d04] rounded-sm hover:rotate-45 transition-transform duration-500 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-lg font-black tracking-[0.25em] uppercase text-[#f5f0e8]">
              Agentcy Control
            </h1>
            <p className="text-xs tracking-wider text-[#5a554f] uppercase font-mono mt-1">
              Command Access Gateway
            </p>
          </div>

          {/* Segmented Auth Selector */}
          <div className="auth-element bg-[#070707] border border-[#1a1a1a] p-1 rounded-sm mb-6 flex relative">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setMessage('');
              }}
              className={`relative z-10 w-1/2 py-2 text-[10px] tracking-[0.2em] uppercase font-bold text-center transition-colors duration-300 ${!isSignUp ? 'text-white' : 'text-[#5a554f]'}`}
            >
              Authorize
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setMessage('');
              }}
              className={`relative z-10 w-1/2 py-2 text-[10px] tracking-[0.2em] uppercase font-bold text-center transition-colors duration-300 ${isSignUp ? 'text-white' : 'text-[#5a554f]'}`}
            >
              Register
            </button>
            <motion.div
              layoutId="activeTabGlow"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-[#141414] border border-[#2a2a2a] rounded-sm"
              style={{
                x: isSignUp ? '100%' : '0%',
              }}
            />
          </div>

          <Suspense fallback={null}>
            <ErrorMessage />
          </Suspense>

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="auth-element">
              <label className="block text-[9px] tracking-[0.2em] uppercase text-[#8a8279] mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-[#5a554f]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#070707] text-[#f5f0e8] font-mono text-xs pl-10 pr-4 py-3 border border-[#1a1a1a] focus:border-[#e85d04] focus:ring-1 focus:ring-[#e85d04]/20 outline-none transition-all rounded-sm placeholder-[#333]"
                  placeholder="identity@agency.net"
                />
              </div>
            </div>

            <div className="auth-element">
              <label className="block text-[9px] tracking-[0.2em] uppercase text-[#8a8279] mb-1.5 font-mono">
                Security Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-[#5a554f]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#070707] text-[#f5f0e8] font-mono text-xs pl-10 pr-4 py-3 border border-[#1a1a1a] focus:border-[#e85d04] focus:ring-1 focus:ring-[#e85d04]/20 outline-none transition-all rounded-sm placeholder-[#333]"
                  placeholder="••••••••"
                />
              </div>

              {/* Password Strength Ticks */}
              {isSignUp && password.length > 0 && (
                <div className="mt-3 font-mono text-[9px]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[#5a554f] tracking-wider uppercase">Complexity Matrix:</span>
                    <span className={`font-bold ${strength.color} tracking-widest`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 mb-2">
                    {strength.classes.map((cls, idx) => (
                      <div key={idx} className={`h-1 transition-all duration-300 ${cls}`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[#5a554f]">
                    <span className={`transition-colors duration-300 ${password.length >= 8 ? 'text-emerald-500' : ''}`}>
                      ● 8+ Chars
                    </span>
                    <span className={`transition-colors duration-300 ${/[A-Z]/.test(password) ? 'text-emerald-500' : ''}`}>
                      ● Upper
                    </span>
                    <span className={`transition-colors duration-300 ${/[0-9]/.test(password) ? 'text-emerald-500' : ''}`}>
                      ● Num
                    </span>
                    <span className={`transition-colors duration-300 ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-500' : ''}`}>
                      ● Symbol
                    </span>
                  </div>
                </div>
              )}
            </div>

            {message && !message.includes('SECURE_AUTH_ERROR') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`auth-element flex items-start gap-2.5 p-3.5 border rounded-sm text-xs font-mono ${
                  isSuccess
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/30 text-red-200'
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold uppercase tracking-wider block mb-0.5">
                    {isSuccess ? 'SYSTEM_ALERT:' : 'GATEWAY_ERROR:'}
                  </span>
                  {message}
                </div>
              </motion.div>
            )}

            {/* Standard Button Redesigned */}
            <div className="auth-element pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#e85d04] hover:bg-[#ff6b1a] text-white py-3.5 text-[10px] tracking-[0.25em] uppercase font-bold rounded-sm border-0 transition-colors duration-300 flex items-center justify-center gap-2 group cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="animate-spin h-3.5 w-3.5" />
                ) : (
                  <>
                    {isSignUp ? 'Register Account' : 'Authorize Entrance'}
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="auth-element my-6 flex items-center justify-center gap-3">
            <div className="h-px bg-[#1a1a1a] flex-grow" />
            <span className="font-mono text-[8px] tracking-[0.25em] text-[#333] uppercase">
              OR_FEDERATED
            </span>
            <div className="h-px bg-[#1a1a1a] flex-grow" />
          </div>

          {/* Google SSO Button */}
          <div className="auth-element">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-[#070707] hover:bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#f5f0e8] py-3 text-[10px] tracking-[0.2em] uppercase font-bold rounded-sm transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {/* Modern Monochrome Google SVG Icon */}
              <svg className="h-3.5 w-3.5" viewBox="0 0 488 512" fill="currentColor">
                <path d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z" />
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Telemetry Status Bar */}
        <div className="auth-header font-mono text-[8px] tracking-[0.2em] text-[#333] uppercase flex justify-between px-2">
          <span>PORT: 443 SECURE</span>
          <span>ENC: AES-256-GCM</span>
          <span>BYP: DENIED</span>
        </div>
      </div>
    </div>
  );
}
