import React from 'react';
import { useApp } from '../context/AppContext';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { Users, CheckCircle2, Navigation, Layers, ChevronRight } from 'lucide-react';

export default function TableView() {
  const { tables, setActiveTableId } = useApp();
  const { isMobile } = useDeviceDetect();

  const zones = ['Tất cả', ...new Set(tables.map(t => t.zone))];
  const [activeZone, setActiveZone] = React.useState('Tất cả');

  const filteredTables = activeZone === 'Tất cả' 
    ? tables 
    : tables.filter(t => t.zone === activeZone);

  // ── MOBILE ──
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto animate-reveal pb-24">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-bg-deep/95 backdrop-blur-xl px-5 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-0.5 bg-brand-red rounded-full" />
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-red">LIVE</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">Quản lý bàn</h1>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-bg-surface border border-white/10 text-[9px] font-black text-text-dim tracking-widest">
              {tables.filter(t => t.status === 'occupied').length}/{tables.length}
            </div>
          </div>

          {/* Zone Chips - horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto hide-scroll -mx-5 px-5 pb-1">
            {zones.map(zone => (
              <button
                key={zone}
                onClick={() => setActiveZone(zone)}
                className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all border ${
                  activeZone === zone
                    ? 'bg-brand-red border-brand-red text-white shadow-lg shadow-brand-red/20'
                    : 'bg-bg-surface text-text-dim border-white/5 active:scale-95'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </header>

        {/* Mobile Table Cards - Compact List Style */}
        <div className="px-4 pt-4 space-y-3">
          {filteredTables.map(table => {
            const isOccupied = table.status === 'occupied';
            const totalAmount = table.items.reduce((sum, item) => sum + parseFloat(item.price.replace(',', '.')), 0);

            return (
              <button
                key={table.id}
                onClick={() => setActiveTableId(table.id)}
                className={`w-full relative rounded-3xl p-5 flex items-center gap-4 transition-all duration-300 border active:scale-[0.98] ${
                  isOccupied
                    ? 'bg-bg-elevated border-brand-red/40 shadow-xl shadow-brand-red/10'
                    : 'bg-bg-surface border-white/5 active:bg-bg-elevated'
                }`}
              >
                {/* Status icon */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  isOccupied
                    ? 'bg-brand-red shadow-lg shadow-brand-red/30'
                    : 'bg-bg-deep border border-white/10'
                }`}>
                  {isOccupied ? (
                    <Users size={20} className="text-white" />
                  ) : (
                    <CheckCircle2 size={20} className="text-text-dim" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl font-black text-white tracking-tight">{table.name}</span>
                    {isOccupied && (
                      <span className="px-2 py-0.5 rounded-lg bg-brand-red/20 text-brand-red text-[8px] font-black uppercase tracking-widest">
                        {table.items.length} món
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Navigation size={8} className="text-text-dim" />
                    <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{table.zone}</span>
                  </div>
                </div>

                {/* Price + Arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  {isOccupied && (
                    <span className="text-lg font-black text-brand-gold tracking-tight">{totalAmount.toFixed(2)}€</span>
                  )}
                  <ChevronRight size={18} className="text-text-dim" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div className="flex-1 p-10 overflow-y-auto animate-reveal relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-red/5 blur-[120px] -z-10 pointer-events-none" />

      <header className="mb-14 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-1 bg-brand-red rounded-full shadow-[0_0_10px_rgba(179,27,27,0.5)]" />
             <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red">Operational Board</span>
          </div>
          <h1 className="text-5xl font-black tracking-tight text-white mb-2">Quản lý bàn</h1>
          <p className="text-text-secondary text-lg">Hệ thống giám sát trạng thái nhà hàng trực tiếp</p>
        </div>
        
        <div className="flex bg-bg-surface p-1.5 rounded-[24px] border border-white/5 shadow-2xl overflow-x-auto hide-scroll">
          {zones.map(zone => (
            <button
              key={zone}
              onClick={() => setActiveZone(zone)}
              className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all duration-500 whitespace-nowrap ${
                activeZone === zone 
                  ? 'bg-brand-red text-white shadow-xl shadow-brand-red/30' 
                  : 'text-text-dim hover:text-text-secondary'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
        {filteredTables.map(table => {
          const isOccupied = table.status === 'occupied';
          const totalAmount = table.items.reduce((sum, item) => sum + parseFloat(item.price.replace(',', '.')), 0);

          return (
            <button
              key={table.id}
              onClick={() => setActiveTableId(table.id)}
              className={`group relative h-64 rounded-[40px] p-8 flex flex-col justify-between transition-all duration-500 border overflow-hidden ${
                isOccupied 
                  ? 'bg-bg-elevated border-brand-red/50 shadow-2xl shadow-brand-red/10 animate-glow-pulse' 
                  : 'bg-bg-surface border-white/5 hover:border-white/20 hover:bg-bg-elevated'
              }`}
            >
              {/* Interaction accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] -z-10 transition-colors duration-500 ${isOccupied ? 'bg-brand-red/10' : 'bg-white/5'}`} />

              <div className="flex justify-between items-start relative z-10 w-full">
                <div className="flex flex-col items-start gap-1">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isOccupied ? 'bg-brand-red text-white' : 'bg-bg-deep text-text-dim border border-white/5'}`}>
                    <Navigation size={8} /> {table.zone}
                  </div>
                  <h3 className="text-3xl font-black mt-3 tracking-tight">{table.name}</h3>
                </div>
                
                {isOccupied ? (
                  <div className="bg-brand-red p-4 rounded-[20px] shadow-2xl shadow-brand-red/40 animate-pulse">
                    <Users size={20} color="white" />
                  </div>
                ) : (
                  <div className="p-4 rounded-[20px] bg-bg-deep border border-white/5 group-hover:border-brand-red/30 transition-all">
                    <CheckCircle2 size={24} className="text-text-dim group-hover:text-brand-red" />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-end relative z-10 w-full">
                <div className="flex flex-col items-start gap-1">
                   {isOccupied && (
                     <div className="flex items-center gap-2 text-text-secondary px-3 py-1 bg-bg-deep rounded-xl border border-white/5 mb-1">
                        <Layers size={10} className="text-brand-red" />
                        <span className="text-[10px] font-black">{table.items.length} MÓN</span>
                     </div>
                   )}
                   <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isOccupied ? 'text-brand-red' : 'text-text-dim'}`}>
                    {isOccupied ? 'BUSY' : 'AVAILABLE'}
                  </span>
                </div>
                <div className="text-right flex flex-col">
                  <span className={`text-[10px] font-black text-text-dim uppercase tracking-widest mb-1 ${!isOccupied && 'opacity-0'}`}>Tổng tiền</span>
                  <span className={`text-4xl font-black tracking-tighter leading-none ${isOccupied ? 'text-white' : 'text-text-dim'}`}>
                    {isOccupied ? `${totalAmount.toFixed(2)}€` : '0,00'}
                  </span>
                </div>
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
