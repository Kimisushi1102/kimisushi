import React, { createContext, useContext, useState } from 'react';
import { usePersistence } from '../hooks/usePersistence';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Data structure for tables
  const [tables, setTables] = usePersistence('kimi_tables_local', [
    { id: 'T1', name: 'Bàn 1', zone: 'Khu A', status: 'empty', items: [] },
    { id: 'T2', name: 'Bàn 2', zone: 'Khu A', status: 'empty', items: [] },
    { id: 'T3', name: 'Bàn 3', zone: 'Khu B', status: 'empty', items: [] },
    { id: 'T4', name: 'Bàn 4', zone: 'Khu B', status: 'empty', items: [] },
  ]);

  // Data structure for menu
  const [menu, setMenu] = usePersistence('kimi_menu_local', []);

  // Data structure for transaction history
  const [history, setHistory] = usePersistence('kimi_history_local', []);

  // Application state
  const [activeTableId, setActiveTableId] = useState(null);
  const [view, setView] = useState('tables'); // 'tables', 'admin', 'history'

  const activeTable = tables.find(t => t.id === activeTableId);

  // Helper actions
  const addItemToTable = (tableId, item) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          status: 'occupied',
          items: [...t.items, { ...item, timestamp: Date.now(), id: `${item.id}-${Date.now()}` }]
        };
      }
      return t;
    }));
  };

  const removeItemFromTable = (tableId, itemIndex) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const newItems = [...t.items];
        newItems.splice(itemIndex, 1);
        return {
          ...t,
          items: newItems,
          status: newItems.length === 0 ? 'empty' : 'occupied'
        };
      }
      return t;
    }));
  };

  const clearTable = (tableId) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return { ...t, status: 'empty', items: [] };
      }
      return t;
    }));
  };

  // Full bill payment
  const finalizeBill = (tableId, paymentType) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || table.items.length === 0) return;

    const total = table.items.reduce((sum, item) => sum + parseFloat(item.price.replace(',', '.')), 0);
    
    const newRecord = {
      id: `BIL-${Date.now()}`,
      date: new Date().toISOString(),
      tableName: table.name,
      items: table.items,
      total: total,
      paymentType: paymentType
    };

    setHistory(prev => [newRecord, ...prev]);
    clearTable(tableId);
    setActiveTableId(null);
  };

  // Split bill payment — pay only selected items, rest stays on table
  const splitBill = (tableId, selectedIndices, paymentType) => {
    const table = tables.find(t => t.id === tableId);
    if (!table || selectedIndices.length === 0) return;

    const selectedItems = selectedIndices.map(i => table.items[i]).filter(Boolean);
    const total = selectedItems.reduce((sum, item) => sum + parseFloat(item.price.replace(',', '.')), 0);

    // Record the split bill
    const newRecord = {
      id: `SPL-${Date.now()}`,
      date: new Date().toISOString(),
      tableName: table.name,
      items: selectedItems,
      total: total,
      paymentType: paymentType,
      isSplit: true
    };
    setHistory(prev => [newRecord, ...prev]);

    // Remove selected items from table, keep the rest
    const remainingItems = table.items.filter((_, idx) => !selectedIndices.includes(idx));
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        return {
          ...t,
          items: remainingItems,
          status: remainingItems.length === 0 ? 'empty' : 'occupied'
        };
      }
      return t;
    }));

    // If table is now empty, go back to table list
    if (remainingItems.length === 0) {
      setActiveTableId(null);
    }
  };

  const value = {
    tables, setTables,
    menu, setMenu,
    history, setHistory,
    activeTableId, setActiveTableId,
    activeTable,
    view, setView,
    addItemToTable,
    removeItemFromTable,
    clearTable,
    finalizeBill,
    splitBill
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
