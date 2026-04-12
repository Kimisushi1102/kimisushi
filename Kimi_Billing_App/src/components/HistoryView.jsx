import React from 'react';
import { useApp } from '../context/AppContext';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { Receipt, Clock, CreditCard, Banknote, TrendingUp, ArrowUpRight, Hash, Scissors } from 'lucide-react';

export default function HistoryView() {
  const { history } = useApp();
  const { isMobile } = useDeviceDetect();

  const dailyTotal = history.reduce((sum, record) => {
    const recordDate = new Date(record.date).toDateString();
    const today = new Date().toDateString();
    return recordDate === today ? sum + record.total : sum;
  }, 0);

  const cashTotal = history.reduce((sum, record) => {
     const recordDate = new Date(record.date).toDateString();
     const today = new Date().toDateString();
     return (recordDate === today && record.paymentType === 'Cash') ? sum + record.total : sum;
  }, 0);

  const cardTotal = history.reduce((sum, record) => {
     const recordDate = new Date(record.date).toDateString();
     const today = new Date().toDateString();
     return (recordDate === today && record.paymentType === 'Card') ? sum + record.total : sum;
  }, 0);

  // ── MOBILE ──
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto animate-reveal pb-24">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-bg-deep/95 backdrop-blur-xl px-5 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-0.5 bg-brand-red rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-red">LIVE</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">Doanh thu</h1>
        </header>

        <div className="px-4 pt-4 space-y-4">
          {/* Daily Total - Featured Card */}
          <div className="bg-bg-surface p-6 rounded-3xl border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-red/10 blur-[40px] pointer-events-none" />
            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="w-12 h-12 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg shadow-brand-red/30">
                <TrendingUp size={22} className="text-white" />
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                <ArrowUpRight size={10} /> Live
              </div>
            </div>
            <span className="text-[9px] font-black text-text-dim uppercase tracking-[0.3em] block mb-1 relative z-10">Doanh thu hôm nay</span>
            <span className="text-5xl font-black text-white tracking-tighter leading-none relative z-10">{dailyTotal.toFixed(2)}€</span>
            <div className="flex items-center gap-2 mt-3 text-text-dim relative z-10">
              <Clock size={12} />
              <span className="text-[9px] font-bold uppercase tracking-wider">{new Date().toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>

          {/* Payment Breakdown - 2 Mini Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Cash */}
            <div className="bg-bg-surface p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-brand-gold/10 rounded-xl flex items-center justify-center text-brand-gold border border-brand-gold/20">
                  <Banknote size={16} />
                </div>
              </div>
              <span className="text-[8px] font-black text-text-dim uppercase tracking-widest block mb-0.5">Tiền mặt</span>
              <span className="text-2xl font-black text-white tracking-tighter">{cashTotal.toFixed(2)}€</span>
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black text-text-dim tracking-wider">{dailyTotal > 0 ? ((cashTotal/dailyTotal)*100).toFixed(0) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-deep rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-brand-gold shadow-[0_0_8px_rgba(212,175,55,0.4)] transition-all duration-1000" style={{ width: `${dailyTotal > 0 ? (cashTotal/dailyTotal)*100 : 0}%` }} />
                </div>
              </div>
            </div>

            {/* Card */}
            <div className="bg-bg-surface p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 bg-brand-red/10 rounded-xl flex items-center justify-center text-brand-red border border-brand-red/20">
                  <CreditCard size={16} />
                </div>
              </div>
              <span className="text-[8px] font-black text-text-dim uppercase tracking-widest block mb-0.5">Thẻ / Card</span>
              <span className="text-2xl font-black text-white tracking-tighter">{cardTotal.toFixed(2)}€</span>
              <div className="mt-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] font-black text-text-dim tracking-wider">{dailyTotal > 0 ? ((cardTotal/dailyTotal)*100).toFixed(0) : 0}%</span>
                </div>
                <div className="w-full h-1.5 bg-bg-deep rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-brand-red shadow-[0_0_8px_rgba(179,27,27,0.4)] transition-all duration-1000" style={{ width: `${dailyTotal > 0 ? (cardTotal/dailyTotal)*100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History - Mobile Cards */}
          <div>
            <div className="flex justify-between items-center px-1 mb-3">
              <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">Lịch sử giao dịch</span>
              <span className="text-[9px] font-black text-text-dim tracking-widest">{history.length}</span>
            </div>

            {history.length === 0 ? (
              <div className="py-16 flex flex-col items-center opacity-15">
                <Receipt size={60} strokeWidth={1} />
                <p className="font-black uppercase text-[10px] tracking-widest mt-4">Chưa có giao dịch</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map(record => (
                  <div key={record.id} className="bg-bg-surface rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                    {/* Payment Type Icon */}
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      record.paymentType === 'Cash'
                        ? 'bg-brand-gold/10 border-brand-gold/20 text-brand-gold'
                        : 'bg-brand-red/10 border-brand-red/20 text-brand-red'
                    }`}>
                      {record.paymentType === 'Cash' ? <Banknote size={18} /> : <CreditCard size={18} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-black text-white text-sm tracking-tight truncate">{record.tableName}</span>
                        {record.isSplit && (
                          <span className="px-1.5 py-0.5 rounded-md bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[7px] font-black uppercase tracking-wider flex items-center gap-0.5">
                            <Scissors size={8} /> Tách
                          </span>
                        )}
                        <span className="text-[8px] font-black text-text-dim">#{record.id.slice(-4)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-text-dim">{record.items.length} món</span>
                        <span className="text-[9px] font-bold text-text-dim">• {new Date(record.date).toLocaleTimeString('vi-VN')}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <span className="text-xl font-black text-white tracking-tighter shrink-0">{record.total.toFixed(2)}€</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div className="flex-1 p-12 overflow-y-auto animate-reveal relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-red/5 blur-[150px] -z-10 pointer-events-none" />

      <header className="mb-14">
        <div className="flex items-center gap-3 mb-3">
           <div className="w-10 h-1 bg-brand-red rounded-full shadow-[0_0_10px_rgba(179,27,27,0.5)]" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-red">Financial Analytics</span>
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white mb-3">Doanh thu cửa hàng</h1>
        <p className="text-text-secondary text-lg">Giám sát dòng tiền và lịch sử giao dịch chi tiết</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-20">
        {/* Total Stat */}
        <div className="lg:col-span-1 bg-bg-surface p-12 rounded-[56px] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-red/10 blur-[60px] pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-12">
               <div className="w-16 h-16 bg-brand-red rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-brand-red/40">
                  <TrendingUp size={32} />
               </div>
               <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                  <ArrowUpRight size={14} /> Trực tiếp
               </div>
            </div>
            <p className="text-[11px] font-black text-text-dim uppercase tracking-[0.4em] mb-4">Mục tiêu doanh thu ngày</p>
            <h3 className="text-7xl font-black text-white tracking-tighter leading-none mb-4">{dailyTotal.toFixed(2)}€</h3>
            <div className="mt-auto pt-10 flex items-center gap-3 text-text-dim">
               <Clock size={16} />
               <span className="text-xs font-bold uppercase tracking-widest">Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Breakdown Cash */}
        <div className="bg-bg-surface p-12 rounded-[56px] border border-white/5 flex flex-col justify-between group">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-brand-gold/10 rounded-[28px] flex items-center justify-center text-brand-gold border border-brand-gold/20 shadow-xl">
              <Banknote size={36} />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] mb-2">Tiền mặt (Cash)</p>
              <h3 className="text-4xl font-black text-white tracking-tighter">{cashTotal.toFixed(2)}€</h3>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-white/5">
             <div className="flex justify-between items-end mb-4">
                <span className="text-[11px] font-black text-text-dim uppercase tracking-widest">Tỉ lệ thanh toán</span>
                <span className="text-xl font-black text-brand-gold tracking-tighter">{dailyTotal > 0 ? ((cashTotal/dailyTotal)*100).toFixed(0) : 0}%</span>
             </div>
             <div className="w-full h-2 bg-bg-deep rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.4)] transition-all duration-1000" 
                  style={{ width: `${dailyTotal > 0 ? (cashTotal/dailyTotal)*100 : 0}%` }} 
                />
             </div>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="bg-bg-surface p-12 rounded-[56px] border border-white/5 flex flex-col justify-between group">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-brand-red/10 rounded-[28px] flex items-center justify-center text-brand-red border border-brand-red/20 shadow-xl">
              <CreditCard size={36} />
            </div>
            <div>
              <p className="text-[10px] font-black text-text-dim uppercase tracking-[0.4em] mb-2">Thẻ (Card / Bank)</p>
              <h3 className="text-4xl font-black text-white tracking-tighter">{cardTotal.toFixed(2)}€</h3>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-white/5">
             <div className="flex justify-between items-end mb-4">
                <span className="text-[11px] font-black text-text-dim uppercase tracking-widest">Tỉ lệ thanh toán</span>
                <span className="text-xl font-black text-brand-red tracking-tighter">{dailyTotal > 0 ? ((cardTotal/dailyTotal)*100).toFixed(0) : 0}%</span>
             </div>
             <div className="w-full h-2 bg-bg-deep rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-brand-red shadow-[0_0_10px_rgba(179,27,27,0.4)] transition-all duration-1000" 
                  style={{ width: `${dailyTotal > 0 ? (cardTotal/dailyTotal)*100 : 0}%` }} 
                />
             </div>
          </div>
        </div>
      </div>

      {/* Transaction Records */}
      <div className="bg-bg-surface rounded-6xl overflow-hidden border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
        <div className="p-12 border-b border-white/5 bg-bg-elevated/40 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <Hash size={24} className="text-brand-red" />
             <h3 className="text-xl font-black uppercase tracking-[0.3em]">Nhật ký giao dịch</h3>
          </div>
          <div className="px-6 py-2.5 rounded-2xl bg-bg-deep border border-white/10 text-[11px] font-black tracking-widest text-text-secondary italic">
             Log.count: {history.length}
          </div>
        </div>
        
        {history.length === 0 ? (
          <div className="py-40 flex flex-col items-center opacity-10">
            <Receipt size={120} strokeWidth={1} />
            <p className="font-black uppercase tracking-[0.5em] text-sm mt-8">Database Empty</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-text-dim text-[11px] font-black uppercase tracking-widest bg-bg-elevated/20">
                  <th className="p-12 uppercase">ID REF</th>
                  <th className="p-12 uppercase">Source / Table</th>
                  <th className="p-12 uppercase">Time Record</th>
                  <th className="p-12 uppercase">Phương thức</th>
                  <th className="p-12 text-right uppercase">Net Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map(record => (
                  <tr key={record.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-12">
                       <span className="text-[10px] font-black text-text-dim group-hover:text-brand-red font-mono transition-colors">#{record.id.slice(-6)}</span>
                    </td>
                    <td className="p-12">
                       <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-white uppercase text-lg tracking-tighter">{record.tableName}</span>
                            {record.isSplit && (
                              <span className="px-3 py-1 rounded-lg bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                                <Scissors size={10} /> Tách đơn
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{record.items.length} món</span>
                       </div>
                    </td>
                    <td className="p-12">
                       <span className="text-xs font-black text-text-secondary flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse shadow-[0_0_10px_#D4AF37]" /> {new Date(record.date).toLocaleTimeString('vi-VN')}
                       </span>
                    </td>
                    <td className="p-12">
                       <div className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${record.paymentType === 'Cash' ? 'bg-brand-gold/10 border-brand-gold/30 text-brand-gold' : 'bg-brand-red/10 border-brand-red/30 text-brand-red'}`}>
                          {record.paymentType === 'Cash' ? <Banknote size={16} /> : <CreditCard size={16} />}
                          {record.paymentType === 'Cash' ? 'Tiền mặt' : 'Thẻ / Bank'}
                       </div>
                    </td>
                    <td className="p-12 text-right">
                       <span className="text-3xl font-black text-white tracking-tighter">{record.total.toFixed(2)}€</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
