import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutGrid, Settings, History, UtensilsCrossed, CircleDot } from 'lucide-react';

export default function Sidebar() {
  const { view, setView, setActiveTableId, activeTableId } = useApp();

  const navItems = [
    { id: 'tables', label: 'Bàn', icon: LayoutGrid },
    { id: 'history', label: 'Doanh thu', icon: History },
    { id: 'admin', label: 'Hệ thống', icon: Settings },
  ];

  const handleNav = (id) => {
    setActiveTableId(null);
    setView(id);
  };

  return (
    <aside className="w-20 lg:w-72 bg-bg-surface border-r border-white/5 flex flex-col transition-all duration-500 z-50 overflow-hidden relative">
      {/* Branding Section */}
      <div className="p-8 pb-12 flex items-center gap-4">
        <div className="w-12 h-12 bg-brand-red rounded-[20px] flex items-center justify-center shadow-2xl shadow-brand-red/40 relative group">
          <UtensilsCrossed size={22} color="white" />
          <div className="absolute inset-0 rounded-[20px] bg-white/10 animate-pulse" />
        </div>
        <div className="hidden lg:flex flex-col">
          <span className="font-black text-xl tracking-tight leading-none">SAKURA ZEN</span>
          <span className="text-[10px] font-black text-brand-red tracking-[0.3em] uppercase mt-1">Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-3">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            className={`w-full flex items-center gap-5 p-4 rounded-3xl transition-all duration-300 group relative ${
              view === item.id && !activeTableId
                ? 'bg-bg-elevated text-white shadow-xl'
                : 'text-text-dim hover:text-white'
            }`}
          >
            <item.icon 
              size={22} 
              strokeWidth={2.5} 
              className={view === item.id && !activeTableId ? 'text-brand-red' : 'text-text-dim group-hover:text-brand-red transition-colors'} 
            />
            <span className="hidden lg:block font-black text-xs uppercase tracking-widest">{item.label}</span>
            
            {view === item.id && !activeTableId && (
              <div className="absolute right-4 w-1.5 h-6 rounded-full bg-brand-red shadow-[0_0_15px_rgba(179,27,27,0.5)]" />
            )}

            {/* Subtle hover border */}
            <div className={`absolute inset-0 rounded-3xl border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
          </button>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-8 text-center lg:text-left">
        <div className="hidden lg:flex flex-col gap-1 p-5 rounded-[28px] bg-bg-deep border border-white/5 relative overflow-hidden group">
          <p className="text-[9px] text-brand-gold uppercase font-black tracking-widest opacity-60">Status</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
            <span className="text-xs font-black tracking-tight">ONLINE</span>
          </div>
          <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/5 blur-2xl group-hover:bg-brand-red/10 transition-all" />
        </div>
        <div className="lg:hidden flex flex-col items-center gap-4">
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
        </div>
      </div>
    </aside>
  );
}
