import React from 'react';
import { useApp } from '../context/AppContext';
import { LayoutGrid, Settings, History, UtensilsCrossed } from 'lucide-react';

export default function MobileNav() {
  const { view, setView, setActiveTableId, activeTableId } = useApp();

  if (activeTableId) return null;

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
    <nav className="fixed bottom-0 left-0 right-0 z-[200] bg-bg-surface/95 backdrop-blur-2xl border-t border-white/10 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`relative flex flex-col items-center gap-1 py-3 px-6 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'text-white'
                  : 'text-text-dim active:scale-95'
              }`}
            >
              {isActive && (
                <div className="absolute -top-1 w-8 h-1 rounded-full bg-brand-red shadow-[0_0_12px_rgba(179,27,27,0.6)]" />
              )}
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                isActive ? 'bg-brand-red/15' : ''
              }`}>
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.8 : 2}
                  className={isActive ? 'text-brand-red' : 'text-text-dim'}
                />
              </div>
              <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${
                isActive ? 'text-brand-red' : 'text-text-dim'
              }`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
