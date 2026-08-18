import React from 'react';
import { CreditCard, Check, Sparkles, X, ExternalLink } from 'lucide-react';
import { AppSettings } from '../types';

interface BillingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

export const BillingDrawer: React.FC<BillingDrawerProps> = ({
  isOpen,
  onClose,
  settings
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0a0a] border-l border-white/15 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right">
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7000FF] border border-white/20 flex items-center justify-center text-white font-black shadow-lg shadow-[#7000FF]/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-base text-white font-display">{settings.billing.planName || 'Nebula Plus'}</h3>
              <p className="text-xs text-zinc-400 font-normal">Subscription & Add-ons</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pricing card */}
        <div className="p-6 rounded-2xl bg-[#050505] border border-[#7000FF]/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#7000FF] uppercase tracking-widest">Premium Tier</span>
            <Sparkles className="w-4 h-4 text-[#7000FF]" />
          </div>

          <div>
            <div className="text-3xl font-black text-white font-display uppercase tracking-tight">{settings.billing.priceLabel || '$0 / month'}</div>
            <p className="text-xs text-zinc-400 mt-1">Unlimited 4K streaming, multi-provider synchronization & offline downloads.</p>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-white/10 text-xs text-zinc-300">
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span>Full Hexated CloudStream extensions index</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span>Real-time background auto-sync</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-green-400" />
              <span>Hardware-accelerated 1080p/4K playback</span>
            </div>
          </div>

          {settings.billing.checkoutUrl ? (
            <a
              href={settings.billing.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 rounded-lg bg-[#7000FF] hover:bg-[#8222FF] text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[#7000FF]/30 transition-all"
            >
              <span>Open Checkout Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          ) : (
            <div className="p-3 rounded-lg bg-white/5 text-center text-xs text-zinc-400 font-mono">
              Checkout URL not configured in Admin panel.
            </div>
          )}
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          {settings.billing.note || 'Billing module is active and ready for payment provider connection.'}
        </p>
      </div>

      <div className="pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
