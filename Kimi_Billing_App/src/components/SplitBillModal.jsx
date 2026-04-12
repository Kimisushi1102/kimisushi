import React, { useState } from 'react';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import {
  X,
  Check,
  Banknote,
  CreditCard,
  Receipt,
  Scissors,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';

/**
 * Split Bill Modal — works in 3 steps:
 * Step 1: Select which items to pay for this split
 * Step 2: Choose payment method for the selected items
 * Step 3: Done — remaining items stay on the table
 */
export default function SplitBillModal({ table, onSplitPay, onClose }) {
  const { isMobile } = useDeviceDetect();
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  const [step, setStep] = useState('select'); // 'select' | 'pay'

  const toggleItem = (index) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIndices.size === table.items.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(table.items.map((_, i) => i)));
    }
  };

  const selectedTotal = [...selectedIndices].reduce((sum, i) => {
    const item = table.items[i];
    return item ? sum + parseFloat(item.price.replace(',', '.')) : sum;
  }, 0);

  const remainingTotal = table.items.reduce((sum, item, i) => {
    return selectedIndices.has(i) ? sum : sum + parseFloat(item.price.replace(',', '.'));
  }, 0);

  const remainingCount = table.items.length - selectedIndices.size;

  const handlePay = (paymentType) => {
    onSplitPay([...selectedIndices], paymentType);
  };

  // ── Shared UI pieces ──
  const renderItemList = () => (
    <div className="space-y-2">
      {table.items.map((item, index) => {
        const isSelected = selectedIndices.has(index);
        return (
          <button
            key={item.id}
            onClick={() => toggleItem(index)}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
              isSelected
                ? 'bg-brand-red/10 border-brand-red/40'
                : 'bg-bg-deep border-white/5 hover:border-white/15 active:bg-bg-elevated'
            }`}
          >
            {/* Checkbox */}
            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
              isSelected 
                ? 'bg-brand-red border-brand-red' 
                : 'border-white/20 bg-transparent'
            }`}>
              {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
            </div>

            {/* Image if exists */}
            {item.image && (
              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-white/10">
                <img src={item.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Item info */}
            <div className="flex-1 text-left min-w-0">
              <span className={`font-black text-sm block truncate ${isSelected ? 'text-white' : 'text-text-secondary'}`}>
                {item.name}
              </span>
            </div>

            {/* Price */}
            <span className={`font-black text-base shrink-0 tracking-tight ${isSelected ? 'text-brand-gold' : 'text-text-dim'}`}>
              {item.price}€
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderPaymentStep = () => (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 bg-brand-red rounded-2xl flex items-center justify-center mb-5 shadow-xl shadow-brand-red/40">
        <Scissors size={28} className="text-white" />
      </div>
      <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.4em] mb-2">Tách đơn — Thanh toán</span>
      <h3 className="text-4xl font-black mb-1 tracking-tighter">{selectedTotal.toFixed(2)}€</h3>
      <p className="text-text-dim text-sm mb-2">{selectedIndices.size} món được chọn</p>
      {remainingCount > 0 && (
        <p className="text-[10px] font-bold text-text-dim mb-6">
          Còn lại {remainingCount} món ({remainingTotal.toFixed(2)}€) sẽ ở lại bàn
        </p>
      )}

      {/* Selected items summary */}
      <div className="w-full bg-bg-deep rounded-2xl p-4 mb-6 max-h-32 overflow-y-auto border border-white/5">
        {[...selectedIndices].map(i => {
          const item = table.items[i];
          return item ? (
            <div key={item.id} className="flex justify-between items-center py-1.5 text-sm">
              <span className="text-text-secondary truncate mr-3">{item.name}</span>
              <span className="font-black text-brand-gold shrink-0">{item.price}€</span>
            </div>
          ) : null;
        })}
      </div>

      <div className={`grid grid-cols-2 gap-4 w-full ${isMobile ? 'mb-4' : 'mb-6'}`}>
        <button
          onClick={() => handlePay('Cash')}
          className={`flex flex-col items-center gap-3 rounded-3xl bg-bg-elevated border border-white/10 transition-all ${
            isMobile ? 'p-5 active:border-brand-gold/50 active:bg-brand-gold/5' : 'p-8 hover:border-brand-gold/50 hover:bg-brand-gold/5'
          }`}
        >
          <div className={`rounded-2xl bg-brand-gold/10 flex items-center justify-center ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}>
            <Banknote size={isMobile ? 24 : 32} className="text-brand-gold" />
          </div>
          <span className="font-black uppercase text-[9px] tracking-[0.2em] text-text-dim">Tiền mặt</span>
        </button>
        <button
          onClick={() => handlePay('Card')}
          className={`flex flex-col items-center gap-3 rounded-3xl bg-bg-elevated border border-white/10 transition-all ${
            isMobile ? 'p-5 active:border-brand-red/50 active:bg-brand-red/5' : 'p-8 hover:border-brand-red/50 hover:bg-brand-red/5'
          }`}
        >
          <div className={`rounded-2xl bg-brand-red/10 flex items-center justify-center ${isMobile ? 'w-12 h-12' : 'w-16 h-16'}`}>
            <CreditCard size={isMobile ? 24 : 32} className="text-brand-red" />
          </div>
          <span className="font-black uppercase text-[9px] tracking-[0.2em] text-text-dim">Thẻ (Card)</span>
        </button>
      </div>

      <button
        onClick={() => setStep('select')}
        className="text-text-dim font-black uppercase text-[10px] tracking-[0.3em] hover:text-white active:text-white transition-colors flex items-center gap-2 py-2"
      >
        <ArrowLeft size={14} /> Quay lại chọn món
      </button>
    </div>
  );

  // ── MOBILE ──
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-[200] flex items-end justify-center animate-reveal">
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose} />
        <div className="relative bg-bg-surface border-t border-white/10 w-full rounded-t-[36px] max-h-[90vh] flex flex-col safe-area-bottom shadow-[0_-30px_60px_rgba(0,0,0,1)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {step === 'select' ? (
            <div className="flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-6 pb-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Scissors size={14} className="text-brand-red" />
                    <span className="text-[9px] font-black text-brand-red uppercase tracking-[0.3em]">Tách đơn</span>
                  </div>
                  <span className="text-xl font-black tracking-tight">{table.name}</span>
                </div>
                <button onClick={onClose} className="w-9 h-9 rounded-xl bg-bg-elevated border border-white/10 flex items-center justify-center">
                  <X size={14} />
                </button>
              </div>

              {/* Select all toggle */}
              <div className="px-6 pb-3">
                <button
                  onClick={selectAll}
                  className="text-[9px] font-black text-brand-gold uppercase tracking-widest active:text-white transition-colors"
                >
                  {selectedIndices.size === table.items.length ? '✕ Bỏ chọn tất cả' : '☑ Chọn tất cả'}
                </button>
              </div>

              {/* Items with checkboxes */}
              <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0 max-h-[40vh]">
                {renderItemList()}
              </div>

              {/* Footer with totals */}
              <div className="px-6 py-4 bg-bg-deep border-t border-white/10 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-black text-text-dim uppercase tracking-widest block">Đã chọn {selectedIndices.size} món</span>
                    {remainingCount > 0 && (
                      <span className="text-[8px] font-bold text-text-dim">Còn lại: {remainingCount} món ({remainingTotal.toFixed(2)}€)</span>
                    )}
                  </div>
                  <span className="text-2xl font-black text-white tracking-tighter">{selectedTotal.toFixed(2)}€</span>
                </div>
                <button
                  disabled={selectedIndices.size === 0}
                  onClick={() => setStep('pay')}
                  className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-red/30 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform disabled:opacity-30"
                >
                  Thanh toán phần này <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-6 overflow-y-auto">
              {renderPaymentStep()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-reveal">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={onClose} />
      <div className="relative bg-bg-surface border border-white/10 w-full max-w-2xl rounded-[48px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,1)] flex flex-col max-h-[85vh]">
        
        {step === 'select' ? (
          <>
            {/* Header */}
            <div className="p-10 pb-6 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg shadow-brand-red/30">
                  <Scissors size={26} className="text-white" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.4em] block mb-1">Tách đơn — {table.name}</span>
                  <span className="text-2xl font-black tracking-tight">Chọn món để thanh toán riêng</span>
                </div>
              </div>
              <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-bg-elevated border border-white/10 flex items-center justify-center hover:border-white/30 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Select all */}
            <div className="px-10 py-4 border-b border-white/5 flex justify-between items-center">
              <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">
                {table.items.length} món trên bàn
              </span>
              <button
                onClick={selectAll}
                className="text-[10px] font-black text-brand-gold uppercase tracking-widest hover:text-white transition-colors"
              >
                {selectedIndices.size === table.items.length ? '✕ Bỏ chọn tất cả' : '☑ Chọn tất cả'}
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-10 py-4 min-h-0">
              {renderItemList()}
            </div>

            {/* Footer */}
            <div className="p-10 pt-6 bg-bg-deep border-t border-white/10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <span className="text-[10px] font-black text-text-dim uppercase tracking-[0.3em] block">Phần thanh toán: {selectedIndices.size} món</span>
                  {remainingCount > 0 && (
                    <span className="text-[10px] font-bold text-text-dim">Còn lại trên bàn: {remainingCount} món ({remainingTotal.toFixed(2)}€)</span>
                  )}
                </div>
                <span className="text-4xl font-black text-white tracking-tighter">{selectedTotal.toFixed(2)}€</span>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  className="px-8 py-5 rounded-[24px] bg-bg-surface border border-white/10 text-text-dim font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  disabled={selectedIndices.size === 0}
                  onClick={() => setStep('pay')}
                  className="flex-1 bg-brand-red text-white py-5 rounded-[24px] font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-red/30 flex items-center justify-center gap-3 hover:bg-brand-redDim transition-all disabled:opacity-30"
                >
                  Thanh toán phần này <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 overflow-y-auto">
            {renderPaymentStep()}
          </div>
        )}
      </div>
    </div>
  );
}
