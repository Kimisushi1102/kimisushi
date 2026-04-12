import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import SplitBillModal from './SplitBillModal';
import { 
  ChevronLeft, 
  Search, 
  Trash2, 
  Printer, 
  Plus, 
  CreditCard, 
  Banknote,
  Utensils,
  Receipt,
  CheckCircle2,
  ShoppingCart,
  X,
  Minus,
  ArrowLeft,
  Save,
  ClipboardList,
  Scissors
} from 'lucide-react';

export default function MenuView() {
  const { 
    activeTable, 
    setActiveTableId, 
    menu, 
    addItemToTable, 
    removeItemFromTable,
    finalizeBill,
    splitBill
  } = useApp();
  const { isMobile } = useDeviceDetect();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showCheckoutChoose, setShowCheckoutChoose] = useState(false); // choose full vs split
  const [showSplitBill, setShowSplitBill] = useState(false);
  const [justAdded, setJustAdded] = useState(null); // flash feedback

  const categories = ['Tất cả', ...new Set(menu.map(m => m.category || 'Khác'))];

  const filteredMenu = useMemo(() => {
    return menu.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || 
                            item.code?.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === 'Tất cả' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [menu, search, category]);

  const totalAmount = activeTable?.items.reduce((sum, item) => sum + parseFloat(item.price.replace(',', '.')), 0) || 0;

  // Add with visual feedback
  const handleAddItem = (item) => {
    addItemToTable(activeTable.id, item);
    setJustAdded(item.id);
    setTimeout(() => setJustAdded(null), 600);
  };

  // Save & go back
  const handleSaveAndGoBack = () => {
    setActiveTableId(null);
  };

  if (!activeTable) return null;

  // ── MOBILE LAYOUT ──
  if (isMobile) {
    return (
      <div className="flex flex-col h-full animate-reveal bg-bg-deep relative">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 bg-bg-deep/95 backdrop-blur-xl px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleSaveAndGoBack}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-bg-surface border border-white/10 active:scale-90 transition-transform"
            >
              <ArrowLeft size={16} />
              <span className="text-[9px] font-black uppercase tracking-wider">Lưu & quay lại</span>
            </button>
            <div className="flex-1 min-w-0 text-right">
              <h2 className="text-lg font-black text-white tracking-tight truncate">{activeTable.name}</h2>
              <div className="flex items-center gap-1.5 justify-end">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                  {activeTable.items.length > 0 ? `${activeTable.items.length} món đã lưu` : 'Sẵn sàng đặt món'}
                </span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
            <input
              type="text"
              placeholder="Tìm món..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-bg-surface border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-sm font-bold focus:border-brand-red outline-none transition-all"
            />
          </div>

          {/* Categories - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto hide-scroll -mx-4 px-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] whitespace-nowrap transition-all border ${
                  category === cat
                    ? 'bg-brand-red border-brand-red text-white shadow-md shadow-brand-red/20'
                    : 'bg-bg-surface text-text-dim border-white/5 active:scale-95'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Mobile Menu Grid - 2 columns */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-28">
          {menu.length === 0 ? (
            <div className="py-20 flex flex-col items-center">
              <Utensils size={40} className="text-text-dim opacity-20 mb-4" />
              <p className="text-sm font-black text-text-dim uppercase tracking-widest">Chưa có thực đơn</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredMenu.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleAddItem(item)}
                  className={`bg-bg-surface border active:border-brand-red/50 rounded-2xl overflow-hidden flex flex-col text-left active:scale-[0.97] transition-all relative ${
                    justAdded === item.id ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' : 'border-white/5'
                  }`}
                >
                  {/* Image */}
                  {item.image ? (
                    <div className="w-full h-24 overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  
                  <div className={`p-3 flex flex-col justify-between flex-1 ${item.image ? '' : 'h-32'}`}>
                    <div>
                      {item.code && (
                        <span className="px-2 py-0.5 rounded-md bg-bg-elevated text-brand-red text-[8px] font-black border border-white/5 uppercase">#{item.code}</span>
                      )}
                      <span className="font-black text-sm text-white block leading-snug mt-1 line-clamp-2">{item.name}</span>
                    </div>
                    <div className="flex items-end justify-between mt-2">
                      <span className="text-lg font-black text-brand-gold tracking-tight">{item.price}€</span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        justAdded === item.id ? 'bg-emerald-500 text-white' : 'bg-brand-red/10 text-brand-red'
                      }`}>
                        {justAdded === item.id ? <CheckCircle2 size={14} /> : <Plus size={14} />}
                      </div>
                    </div>
                  </div>

                  {/* Added flash overlay */}
                  {justAdded === item.id && (
                    <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-reveal" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
          {activeTable.items.length > 0 ? (
            <div className="px-4 pb-4 flex gap-2">
              {/* View Order Button */}
              <button
                onClick={() => setShowMobileCart(true)}
                className="flex-1 bg-bg-surface/95 backdrop-blur-xl border border-white/10 text-white py-3.5 px-4 rounded-2xl font-black text-xs flex items-center gap-3 active:scale-[0.97] transition-transform shadow-xl"
              >
                <div className="relative">
                  <ClipboardList size={18} />
                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-red rounded-full flex items-center justify-center text-[8px] font-black">
                    {activeTable.items.length}
                  </div>
                </div>
                <span className="uppercase tracking-wider text-[10px]">Xem đơn</span>
                <span className="ml-auto text-brand-gold font-black">{totalAmount.toFixed(2)}€</span>
              </button>

              {/* Save & Back Button */}
              <button
                onClick={handleSaveAndGoBack}
                className="bg-emerald-600 text-white py-3.5 px-5 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 active:scale-[0.97] transition-transform shadow-xl shadow-emerald-600/30"
              >
                <Save size={16} />
                Lưu
              </button>
            </div>
          ) : (
            <div className="px-4 pb-4">
              <button
                onClick={handleSaveAndGoBack}
                className="w-full bg-bg-surface/95 backdrop-blur-xl border border-white/10 text-text-dim py-3.5 px-4 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
              >
                <ArrowLeft size={16} /> Quay lại danh sách bàn
              </button>
            </div>
          )}
        </div>

        {/* Mobile Cart Drawer (slides up from bottom) */}
        {showMobileCart && (
          <div className="fixed inset-0 z-[100] animate-reveal">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowMobileCart(false)} />
            <div className="absolute bottom-0 left-0 right-0 bg-bg-surface rounded-t-[32px] max-h-[85vh] flex flex-col border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Cart Header */}
              <div className="px-6 pb-4 flex items-center justify-between border-b border-white/5">
                <div>
                  <span className="text-[9px] font-black text-brand-red uppercase tracking-[0.3em] block">Đơn hàng hiện tại</span>
                  <span className="text-2xl font-black tracking-tight">{activeTable.name}</span>
                </div>
                <button onClick={() => setShowMobileCart(false)} className="w-10 h-10 rounded-2xl bg-bg-elevated border border-white/10 flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 min-h-0">
                {activeTable.items.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 animate-reveal">
                    {/* Thumbnail in cart */}
                    {item.image ? (
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
                        <img src={item.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-bg-elevated border border-white/5 text-[10px] font-black flex items-center justify-center text-brand-red shrink-0">1</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="font-black text-sm text-white block truncate">{item.name}</span>
                      <span className="text-[10px] font-bold text-text-dim">{item.price}€</span>
                    </div>
                    <span className="font-black text-brand-gold shrink-0">{item.price}€</span>
                    <button
                      onClick={() => removeItemFromTable(activeTable.id, index)}
                      className="p-2 rounded-xl bg-brand-red/10 text-brand-red active:bg-brand-red active:text-white transition-all shrink-0"
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Cart Footer - 2 actions: Save vs Checkout */}
              <div className="px-6 py-5 bg-bg-deep border-t border-white/10 safe-area-bottom space-y-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Tổng hiện tại</span>
                  <span className="text-3xl font-black text-white tracking-tighter">{totalAmount.toFixed(2)}€</span>
                </div>
                
                {/* Primary: Save & go back */}
                <button
                  onClick={() => { setShowMobileCart(false); handleSaveAndGoBack(); }}
                  className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-[0.97] transition-transform"
                >
                  <Save size={18} />
                  LƯU ĐƠN & QUAY LẠI BÀN
                </button>

                {/* Secondary: Checkout when ready */}
                <button
                  disabled={activeTable.items.length === 0}
                  onClick={() => { setShowMobileCart(false); setShowCheckoutChoose(true); }}
                  className="w-full bg-bg-surface text-text-secondary py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-30"
                >
                  <Banknote size={16} />
                  Thanh toán (khi khách xong bữa)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Choose checkout mode (Full vs Split) */}
        {showCheckoutChoose && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center animate-reveal">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowCheckoutChoose(false)} />
            <div className="relative bg-bg-surface border-t border-white/10 w-full rounded-t-[40px] p-8 flex flex-col items-center text-center safe-area-bottom shadow-[0_-30px_60px_rgba(0,0,0,1)]">
              <div className="w-10 h-1 rounded-full bg-white/20 mb-6" />
              <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.4em] mb-2">Thanh toán — {activeTable.name}</span>
              <h3 className="text-3xl font-black mb-1 tracking-tighter">{totalAmount.toFixed(2)}€</h3>
              <p className="text-text-dim text-sm mb-6">{activeTable.items.length} món</p>

              <div className="w-full space-y-3 mb-6">
                {/* Full payment */}
                <button
                  onClick={() => { setShowCheckoutChoose(false); setShowCheckout(true); }}
                  className="w-full flex items-center gap-4 p-5 rounded-3xl bg-bg-elevated border border-white/10 active:border-brand-red/50 active:bg-brand-red/5 transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-red/10 flex items-center justify-center shrink-0">
                    <Receipt size={24} className="text-brand-red" />
                  </div>
                  <div className="flex-1">
                    <span className="font-black text-white text-base block">Trả toàn bộ</span>
                    <span className="text-[10px] font-bold text-text-dim">Thanh toán hết {totalAmount.toFixed(2)}€ một lần</span>
                  </div>
                </button>

                {/* Split payment */}
                <button
                  onClick={() => { setShowCheckoutChoose(false); setShowSplitBill(true); }}
                  className="w-full flex items-center gap-4 p-5 rounded-3xl bg-bg-elevated border border-white/10 active:border-brand-gold/50 active:bg-brand-gold/5 transition-all text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center shrink-0">
                    <Scissors size={24} className="text-brand-gold" />
                  </div>
                  <div className="flex-1">
                    <span className="font-black text-white text-base block">Tách đơn</span>
                    <span className="text-[10px] font-bold text-text-dim">Khách trả riêng — chọn món cho từng bill</span>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setShowCheckoutChoose(false)}
                className="text-text-dim font-black uppercase text-[10px] tracking-[0.3em] active:text-brand-red transition-colors py-3"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        )}

        {/* Mobile: Full payment modal */}
        {showCheckout && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center animate-reveal">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => setShowCheckout(false)} />
            <div className="relative bg-bg-surface border-t border-white/10 w-full rounded-t-[40px] p-8 flex flex-col items-center text-center safe-area-bottom shadow-[0_-30px_60px_rgba(0,0,0,1)]">
              <div className="w-10 h-1 rounded-full bg-white/20 mb-6" />
              <div className="w-16 h-16 bg-brand-red rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-brand-red/40">
                <Receipt size={28} className="text-white" />
              </div>
              <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.4em] mb-2">Trả toàn bộ</span>
              <h3 className="text-4xl font-black mb-2 tracking-tighter">{totalAmount.toFixed(2)}€</h3>
              <p className="text-text-secondary text-sm mb-8">{activeTable.name} — {activeTable.items.length} món</p>

              <div className="grid grid-cols-2 gap-4 w-full mb-6">
                <button
                  onClick={() => { finalizeBill(activeTable.id, 'Cash'); setShowCheckout(false); }}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-bg-elevated border border-white/10 active:border-brand-gold/50 active:bg-brand-gold/5 transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 flex items-center justify-center">
                    <Banknote size={28} className="text-brand-gold" />
                  </div>
                  <span className="font-black uppercase text-[9px] tracking-[0.2em] text-text-dim">Tiền mặt</span>
                </button>
                <button
                  onClick={() => { finalizeBill(activeTable.id, 'Card'); setShowCheckout(false); }}
                  className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-bg-elevated border border-white/10 active:border-brand-red/50 active:bg-brand-red/5 transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl bg-brand-red/10 flex items-center justify-center">
                    <CreditCard size={28} className="text-brand-red" />
                  </div>
                  <span className="font-black uppercase text-[9px] tracking-[0.2em] text-text-dim">Thẻ (Card)</span>
                </button>
              </div>

              <button
                onClick={() => setShowCheckout(false)}
                className="text-text-dim font-black uppercase text-[10px] tracking-[0.3em] active:text-brand-red transition-colors py-3"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        )}

        {/* Mobile: Split Bill Modal */}
        {showSplitBill && (
          <SplitBillModal
            table={activeTable}
            onSplitPay={(indices, paymentType) => {
              splitBill(activeTable.id, indices, paymentType);
              setShowSplitBill(false);
            }}
            onClose={() => setShowSplitBill(false)}
          />
        )}

        {/* Hidden Kitchen Print View */}
        <div className="hidden print-only">
          <div style={{ textAlign: 'center', margin: '30px 0', borderBottom: '3px solid #000', paddingBottom: '20px' }}>
            <h1 style={{ margin: 0, fontSize: '32px', letterSpacing: '5px' }}>BILL BẾP</h1>
            <div style={{ padding: '10px 20px', background: '#000', color: '#fff', fontSize: '28px', display: 'inline-block', margin: '15px 0', fontWeight: 'bold' }}>
              {activeTable.name.toUpperCase()}
            </div>
            <p style={{ fontSize: '14px', margin: 0 }}>Ngày: {new Date().toLocaleString('vi-VN')}</p>
          </div>
          <div style={{ padding: '0 10px', minHeight: '300px' }}>
            {activeTable.items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px dashed #ccc', paddingBottom: '10px' }}>
                <span style={{ fontSize: '30px', fontWeight: '900', marginRight: '20px' }}>1x</span>
                <span style={{ fontSize: '28px', fontWeight: '900', flex: 1 }}>{item.name.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP LAYOUT ──
  return (
    <div className="flex h-full animate-reveal overflow-hidden bg-bg-deep">
      {/* Menu Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative border-r border-white/5">
        <header className="p-10 pb-4 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <button 
                onClick={handleSaveAndGoBack}
                className="group flex items-center gap-3 text-text-dim hover:text-white transition-all uppercase font-black text-[10px] tracking-[0.2em]"
              >
                <div className="w-12 h-12 rounded-[20px] bg-bg-surface border border-white/10 flex items-center justify-center group-hover:border-emerald-500 transition-all">
                  <Save size={18} className="group-hover:text-emerald-500 transition-colors" />
                </div>
                Lưu & quay lại
              </button>
              <div className="h-12 w-[1px] bg-white/10" />
              <div className="flex flex-col">
                <h2 className="text-4xl font-black text-white leading-none tracking-tight">{activeTable.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                     {activeTable.items.length > 0 
                       ? `${activeTable.zone} / ${activeTable.items.length} món đã đặt — Đang phục vụ` 
                       : `${activeTable.zone} / Sẵn sàng nhận order`}
                   </span>
                </div>
              </div>
            </div>

            <div className="relative w-[400px] group">
              <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-text-dim group-focus-within:text-brand-red transition-colors" />
              <input 
                type="text" 
                placeholder="Tìm món ăn hoặc mã món..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-bg-surface border border-white/10 rounded-[24px] py-5 pl-16 pr-8 text-sm font-bold focus:border-brand-red focus:bg-bg-elevated outline-none transition-all shadow-2xl"
              />
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto hide-scroll pb-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-10 py-4 rounded-[18px] text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap transition-all border ${
                  category === cat 
                    ? 'bg-brand-red border-brand-red text-white shadow-2xl shadow-brand-red/30 -translate-y-1' 
                    : 'bg-bg-surface text-text-dim border-white/5 hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        {/* Menu Grid */}
        <div className="flex-1 overflow-y-auto p-10 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 content-start">
          {menu.length === 0 ? (
            <div className="col-span-full py-40 flex flex-col items-center">
               <div className="w-24 h-24 rounded-6xl bg-bg-surface border border-white/5 flex items-center justify-center mb-8 opacity-20">
                  <Utensils size={40} className="text-white" />
               </div>
               <h3 className="text-xl font-black text-text-dim uppercase tracking-[0.3em]">Hệ thống chưa có thực đơn</h3>
               <button onClick={handleSaveAndGoBack} className="mt-6 text-brand-red font-black uppercase text-[10px] tracking-widest hover:underline">Vào mục hệ thống để thêm ngay</button>
            </div>
          ) : (
            filteredMenu.map(item => (
              <button
                key={item.id}
                onClick={() => handleAddItem(item)}
                className={`bg-bg-surface border hover:border-brand-red/50 rounded-[32px] flex flex-col justify-between items-start transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 active:scale-95 text-left group relative overflow-hidden ${
                  justAdded === item.id 
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/20' 
                    : 'border-white/5'
                } ${item.image ? 'h-auto' : 'h-56 p-8'}`}
              >
                {/* Image if exists */}
                {item.image && (
                  <div className="w-full h-32 overflow-hidden rounded-t-[32px]">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}

                <div className={`w-full relative z-10 ${item.image ? 'p-6' : ''}`}>
                  <div className="flex justify-between items-start mb-3">
                    {item.code && <span className="px-3 py-1 rounded-lg bg-bg-elevated text-brand-red text-[10px] font-black border border-white/5 uppercase">#{item.code}</span>}
                    <div className={`w-10 h-10 rounded-2xl border border-white/5 flex items-center justify-center transition-all transform duration-300 ${
                      justAdded === item.id 
                        ? 'bg-emerald-500 border-emerald-500/50 opacity-100 scale-110' 
                        : 'bg-bg-elevated opacity-0 group-hover:opacity-100 group-hover:scale-110'
                    }`}>
                      {justAdded === item.id ? <CheckCircle2 size={20} className="text-white" /> : <Plus size={20} className="text-brand-red" />}
                    </div>
                  </div>
                  <span className="font-black text-xl text-white block leading-snug group-hover:text-brand-red transition-colors capitalize line-clamp-2">{item.name}</span>
                </div>

                <div className={`w-full flex items-end justify-between relative z-10 ${item.image ? 'px-6 pb-6' : ''}`}>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-text-dim uppercase tracking-widest mb-1">Đơn giá</span>
                    <span className="text-3xl font-black text-brand-gold tracking-tight">{item.price}€</span>
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    justAdded === item.id ? 'text-emerald-400 opacity-100' : 'text-text-dim opacity-0 group-hover:opacity-100'
                  }`}>
                    {justAdded === item.id ? (
                      <><CheckCircle2 size={12} className="text-emerald-400" /> Đã thêm!</>
                    ) : (
                      <><Plus size={12} className="text-brand-red" /> Chọn món</>
                    )}
                  </div>
                </div>

                {/* Added flash */}
                {justAdded === item.id && (
                  <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bill Section - with clear separation of Save vs Checkout */}
      <div className="w-[450px] flex flex-col bg-bg-surface border-l border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)] no-print">
        <header className="p-10 border-b border-white/5 bg-bg-elevated/30 flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
               <Receipt size={14} className="text-brand-red" />
               <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Đơn hàng hiện tại</span>
            </div>
            <span className="text-3xl font-black tracking-tighter">{activeTable.name}</span>
          </div>
          <button 
            onClick={() => window.print()}
            className="group flex flex-col items-center gap-2 text-text-dim hover:text-brand-gold transition-all"
          >
            <div className="w-14 h-14 rounded-[20px] bg-bg-elevated border border-white/5 flex items-center justify-center group-hover:border-brand-gold transition-all shadow-xl">
              <Printer size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">In bếp</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-6 scrollbar-hide">
          {activeTable.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <Receipt size={100} strokeWidth={1} />
              <p className="font-black uppercase tracking-[0.4em] text-sm mt-6">Chưa có món</p>
            </div>
          ) : (
            activeTable.items.map((item, index) => (
              <div key={item.id} className="flex justify-between items-center group animate-reveal">
                <div className="flex items-center gap-3">
                  {item.image ? (
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-lg bg-bg-elevated border border-white/5 text-[10px] font-black flex items-center justify-center text-brand-red shadow-inner">1</div>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-black text-sm text-white uppercase tracking-tight line-clamp-1 max-w-[200px]">{item.name}</span>
                    <span className="text-[10px] font-bold text-text-dim">{item.price}€ / đơn vị</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-black text-lg text-brand-gold tracking-tight">{item.price}€</span>
                  <button 
                    onClick={() => removeItemFromTable(activeTable.id, index)}
                    className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white transition-all shadow-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with 2 clear actions */}
        <div className="p-8 bg-bg-deep border-t border-white/10 relative space-y-4">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em]">Tổng hiện tại</span>
            <span className="text-4xl font-black text-white tracking-tighter">{totalAmount.toFixed(2)}€</span>
          </div>

          {/* Primary: Save & go back (GREEN) */}
          <button 
            onClick={handleSaveAndGoBack}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-[28px] font-black text-sm uppercase tracking-widest shadow-[0_15px_30px_rgba(16,185,129,0.25)] flex items-center justify-center gap-3 transition-all active:scale-[0.97]"
          >
            <Save size={22} />
            LƯU ĐƠN & QUAY LẠI BÀN
          </button>

          {/* Secondary: Checkout (subtle) */}
          <button 
            disabled={activeTable.items.length === 0}
            onClick={() => setShowCheckoutChoose(true)}
            className="w-full bg-bg-surface hover:bg-bg-elevated text-text-secondary py-4 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] border border-white/10 hover:border-brand-red/30 flex items-center justify-center gap-3 transition-all disabled:opacity-20"
          >
            <Banknote size={18} />
            Thanh toán (khi khách xong bữa)
          </button>
        </div>
      </div>

      {/* Desktop: Choose checkout mode */}
      {showCheckoutChoose && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-reveal">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setShowCheckoutChoose(false)} />
          <div className="relative bg-bg-surface border border-white/10 w-full max-w-lg rounded-[48px] p-14 flex flex-col items-center text-center shadow-[0_50px_100px_rgba(0,0,0,1)]">
            <span className="text-[11px] font-black text-brand-red uppercase tracking-[0.5em] mb-3">Thanh toán — {activeTable.name}</span>
            <h3 className="text-5xl font-black mb-2 tracking-tighter">{totalAmount.toFixed(2)}€</h3>
            <p className="text-text-dim text-base mb-10">{activeTable.items.length} món</p>

            <div className="w-full space-y-4 mb-10">
              {/* Full payment option */}
              <button
                onClick={() => { setShowCheckoutChoose(false); setShowCheckout(true); }}
                className="w-full flex items-center gap-5 p-6 rounded-[32px] bg-bg-elevated border border-white/10 hover:border-brand-red/50 hover:bg-brand-red/5 transition-all text-left group"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red transition-all duration-300 shrink-0">
                  <Receipt size={28} className="text-brand-red group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-black text-xl text-white block mb-1">Trả toàn bộ</span>
                  <span className="text-sm font-bold text-text-dim">Thanh toán hết {totalAmount.toFixed(2)}€ một lần</span>
                </div>
              </button>

              {/* Split payment option */}
              <button
                onClick={() => { setShowCheckoutChoose(false); setShowSplitBill(true); }}
                className="w-full flex items-center gap-5 p-6 rounded-[32px] bg-bg-elevated border border-white/10 hover:border-brand-gold/50 hover:bg-brand-gold/5 transition-all text-left group"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center group-hover:bg-brand-gold transition-all duration-300 shrink-0">
                  <Scissors size={28} className="text-brand-gold group-hover:text-white" />
                </div>
                <div className="flex-1">
                  <span className="font-black text-xl text-white block mb-1">Tách đơn</span>
                  <span className="text-sm font-bold text-text-dim">Khách trả riêng — chọn món cho từng bill</span>
                </div>
              </button>
            </div>

            <button 
              onClick={() => setShowCheckoutChoose(false)}
              className="text-text-dim font-black uppercase text-[11px] tracking-[0.4em] hover:text-brand-red transition-colors"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* Desktop: Full Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-reveal">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-bg-surface border border-white/10 w-full max-w-xl rounded-[60px] p-16 flex flex-col items-center text-center shadow-[0_50px_100px_rgba(0,0,0,1)]">
            <div className="w-24 h-24 bg-brand-red rounded-[32px] flex items-center justify-center mb-10 shadow-2xl shadow-brand-red/40">
              <Receipt size={44} className="text-white" />
            </div>
            <span className="text-[11px] font-black text-brand-red uppercase tracking-[0.5em] mb-4">Trả toàn bộ</span>
            <h3 className="text-5xl font-black mb-3 tracking-tighter">Tổng {totalAmount.toFixed(2)}€</h3>
            <p className="text-text-secondary text-lg mb-12 max-w-xs">Chọn hình thức thanh toán cho <span className="text-white font-black">{activeTable.name}</span></p>
            
            <div className="grid grid-cols-2 gap-8 w-full mb-12">
              <button 
                onClick={() => { finalizeBill(activeTable.id, 'Cash'); setShowCheckout(false); }}
                className="group flex flex-col items-center gap-6 p-12 rounded-[48px] bg-bg-elevated border border-white/10 hover:border-brand-red/50 hover:bg-brand-red/5 transition-all shadow-2xl"
              >
                <div className="w-20 h-20 rounded-[24px] bg-brand-gold/10 flex items-center justify-center group-hover:bg-brand-gold transition-all duration-300">
                  <Banknote size={40} className="text-brand-gold group-hover:text-white" />
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.3em] text-text-dim group-hover:text-white">Tiền mặt</span>
              </button>
              <button 
                onClick={() => { finalizeBill(activeTable.id, 'Card'); setShowCheckout(false); }}
                className="group flex flex-col items-center gap-6 p-12 rounded-[48px] bg-bg-elevated border border-white/10 hover:border-brand-red/50 hover:bg-brand-red/5 transition-all shadow-2xl"
              >
                <div className="w-20 h-20 rounded-[24px] bg-brand-red/10 flex items-center justify-center group-hover:bg-brand-red transition-all duration-300">
                  <CreditCard size={40} className="text-brand-red group-hover:text-white" />
                </div>
                <span className="font-black uppercase text-[10px] tracking-[0.3em] text-text-dim group-hover:text-white">Thẻ (Card)</span>
              </button>
            </div>

            <button 
              onClick={() => setShowCheckout(false)}
              className="text-text-dim font-black uppercase text-[11px] tracking-[0.4em] hover:text-brand-red transition-colors"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      )}

      {/* Desktop: Split Bill Modal */}
      {showSplitBill && (
        <SplitBillModal
          table={activeTable}
          onSplitPay={(indices, paymentType) => {
            splitBill(activeTable.id, indices, paymentType);
            setShowSplitBill(false);
          }}
          onClose={() => setShowSplitBill(false)}
        />
      )}

      {/* Hidden Kitchen Print View */}
      <div className="hidden print-only">
        <div style={{ textAlign: 'center', margin: '30px 0', borderBottom: '3px solid #000', paddingBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '32px', letterSpacing: '5px' }}>BILL BẾP</h1>
          <div style={{ padding: '10px 20px', background: '#000', color: '#fff', fontSize: '28px', display: 'inline-block', margin: '15px 0', fontWeight: 'bold' }}>
            {activeTable.name.toUpperCase()}
          </div>
          <p style={{ fontSize: '14px', margin: 0 }}>Ngày: {new Date().toLocaleString('vi-VN')}</p>
        </div>
        <div style={{ padding: '0 10px', minHeight: '300px' }}>
          {activeTable.items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px dashed #ccc', paddingBottom: '10px' }}>
              <span style={{ fontSize: '30px', fontWeight: '900', marginRight: '20px' }}>1x</span>
              <span style={{ fontSize: '28px', fontWeight: '900', flex: 1 }}>{item.name.toUpperCase()}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '2px solid #000', paddingTop: '20px' }}>
          <p style={{ fontSize: '14px', fontWeight: 'bold' }}>***** SAKURA ZEN POS *****</p>
        </div>
      </div>
    </div>
  );
}
