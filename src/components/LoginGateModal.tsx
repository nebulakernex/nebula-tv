import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { AppSettings } from '../types';

interface LoginGateModalProps {
  isOpen: boolean;
  onLogin: (email: string) => void;
  onGuestAccess: () => void;
  settings: AppSettings;
}

export const LoginGateModal: React.FC<LoginGateModalProps> = ({
  isOpen,
  onLogin,
  onGuestAccess,
  settings
}) => {
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      onLogin(email.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 rounded-2xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-xl shadow-[#7000FF]/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-display">
            {settings.auth.title || 'Welcome back'}
          </h2>
          <p className="text-xs text-zinc-400 font-normal">
            {settings.auth.subtitle || 'Sign in to keep watching and synchronize your CloudStream providers.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#7000FF]">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="USER@NEBULA.IO"
                className="w-full h-11 pl-10 pr-3.5 rounded-lg bg-[#050505] border border-white/10 text-xs font-mono uppercase text-white placeholder-zinc-600 focus:outline-none focus:border-[#7000FF]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full h-12 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#7000FF]/30 transition-all"
          >
            <span>Continue to Nebula Streams</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {settings.auth.allowGuest && (
          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={onGuestAccess}
              className="w-full h-10 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-bold uppercase tracking-wider text-xs transition-colors"
            >
              Continue as Guest
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
