  'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

const STATUS_STEPS = [
  { value: 'pending', label: 'Order Placed', icon: 'clipboard', color: 'text-yellow-400', bg: 'bg-yellow-400', border: 'border-yellow-400', glow: 'shadow-yellow-400/40' },
  { value: 'confirmed', label: 'Confirmed', icon: 'check-circle', color: 'text-blue-400', bg: 'bg-blue-400', border: 'border-blue-400', glow: 'shadow-blue-400/40' },
  { value: 'in_production', label: 'In Production', icon: 'factory', color: 'text-orange-400', bg: 'bg-orange-400', border: 'border-orange-400', glow: 'shadow-orange-400/40' },
  { value: 'shipped', label: 'Shipped', icon: 'truck', color: 'text-purple-400', bg: 'bg-purple-400', border: 'border-purple-400', glow: 'shadow-purple-400/40' },
  { value: 'delivered', label: 'Delivered', icon: 'flag', color: 'text-green-400', bg: 'bg-green-400', border: 'border-green-400', glow: 'shadow-green-400/40' },
];

const MILESTONE_DETAILS: Record<string, { description: string; duration: string }> = {
  pending: { description: 'Your order has been received and is awaiting confirmation by our team.', duration: '1-2 business days' },
  confirmed: { description: 'Order confirmed! Your deposit has been verified and production slot reserved.', duration: '1-3 business days' },
  in_production: { description: 'Your Tesla is being built at the factory with your selected configuration.', duration: '2-6 weeks' },
  shipped: { description: 'Your vehicle is on its way! Track the delivery truck in real-time.', duration: '3-14 business days' },
  delivered: { description: 'Your Tesla has arrived at the delivery address. Enjoy the ride!', duration: 'Completed' },
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  in_production: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  shipped: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/15 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
};

const COLOR_HEX: Record<string, string> = {
  pearl_white: '#F5F5F5', solid_black: '#1A1A1A', midnight_silver: '#6E7681',
  deep_blue: '#1E3A5F', red_multi_coat: '#CC0000', ultra_red: '#B71C1C',
  quick_silver: '#9CA3AF', blue_multi_coat: '#3B82F6',
};
const COLOR_LABELS: Record<string, string> = {
  pearl_white: 'Pearl White', solid_black: 'Solid Black', midnight_silver: 'Midnight Silver',
  deep_blue: 'Deep Blue', red_multi_coat: 'Red Multi-Coat', ultra_red: 'Ultra Red',
  quick_silver: 'Quick Silver', blue_multi_coat: 'Blue Multi-Coat',
};

const STATUS_ICON_SVG: Record<string, string> = {
  clipboard: '<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>',
  'check-circle': '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  factory: '<path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><rect x="9" y="12" width="6" height="8"/>',
  truck: '<rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
};

export default function TrackingPage() {
  const { token } = useAuthStore();
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingData, setTrackingData] = useState<any>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const fetchTracking = useCallback(async (code?: string) => {
    const num = (code || orderNumber).trim();
    if (!num) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vehicles/track-by-code?orderNumber=' + encodeURIComponent(num), {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      const json = await res.json();
      if (json.success) { setTrackingData(json.data); setElapsed(0); }
      else { setError(json.error?.message || 'Tracking failed'); setTrackingData(null); }
    } catch { setError('Network error. Please try again.'); setTrackingData(null); }
    setLoading(false);
  }, [orderNumber, token]);

  // Auto-detect order number from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) { setOrderNumber(code); fetchTracking(code); }
  }, []);

  const handleTrack = () => fetchTracking();
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleTrack(); };

  const handleCopyLink = () => {
    if (!order) return;
    const url = window.location.origin + '/tracking?code=' + order.orderNumber;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const getDaysUntilDelivery = () => {
    if (!tracking?.estimatedDelivery) return null;
    const diff = new Date(tracking.estimatedDelivery).getTime() - Date.now();
    if (diff <= 0) return 0;
    return Math.ceil(diff / 86400000);
  };

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh || !orderNumber.trim()) return;
    const interval = setInterval(() => fetchTracking(), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchTracking, orderNumber]);

  // Animate progress bar
  useEffect(() => {
    if (!trackingData?.tracking?.progress) { setAnimatedProgress(0); return; }
    const target = trackingData.tracking.progress;
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedProgress(prev => prev + (target - prev) * eased);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [trackingData?.tracking?.progress]);

  // Elapsed time counter since last tracking fetch
  useEffect(() => {
    if (!trackingData || !autoRefresh) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [trackingData, autoRefresh]);

  const formatElapsed = (s: number) => {
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
  };

  const order = trackingData?.order;
  const tracking = trackingData?.tracking;

  const currentMilestone = MILESTONE_DETAILS[order?.status] || null;

  return (
    <div className="space-y-5 pb-8">
      {/* Search Card */}
      <div className="bg-tesla-card border border-tesla-border rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#CC0000]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#CC0000]/10 border border-[#CC0000]/20 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-semibold">Track Your Vehicle</h2>
            <p className="text-gray-500 text-xs">Enter your order number for real-time delivery status</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. TP-2025-XXXXXXX"
            className="flex-1 bg-[#1a1a1a] border border-tesla-border rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors font-mono"
          />
          <button
            onClick={handleTrack}
            disabled={loading || !orderNumber.trim()}
            className="bg-[#CC0000] hover:bg-[#ff1a1a] disabled:opacity-50 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all active:scale-95 hover:shadow-lg hover:shadow-[#CC0000]/20"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" /></svg>
            ) : 'Track'}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!trackingData && !loading && !error && (
        <div className="bg-tesla-card border border-tesla-border rounded-2xl p-12 flex flex-col items-center justify-center text-center" style={{ animation: 'fadeSlideUp 0.6s ease-out' }}>
          <div className="w-20 h-20 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/20 flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              <path d="M11 8v6" /><path d="M8 11h6" />
            </svg>
          </div>
          <h3 className="text-white font-semibold mb-2">Track Your Tesla</h3>
          <p className="text-gray-500 text-sm max-w-sm leading-relaxed">Enter your order number above to see real-time delivery updates, production progress, and estimated arrival.</p>
          <div className="flex items-center gap-4 mt-6 text-gray-600 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400" /><span>Order Placed</span></div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-orange-400" /><span>In Production</span></div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-700"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-green-400" /><span>Delivered</span></div>
          </div>
        </div>
      )}

      {/* Loading State with Tesla Logo */}
      {loading && (
        <div className="bg-tesla-card border border-tesla-border rounded-2xl p-12 flex flex-col items-center justify-center" style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-full border-2 border-[#CC0000]/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5.362l2.475-3.026s4.245.09 8.471 2.054c-1.082 1.636-3.231 2.438-3.231 2.438-.146-1.439-1.154-1.79-4.354-1.79L12 24 8.619 5.034c-3.18 0-4.188.354-4.335 1.792 0 0-2.146-.795-3.229-2.43C5.28 2.431 9.525 2.34 9.525 2.34L12 5.362h-.004.004zm0-3.899c3.415-.03 7.326.528 11.328 2.28.535-.968.672-1.395.672-1.395C19.625.612 15.528.015 12 0 8.472.015 4.375.61 0 2.349c0 0 .195.525.672 1.396C4.674 1.989 8.585 1.435 12 1.46V1.463z" fill="#CC0000" />
              </svg>
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-transparent border-t-[#CC0000] animate-spin" style={{ animationDuration: '1.2s' }} />
          </div>
          <p className="text-gray-400 text-sm">Looking up your order...</p>
        </div>
      )}

      {/* Tracking Results */}
      {trackingData && order && tracking && (
        <div className="space-y-4" style={{ animation: 'fadeSlideUp 0.6s ease-out' }}>
          {/* Header Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-gray-400 text-xs">
              Live tracking for <span className="text-white font-mono font-medium">#{order.orderNumber}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border bg-white/5 border-tesla-border text-gray-400 hover:text-white hover:border-white/20 transition-all duration-200"
              >
                {copied ? (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>Copied!</>
                ) : (
                  <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>Share</>
                )}
              </button>
              <button
                onClick={() => setAutoRefresh(r => !r)}
                className={
                  'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 ' +
                  (autoRefresh
                    ? 'bg-green-500/10 border-green-500/30 text-green-400 shadow-lg shadow-green-500/5'
                    : 'bg-white/5 border-tesla-border text-gray-400 hover:text-white hover:border-white/20')
                }
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
                {autoRefresh ? 'Live ON' : 'Live OFF'}
              </button>
            </div>
          </div>

          {/* Vehicle Summary Card */}
          <div className="bg-tesla-card border border-tesla-border rounded-2xl overflow-hidden relative group">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-[#CC0000]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#CC0000]/10 transition-all duration-700" />
            <div className="flex items-center gap-4 p-5 relative">
              <div className="w-32 h-22 rounded-xl overflow-hidden border border-tesla-border bg-[#1a1a1a] shrink-0 transition-transform duration-500 group-hover:scale-[1.03]">
                {order.vehicle?.imageUrl ? (
                  <img src={order.vehicle.imageUrl} alt={order.vehicle.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">No image</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold">{order.vehicle?.name || 'Vehicle'}</h3>
                  <span className={"text-xs font-medium px-2 py-0.5 rounded-full border " + (STATUS_COLORS[order.status] || 'bg-gray-700 text-gray-300')}>
                    {order.status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-[11px]">Color:</span>
                    <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: COLOR_HEX[order.selectedColor] || '#888' }} />
                    <span className="text-gray-300 text-[11px]">{COLOR_LABELS[order.selectedColor] || order.selectedColor}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-[11px]">Interior:</span>
                    <span className="text-gray-300 text-[11px]">{order.selectedInterior}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-[11px]">Total:</span>
                    <span className="text-white text-[11px] font-medium">${Number(order.totalPrice).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 text-[11px]">Deposit:</span>
                    <span className={"text-[11px] font-medium " + (order.depositPaid ? 'text-green-400' : 'text-yellow-400')}>
                      ${Number(order.depositAmount).toLocaleString()} {order.depositPaid ? '(Paid)' : '(Unpaid)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Milestone Detail Card (NEW) */}
          {currentMilestone && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="bg-gradient-to-r from-[#CC0000]/8 via-[#CC0000]/4 to-transparent border border-[#CC0000]/15 rounded-2xl p-5 relative overflow-hidden" style={{ animation: 'fadeSlideUp 0.8s ease-out' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#CC0000]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative flex items-start gap-4">
                <div className={"w-12 h-12 rounded-xl flex items-center justify-center shrink-0 " + (STATUS_COLORS[order.status]?.split(' ')[0] || 'bg-gray-700')}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: STATUS_ICON_SVG[STATUS_STEPS.find(s => s.value === order.status)?.icon || 'clipboard'] || '' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-semibold text-sm">{currentMilestone.description}</h4>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-400 text-xs">Typical duration: <span className="text-gray-300 font-medium">{currentMilestone.duration}</span></span>
                    <span className="text-gray-600">|</span>
                    <span className="text-gray-400 text-xs">Step {tracking.currentStep + 1} of 5</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Route Progress Card */}
          <div className="bg-tesla-card border border-tesla-border rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-semibold text-sm">Delivery Route</h3>
              <span className="text-gray-500 text-xs font-mono">{Math.round(animatedProgress)}%</span>
            </div>
            <div className="relative mt-2">
              <div className="absolute top-5 left-6 right-6 h-1.5 bg-white/5 rounded-full z-0" />
              <div
                className={"absolute top-5 left-6 h-1.5 rounded-full z-0 transition-all duration-[1500ms] ease-out " +
                  (tracking.isCancelled ? 'bg-red-500/40' : 'bg-gradient-to-r from-[#CC0000] via-[#ff3333] to-[#ff6666]')}
                style={{
                  width: (tracking.isCancelled ? 0 : animatedProgress) + '%',
                  boxShadow: tracking.isCancelled ? 'none' : '0 0 12px rgba(204,0,0,0.4), 0 0 24px rgba(204,0,0,0.15)',
                }}
              />
              <div className="relative flex justify-between z-10">
                {STATUS_STEPS.map((step, idx) => {
                  const isComplete = idx <= tracking.currentStep && !tracking.isCancelled;
                  const isCurrent = step.value === order.status;
                  const stage = tracking.routeStages?.[idx];
                  return (
                    <div key={step.value} className="flex flex-col items-center" style={{ flex: 1 }}>
                      <div
                        className={
                          'relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-700 ' +
                          (isComplete
                            ? step.bg + ' ' + step.border + ' ' + step.glow + ' shadow-lg scale-110'
                            : isCurrent && tracking.isCancelled
                              ? 'bg-red-500/20 border-red-500/50'
                              : 'bg-[#1a1a1a] border-tesla-border')
                        }
                      >
                        {isComplete ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={isCurrent ? step.color : 'text-gray-600'} dangerouslySetInnerHTML={{ __html: STATUS_ICON_SVG[step.icon] || '' }} />
                        )}
                        {isCurrent && !tracking.isCancelled && (
                          <span className={"absolute inset-[-4px] rounded-full border-2 " + step.border + ' opacity-40'} style={{ animation: 'pingPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite' }} />
                        )}
                      </div>
                      <span className={"text-[10px] mt-2.5 text-center font-medium transition-colors duration-500 " + (isCurrent ? 'text-white' : isComplete ? 'text-gray-400' : 'text-gray-600')}>
                        {step.label}
                      </span>
                      {stage && (isComplete || isCurrent) && (
                        <span className="text-[9px] text-gray-500 text-center mt-0.5 max-w-[80px] truncate">{stage.location}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Truck animation for shipped status */}
            {!tracking.isCancelled && tracking.currentStep >= 3 && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center gap-2 bg-white/5 border border-tesla-border rounded-full px-4 py-2" style={{ animation: 'floatBounce 3s ease-in-out infinite' }}>
                  <svg width="24" height="16" viewBox="0 0 80 40" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#CC0000]">
                    <rect x="2" y="14" width="38" height="18" rx="4" /><path d="M42 14h10l6-6 7 5v12" /><circle cx="16" cy="36" r="5" /><circle cx="56" cy="36" r="5" />
                  </svg>
                  <span className="text-xs text-gray-300 font-medium">{tracking.currentLocation || 'En Route'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Details Grid - Enhanced */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-tesla-card border border-tesla-border rounded-xl p-4 transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 8h20" /></svg>
                <span className="text-gray-500 text-[10px] font-medium">VIN Number</span>
              </div>
              <p className="text-white text-sm font-medium font-mono">{tracking.vin || <span className="text-gray-600 text-xs">Assigned during production</span>}</p>
            </div>
            <div className="bg-tesla-card border border-tesla-border rounded-xl p-4 transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                <span className="text-gray-500 text-[10px] font-medium">Current Location</span>
              </div>
              <p className="text-white text-sm font-medium">{tracking.currentLocation || <span className="text-gray-600 text-xs">Pending</span>}</p>
            </div>
            <div className="bg-tesla-card border border-tesla-border rounded-xl p-4 transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /></svg>
                <span className="text-gray-500 text-[10px] font-medium">Est. Delivery</span>
              </div>
              <p className="text-white text-sm font-medium">
                {tracking.estimatedDelivery ? new Date(tracking.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : <span className="text-gray-600 text-xs">Calculating...</span>}
              </p>
            </div>
            <div className="bg-tesla-card border border-tesla-border rounded-xl p-4 transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
                <span className="text-gray-500 text-[10px] font-medium">Progress</span>
              </div>
              <p className="text-white text-sm font-medium">{Math.round(animatedProgress)}%</p>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={"h-full rounded-full transition-all duration-[1500ms] ease-out " + (tracking.isCancelled ? 'bg-red-500/50' : 'bg-[#CC0000]')}
                  style={{ width: animatedProgress + '%', boxShadow: '0 0 8px rgba(204,0,0,0.3)' }}
                />
              </div>
            </div>
          </div>

          {/* Order Configuration Summary (NEW) */}
          {(order.trackingInfo?.addons || order.trackingInfo?.addonsTotal) && (
            <div className="bg-tesla-card border border-tesla-border rounded-xl p-4">
              <h4 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">Your Configuration</h4>
              <div className="flex flex-wrap gap-2">
                {order.trackingInfo.addons?.map((addon: string) => (
                  <span key={addon} className="text-[10px] px-2.5 py-1 rounded-full bg-white/5 border border-tesla-border text-gray-300 capitalize">
                    {addon.replace(/_/g, ' ')}
                  </span>
                ))}
                {order.trackingInfo.addonsTotal > 0 && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/20 text-[#CC0000] font-medium">
                    +${Number(order.trackingInfo.addonsTotal).toLocaleString()} in upgrades
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ETA Countdown - Enhanced */}
          {getDaysUntilDelivery() !== null && !tracking.isCancelled && order.status !== 'delivered' && (
            <div className="bg-gradient-to-r from-[#CC0000]/10 via-[#CC0000]/5 to-transparent border border-[#CC0000]/20 rounded-xl px-5 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#CC0000]/15 flex items-center justify-center shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Estimated Delivery</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {tracking.estimatedDelivery ? new Date(tracking.estimatedDelivery).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Calculating...'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#CC0000] text-2xl font-bold">{getDaysUntilDelivery()}</p>
                <p className="text-gray-500 text-[10px]">days remaining</p>
              </div>
            </div>
          )}

          {/* Delivered Banner */}
          {order.status === 'delivered' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              </div>
              <div>
                <p className="text-green-400 text-sm font-medium">Delivered!</p>
                <p className="text-gray-500 text-xs">Your {order.vehicle?.name || 'vehicle'} has been delivered. Enjoy!</p>
              </div>
            </div>
          )}

          {/* Factory Info */}
          {tracking.factoryLocation && tracking.currentStep >= 2 && (
            <div className="bg-tesla-card border border-tesla-border rounded-xl p-4 transition-all duration-300 hover:border-white/10">
              <div className="flex items-center gap-2 mb-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500"><path d="M2 20h20" /><path d="M5 20V8l7-5 7 5v12" /><rect x="9" y="12" width="6" height="8" /></svg>
                <span className="text-gray-500 text-[10px] font-medium">Factory / Origin</span>
              </div>
              <p className="text-white text-sm font-medium">{tracking.factoryLocation}</p>
            </div>
          )}

          {/* Shipping Route Banner */}
          {tracking.shippingDirection && !tracking.isCancelled && tracking.currentStep >= 3 && (
            <div className="bg-gradient-to-r from-[#CC0000]/10 via-[#CC0000]/5 to-transparent border border-[#CC0000]/20 rounded-xl px-5 py-4 flex items-center gap-4 overflow-hidden relative">
              <div className="w-10 h-10 rounded-full bg-[#CC0000]/20 flex items-center justify-center shrink-0" style={{ animation: 'floatBounce 4s ease-in-out infinite' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="16 12 12 8 8 12" /><line x1="12" y1="16" x2="12" y2="8" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Shipping Route</p>
                <p className="text-gray-400 text-xs mt-0.5">{tracking.shippingDirection}</p>
              </div>
              <div className="text-right relative z-10">
                <p className="text-gray-500 text-[10px]">Current Location</p>
                <p className="text-white text-xs font-medium">{tracking.currentLocation || 'Updating...'}</p>
              </div>
            </div>
          )}

          {/* Cancelled Banner */}
          {tracking.isCancelled && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 flex items-center gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              <div>
                <p className="text-red-400 text-sm font-medium">Order Cancelled</p>
                <p className="text-gray-500 text-xs">This order has been cancelled. Contact support for assistance.</p>
              </div>
            </div>
          )}

          {/* Activity Timeline - Enhanced */}
          {tracking.timeline && tracking.timeline.length > 0 && (
            <div className="bg-tesla-card border border-tesla-border rounded-2xl p-6">
              <h3 className="text-white font-semibold text-sm mb-4">Activity Timeline</h3>
              <div className="space-y-0">
                {tracking.timeline.map((entry: any, idx: number) => {
                  const isLatest = idx === 0;
                  const stepInfo = STATUS_STEPS.find(s => s.value === entry.status);
                  const isLast = idx === tracking.timeline.length - 1;
                  const milestoneInfo = MILESTONE_DETAILS[entry.status];
                  return (
                    <div key={idx} className="flex items-start gap-4 relative" style={{ animation: isLatest ? 'fadeSlideUp 0.5s ease-out' : undefined }}>
                      {!isLast && <div className="absolute left-[7px] top-6 bottom-0 w-px bg-white/10" />}
                      <div
                        className={
                          'relative w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 z-10 transition-all duration-500 ' +
                          (isLatest
                            ? (stepInfo?.bg || 'bg-[#CC0000]') + ' ' + (stepInfo?.border || 'border-[#CC0000]') + ' shadow-lg scale-125'
                            : 'bg-[#1a1a1a] border-tesla-border')
                        }
                      >
                        {isLatest && (
                          <span
                            className={"absolute inset-[-3px] rounded-full " + (stepInfo?.bg || 'bg-[#CC0000]') + ' opacity-30'}
                            style={{ animation: 'pingPulse 2s ease-in-out infinite' }}
                          />
                        )}
                      </div>
                      <div className={"flex-1 " + (isLast ? '' : 'pb-5')}>
                        <div className="flex items-center gap-2">
                          <span className={"text-xs font-medium " + (stepInfo?.color || (isLatest ? 'text-white' : 'text-gray-500'))}>
                            {STATUS_STEPS.find(s => s.value === entry.status)?.label || entry.status}
                          </span>
                          {isLatest && autoRefresh && (
                            <span className="text-[9px] text-gray-600">{formatElapsed(elapsed)}</span>
                          )}
                        </div>
                        {entry.note && <p className="text-gray-400 text-[11px] mt-0.5">{entry.note}</p>}
                        <span className="text-gray-600 text-[10px]">{new Date(entry.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-center text-gray-600 text-[10px] pt-2">
            Last updated: {new Date().toLocaleTimeString()} {autoRefresh && '(auto-refreshes every 30s)'}
          </p>
        </div>
      )}
    </div>
  );
}
