'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@agentcy/supabase';
import { Button } from '@agentcy/ui';
import { Rocket, Mail, Lock, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];
    return { score, label: labels[score], color: colors[score] };
  }

  const strength = isSignUp ? getPasswordStrength(password) : null;

  const router = useRouter();
  const supabase = createBrowserClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      });
      if (error) setMessage(error.message);
      else setMessage('Check your email for the confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setMessage(error.message);
      else {
        router.push('/dashboard');
      }
    }

    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-4">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Agentcy Control</h1>
          <p className="text-slate-500 mt-1">Mission control for your apps and clients</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            {isSignUp ? 'Create your agency' : 'Sign in to your agency'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                  placeholder="you@agency.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
              {isSignUp && strength && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-500">Password strength</span>
                    <span className={`text-xs font-medium ${strength.score >= 3 ? 'text-emerald-600' : strength.score >= 2 ? 'text-amber-600' : 'text-red-600'}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${strength.color}`}
                      style={{ width: `${(strength.score / 4) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-1.5">
                    <span className={`text-[10px] ${password.length >= 8 ? 'text-emerald-600' : 'text-slate-400'}`}>8+ chars</span>
                    <span className={`text-[10px] ${/[A-Z]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>Uppercase</span>
                    <span className={`text-[10px] ${/[0-9]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>Number</span>
                    <span className={`text-[10px] ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600' : 'text-slate-400'}`}>Symbol</span>
                  </div>
                </div>
              )}
            </div>

            {message && (
              <div className={`text-sm ${message.includes('Check') ? 'text-emerald-600' : 'text-red-600'}`}>
                {message}
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={isLoading}>
              {isSignUp ? 'Create Account' : 'Sign In'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Get started"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
