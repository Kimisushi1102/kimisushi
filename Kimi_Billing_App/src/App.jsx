import React from 'react';
import { useApp } from './context/AppContext';
import { useDeviceDetect } from './hooks/useDeviceDetect';
import TableView from './components/TableView';
import MenuView from './components/MenuView';
import AdminView from './components/AdminView';
import HistoryView from './components/HistoryView';
import Sidebar from './components/Sidebar';
import MobileNav from './components/MobileNav';

function App() {
  const { view, activeTableId } = useApp();
  const { isMobile } = useDeviceDetect();

  // ── MOBILE LAYOUT ──
  if (isMobile) {
    return (
      <div className="flex flex-col h-screen w-screen bg-bg-deep text-text-primary overflow-hidden font-sans select-none">
        {/* Main Content - fills screen above bottom nav */}
        <main className="flex-1 relative overflow-hidden flex flex-col bg-bg-deep">
          {activeTableId ? (
            <MenuView />
          ) : (
            <>
              {view === 'tables' && <TableView />}
              {view === 'admin' && <AdminView />}
              {view === 'history' && <HistoryView />}
            </>
          )}

          {/* Ambient glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-red/5 blur-[100px] -z-10 pointer-events-none" />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav />
      </div>
    );
  }

  // ── DESKTOP LAYOUT ──
  return (
    <div className="flex h-screen w-screen bg-bg-deep text-text-primary overflow-hidden font-sans select-none">
      {/* Sidebar - Fixed width */}
      <Sidebar />

      {/* Main Content Area - Fills remaining space */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-bg-deep">
        {activeTableId ? (
          <MenuView />
        ) : (
          <>
            {view === 'tables' && <TableView />}
            {view === 'admin' && <AdminView />}
            {view === 'history' && <HistoryView />}
          </>
        )}
        
        {/* Subtle global gradient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-red/5 blur-[150px] -z-10 pointer-events-none" />
      </main>
    </div>
  );
}

export default App;
