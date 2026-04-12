import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { useDeviceDetect } from '../hooks/useDeviceDetect';
import { Plus, Trash2, Package, LayoutGrid, Utensils, MapPin, Hash, Image, X, ChevronDown } from 'lucide-react';

// ── Helper: compress image to base64 thumbnail ──
function compressImage(file, maxWidth = 300, quality = 0.7) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── Category Dropdown Component ──
function CategorySelect({ value, onChange, existingCategories, isMobile }) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleSelect = (cat) => {
    onChange(cat);
    setOpen(false);
    setCustomMode(false);
  };

  const handleNewCategory = () => {
    setCustomMode(true);
    onChange('');
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const baseInput = isMobile
    ? "w-full bg-bg-deep border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-brand-red transition-all"
    : "bg-bg-deep border border-white/10 rounded-2xl p-6 text-sm font-bold outline-none focus:border-brand-red focus:bg-bg-elevated transition-all shadow-xl";

  if (customMode) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Nhập danh mục mới..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className={baseInput}
        />
        <button
          type="button"
          onClick={() => { setCustomMode(false); onChange(''); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-bg-surface text-text-dim hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`${baseInput} w-full text-left flex items-center justify-between cursor-pointer ${!value ? 'text-text-dim' : 'text-white'}`}
      >
        <span className="truncate">{value || 'Chọn danh mục...'}</span>
        <ChevronDown size={16} className={`text-text-dim shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 left-0 right-0 bg-bg-elevated border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-reveal">
          {existingCategories.length > 0 && (
            <>
              <div className="px-4 py-2 text-[8px] font-black text-text-dim uppercase tracking-widest border-b border-white/5">Danh mục có sẵn</div>
              {existingCategories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={`w-full text-left px-4 py-3 text-sm font-bold transition-colors flex items-center gap-2 ${
                    value === cat ? 'bg-brand-red/10 text-brand-red' : 'text-white hover:bg-white/5 active:bg-white/10'
                  }`}
                >
                  {value === cat && <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />}
                  {cat}
                </button>
              ))}
            </>
          )}
          <div className="border-t border-white/5">
            <button
              type="button"
              onClick={handleNewCategory}
              className="w-full text-left px-4 py-3 text-sm font-bold text-brand-gold hover:bg-white/5 active:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Plus size={14} /> Tạo danh mục mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminView() {
  const { menu, setMenu, tables, setTables } = useApp();
  const { isMobile } = useDeviceDetect();
  const [activeTab, setActiveTab] = useState('menu');

  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: '', category: '', code: '', image: '' });
  const [newTable, setNewTable] = useState({ name: '', zone: '' });
  const fileInputRef = useRef(null);

  // Get unique existing categories
  const existingCategories = useMemo(() => {
    const cats = menu.map(m => m.category).filter(Boolean);
    return [...new Set(cats)];
  }, [menu]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setNewMenuItem(prev => ({ ...prev, image: compressed }));
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  const removeImage = () => {
    setNewMenuItem(prev => ({ ...prev, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddMenuItem = () => {
    if (!newMenuItem.name || !newMenuItem.price) return;
    const item = {
      ...newMenuItem,
      id: `M-${Date.now()}`,
      price: newMenuItem.price.replace('.', ',')
    };
    setMenu([...menu, item]);
    setNewMenuItem({ name: '', price: '', category: '', code: '', image: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteMenuItem = (id) => {
    if (window.confirm('Xóa món ăn này?')) {
      setMenu(menu.filter(m => m.id !== id));
    }
  };

  const handleAddTable = () => {
    if (!newTable.name || !newTable.zone) return;
    const table = {
      ...newTable,
      id: `T-${Date.now()}`,
      status: 'empty',
      items: []
    };
    setTables([...tables, table]);
    setNewTable({ name: '', zone: '' });
  };

  const handleDeleteTable = (id) => {
    if (window.confirm('Xóa bàn này?')) {
      setTables(tables.filter(t => t.id !== id));
    }
  };

  // ── MOBILE ──
  if (isMobile) {
    return (
      <div className="flex-1 overflow-y-auto animate-reveal pb-24">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 bg-bg-deep/95 backdrop-blur-xl px-5 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-0.5 bg-brand-gold rounded-full" />
            <span className="text-[8px] font-black uppercase tracking-[0.3em] text-brand-gold">Hệ thống</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-4">Thiết lập</h1>

          {/* Tab Switcher */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] transition-all border ${
                activeTab === 'menu'
                  ? 'bg-brand-red border-brand-red text-white shadow-md shadow-brand-red/20'
                  : 'bg-bg-surface text-text-dim border-white/5'
              }`}
            >
              <Utensils size={14} /> Menu
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] transition-all border ${
                activeTab === 'tables'
                  ? 'bg-brand-red border-brand-red text-white shadow-md shadow-brand-red/20'
                  : 'bg-bg-surface text-text-dim border-white/5'
              }`}
            >
              <LayoutGrid size={14} /> Bàn
            </button>
          </div>
        </header>

        <div className="px-4 pt-4">
          {activeTab === 'menu' && (
            <div className="space-y-4 animate-reveal">
              {/* Add Menu Form - Mobile */}
              <div className="bg-bg-surface p-5 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20">
                    <Package size={18} />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">Thêm món mới</h3>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tên món ăn"
                    value={newMenuItem.name}
                    onChange={e => setNewMenuItem({...newMenuItem, name: e.target.value})}
                    className="w-full bg-bg-deep border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-brand-red transition-all"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Giá (€)"
                      value={newMenuItem.price}
                      onChange={e => setNewMenuItem({...newMenuItem, price: e.target.value})}
                      className="bg-bg-deep border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-brand-red transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Mã món (01...)"
                      value={newMenuItem.code}
                      onChange={e => setNewMenuItem({...newMenuItem, code: e.target.value})}
                      className="bg-bg-deep border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-brand-red transition-all"
                    />
                  </div>

                  {/* Category Dropdown - Mobile */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim ml-1">Danh mục</label>
                    <CategorySelect
                      value={newMenuItem.category}
                      onChange={(cat) => setNewMenuItem({...newMenuItem, category: cat})}
                      existingCategories={existingCategories}
                      isMobile={true}
                    />
                  </div>

                  {/* Image Upload - Mobile */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-text-dim ml-1">Ảnh món (tùy chọn)</label>
                    {newMenuItem.image ? (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10">
                        <img src={newMenuItem.image} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          onClick={removeImage}
                          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-bg-deep border border-dashed border-white/15 rounded-xl p-4 flex items-center justify-center gap-2 text-sm font-bold text-text-dim active:border-brand-red transition-all"
                      >
                        <Image size={16} /> Chọn ảnh...
                      </button>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  <button
                    onClick={handleAddMenuItem}
                    className="w-full bg-brand-red text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-red/30 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  >
                    <Plus size={16} strokeWidth={3} /> Lưu món
                  </button>
                </div>
              </div>

              {/* Menu List - Mobile Cards */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-2 mb-2">
                  <span className="text-[9px] font-black text-text-dim uppercase tracking-widest">Thực đơn</span>
                  <span className="text-[9px] font-black text-brand-gold tracking-widest">{menu.length} món</span>
                </div>
                {menu.map(item => (
                  <div key={item.id} className="bg-bg-surface rounded-2xl p-4 border border-white/5 flex items-center gap-3">
                    {/* Thumbnail */}
                    {item.image && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.code && <span className="px-2 py-0.5 rounded-md bg-bg-deep text-brand-red text-[8px] font-black border border-white/5">#{item.code}</span>}
                        <span className="text-[9px] font-black text-text-dim uppercase tracking-wider">{item.category || '--'}</span>
                      </div>
                      <span className="font-black text-white text-sm block truncate">{item.name}</span>
                    </div>
                    <span className="text-lg font-black text-brand-gold shrink-0">{item.price}€</span>
                    <button
                      onClick={() => handleDeleteMenuItem(item.id)}
                      className="p-2.5 rounded-xl bg-bg-deep text-text-dim active:text-brand-red border border-white/10 active:border-brand-red/30 transition-all shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {menu.length === 0 && (
                  <div className="py-16 flex flex-col items-center opacity-20">
                    <Utensils size={40} />
                    <p className="font-black uppercase text-[10px] tracking-widest mt-3">Trống</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tables' && (
            <div className="space-y-4 animate-reveal">
              {/* Add Table Form - Mobile */}
              <div className="bg-bg-surface p-5 rounded-3xl border border-white/5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold border border-brand-gold/20">
                    <MapPin size={18} />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">Thiết lập bàn</h3>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tên bàn (Bàn 01, VIP...)"
                    value={newTable.name}
                    onChange={e => setNewTable({...newTable, name: e.target.value})}
                    className="w-full bg-bg-deep border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-brand-gold transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Khu vực (Tầng 1, Khu A...)"
                    value={newTable.zone}
                    onChange={e => setNewTable({...newTable, zone: e.target.value})}
                    className="w-full bg-bg-deep border border-white/10 rounded-xl p-4 text-sm font-bold outline-none focus:border-brand-gold transition-all"
                  />
                  <button
                    onClick={handleAddTable}
                    className="w-full bg-brand-gold text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  >
                    <Plus size={16} strokeWidth={3} /> Thêm bàn
                  </button>
                </div>
              </div>

              {/* Tables List - Mobile */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-text-dim uppercase tracking-widest px-2">{tables.length} bàn</span>
                {tables.map(table => (
                  <div key={table.id} className="bg-bg-surface rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[8px] font-black text-brand-red uppercase tracking-[0.3em] block mb-0.5">{table.zone}</span>
                      <span className="text-xl font-black text-white tracking-tight">{table.name}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteTable(table.id)}
                      className="p-3 rounded-xl bg-bg-deep text-text-dim active:text-brand-red border border-white/10 active:border-brand-red/30 transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── DESKTOP ──
  return (
    <div className="flex-1 p-12 overflow-y-auto animate-reveal relative">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-gold/5 blur-[150px] -z-10 pointer-events-none" />

      <header className="mb-14">
        <div className="flex items-center gap-3 mb-3">
           <div className="w-10 h-1 bg-brand-gold rounded-full shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold">Hệ thống quản trị</span>
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white mb-3">Thiết lập cửa hàng</h1>
        <p className="text-text-secondary text-lg">Cấu hình danh mục thực đơn và sơ đồ phân phối bàn</p>
      </header>

      <div className="flex gap-4 mb-12">
        <button 
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-4 px-12 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'menu' ? 'bg-brand-red text-white shadow-2xl shadow-brand-red/30 -translate-y-1' : 'bg-bg-surface text-text-dim border border-white/5 hover:text-text-secondary'}`}
        >
          <Utensils size={18} /> Quản lý Menu
        </button>
        <button 
          onClick={() => setActiveTab('tables')}
          className={`flex items-center gap-4 px-12 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'tables' ? 'bg-brand-red text-white shadow-2xl shadow-brand-red/30 -translate-y-1' : 'bg-bg-surface text-text-dim border border-white/5 hover:text-text-secondary'}`}
        >
          <LayoutGrid size={18} /> Sơ đồ bàn
        </button>
      </div>

      {activeTab === 'menu' && (
        <div className="space-y-12 animate-reveal">
          {/* Add Menu Form */}
          <div className="bg-bg-surface p-12 rounded-[48px] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand-red/5 blur-[60px] pointer-events-none" />
            
            <div className="flex items-center gap-5 mb-10">
               <div className="w-16 h-16 rounded-3xl bg-brand-red/10 flex items-center justify-center text-brand-red border border-brand-red/20">
                  <Package size={28} />
               </div>
               <h3 className="text-3xl font-black text-white tracking-tight">Thêm món mới</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Name */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Tên món ăn</label>
                <input 
                  type="text" 
                  placeholder="Vd: Sake Nigiri"
                  value={newMenuItem.name}
                  onChange={e => setNewMenuItem({...newMenuItem, name: e.target.value})}
                  className="bg-bg-deep border border-white/10 rounded-2xl p-6 text-sm font-bold outline-none focus:border-brand-red focus:bg-bg-elevated transition-all shadow-xl"
                />
              </div>
              {/* Price */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Đơn giá (€)</label>
                <input 
                  type="text" 
                  placeholder="Vd: 5.90"
                  value={newMenuItem.price}
                  onChange={e => setNewMenuItem({...newMenuItem, price: e.target.value})}
                  className="bg-bg-deep border border-white/10 rounded-2xl p-6 text-sm font-bold outline-none focus:border-brand-red focus:bg-bg-elevated transition-all shadow-xl"
                />
              </div>
              {/* Category Dropdown */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Danh mục</label>
                <CategorySelect
                  value={newMenuItem.category}
                  onChange={(cat) => setNewMenuItem({...newMenuItem, category: cat})}
                  existingCategories={existingCategories}
                  isMobile={false}
                />
              </div>
              {/* Code */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Mã món</label>
                <input 
                  type="text" 
                  placeholder="Vd: 01"
                  value={newMenuItem.code}
                  onChange={e => setNewMenuItem({...newMenuItem, code: e.target.value})}
                  className="bg-bg-deep border border-white/10 rounded-2xl p-6 text-sm font-bold outline-none focus:border-brand-red focus:bg-bg-elevated transition-all shadow-xl"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div className="mt-8">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2 block mb-3">Ảnh minh họa (tùy chọn)</label>
              <div className="flex items-start gap-6">
                {newMenuItem.image ? (
                  <div className="relative w-40 h-28 rounded-2xl overflow-hidden border border-white/10 shadow-lg group/img">
                    <img src={newMenuItem.image} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-brand-red"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-40 h-28 bg-bg-deep border border-dashed border-white/15 rounded-2xl flex flex-col items-center justify-center gap-2 text-text-dim hover:border-brand-red/50 hover:text-brand-red transition-all cursor-pointer group/upload"
                  >
                    <Image size={24} className="group-hover/upload:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Chọn ảnh</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-[10px] text-text-dim leading-relaxed max-w-xs mt-2">
                  Ảnh sẽ được nén tự động. Bạn có thể bỏ qua bước này nếu không cần ảnh.
                </p>
              </div>
            </div>

            <button 
              onClick={handleAddMenuItem}
              className="mt-12 bg-brand-red hover:bg-brand-redDim text-white px-14 py-6 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_20px_40px_rgba(179,27,27,0.3)] active:scale-95 flex items-center gap-4"
            >
              <Plus size={22} strokeWidth={3} /> Lưu vào thực đơn
            </button>
          </div>

          {/* Menu Dashboard Table */}
          <div className="bg-bg-surface rounded-6xl overflow-hidden border border-white/5 shadow-2xl">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-bg-elevated/20">
               <span className="text-[11px] font-black uppercase tracking-[0.4em] text-text-secondary italic">Inventory Database</span>
               <div className="px-5 py-2 rounded-full bg-bg-deep border border-white/10 text-[10px] font-black tracking-widest text-brand-gold">
                  {menu.length} Món ăn
               </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-hide">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-text-dim text-[11px] font-black uppercase tracking-widest bg-bg-elevated/40">
                    <th className="p-8">Ảnh</th>
                    <th className="p-8">CODE</th>
                    <th className="p-8">Tên món chi tiết</th>
                    <th className="p-8">Danh mục</th>
                    <th className="p-8 text-brand-gold">Đơn giá</th>
                    <th className="p-8 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {menu.map(item => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-8">
                        {item.image ? (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-bg-deep border border-white/5 flex items-center justify-center">
                            <Utensils size={16} className="text-text-dim opacity-30" />
                          </div>
                        )}
                      </td>
                      <td className="p-8">
                        <span className="px-4 py-1.5 rounded-lg bg-bg-deep text-brand-red text-[10px] font-black border border-white/5">
                          {item.code || 'N/A'}
                        </span>
                      </td>
                      <td className="p-8">
                         <span className="font-black text-white uppercase text-base tracking-tight">{item.name}</span>
                      </td>
                      <td className="p-8">
                        <span className="text-xs font-black text-text-dim uppercase tracking-wider">{item.category || '--'}</span>
                      </td>
                      <td className="p-8">
                        <span className="text-2xl font-black text-white tracking-tighter">{item.price}€</span>
                      </td>
                      <td className="p-8 text-right">
                        <button 
                          onClick={() => handleDeleteMenuItem(item.id)}
                          className="p-4 rounded-[20px] bg-bg-deep text-text-dim hover:text-brand-red border border-white/10 hover:border-brand-red/30 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {menu.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-32 text-center opacity-10">
                         <Utensils size={80} className="mx-auto mb-6" />
                         <p className="font-black uppercase text-sm tracking-[0.4em]">Database Empty</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tables' && (
        <div className="space-y-12 animate-reveal">
          <div className="bg-bg-surface p-12 rounded-[48px] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-brand-gold/5 blur-[60px] pointer-events-none" />

            <div className="flex items-center gap-5 mb-10">
               <div className="w-16 h-16 rounded-3xl bg-brand-gold/10 flex items-center justify-center text-brand-gold border border-brand-gold/20">
                  <MapPin size={28} />
               </div>
               <h3 className="text-3xl font-black text-white tracking-tight">Thiết lập bàn</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Tên định danh (Bàn 01, Pro...)</label>
                <input 
                  type="text" 
                  placeholder="Vd: Bàn V.I.P"
                  value={newTable.name}
                  onChange={e => setNewTable({...newTable, name: e.target.value})}
                  className="bg-bg-deep border border-white/10 rounded-2xl p-6 text-sm font-bold outline-none focus:border-brand-red focus:bg-bg-elevated transition-all shadow-xl"
                />
              </div>
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-dim ml-2">Khu vực phân vùng</label>
                <input 
                  type="text" 
                  placeholder="Vd: Tầng 1"
                  value={newTable.zone}
                  onChange={e => setNewTable({...newTable, zone: e.target.value})}
                  className="bg-bg-deep border border-white/10 rounded-2xl p-6 text-sm font-bold outline-none focus:border-brand-red focus:bg-bg-elevated transition-all shadow-xl"
                />
              </div>
            </div>
            <button 
              onClick={handleAddTable}
              className="mt-12 bg-brand-gold hover:opacity-80 text-black px-14 py-6 rounded-[28px] font-black text-xs uppercase tracking-[0.3em] transition-all shadow-[0_20px_40px_rgba(212,175,55,0.2)] active:scale-95 flex items-center gap-4"
            >
              <Plus size={22} strokeWidth={3} /> Đăng ký vùng ngồi
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {tables.map(table => (
              <div key={table.id} className="bg-bg-surface p-10 rounded-[48px] border border-white/5 flex justify-between items-center group relative overflow-hidden transition-all hover:bg-bg-elevated">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.02] blur-3xl pointer-events-none" />
                <div className="flex flex-col relative z-10">
                  <span className="text-[10px] font-black text-brand-red uppercase tracking-[0.4em] mb-2">{table.zone}</span>
                  <span className="text-3xl font-black text-white tracking-tighter">{table.name}</span>
                </div>
                <button 
                  onClick={() => handleDeleteTable(table.id)} 
                  className="opacity-0 group-hover:opacity-100 p-5 bg-bg-deep rounded-3xl text-text-dim hover:text-brand-red border border-white/10 hover:border-brand-red/30 transition-all z-10"
                >
                  <Trash2 size={24} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
