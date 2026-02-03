import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import SalesScreen from './components/SalesScreen';
import ReceiptPreview from './components/ReceiptPreview';
import SalesHistory from './components/SalesHistory';
import ProductsSync from './components/ProductsSync';
import SettingsScreen from './components/SettingsScreen';
import Navigation from './components/Navigation';
import { CartItem, Sale } from './types/sales';
import { saveSaleOffline, getAllSales, getPendingSalesCount } from './storage/offlineSales';
import { syncPendingSales } from './utils/salesSync';
import { getProductsLastSyncedAt, syncProductsFromApi } from './storage/offlineProducts';

export type Screen = 'login' | 'sales' | 'receipt' | 'history' | 'sync' | 'settings';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentSale, setCurrentSale] = useState<Sale | null>(null);
  const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [lastSalesSync, setLastSalesSync] = useState<string | null>(null);
  const [lastProductsSync, setLastProductsSync] = useState<string | null>(null);

  const isBrowser = typeof window !== 'undefined';

  const refreshSalesFromStorage = useCallback(async () => {
    if (!isBrowser) return;
    const sales = await getAllSales();
    setSalesHistory(sales);
    const pending = sales.filter((sale) => !sale.synced).length;
    setPendingSalesCount(pending);
  }, [isBrowser]);

  const syncSales = useCallback(async () => {
    if (!isBrowser) return;
    const pending = await getPendingSalesCount();
    if (pending === 0) {
      setPendingSalesCount(0);
      return;
    }

    setIsSyncingCloud(true);
    try {
      const result = await syncPendingSales();
      if (result.synced > 0) {
        setLastSalesSync(new Date().toLocaleString());
      }
      await refreshSalesFromStorage();
    } catch (error) {
      console.error('Failed to sync sales', error);
    } finally {
      setIsSyncingCloud(false);
    }
  }, [isBrowser, refreshSalesFromStorage]);

  const refreshProductsSyncTime = useCallback(() => {
    const raw = getProductsLastSyncedAt();
    if (!raw) {
      setLastProductsSync(null);
      return;
    }

    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) {
      setLastProductsSync(new Date(parsed).toLocaleString());
      return;
    }

    setLastProductsSync(raw);
  }, []);

  const syncCloud = useCallback(async () => {
    if (!isBrowser) return;
    if (!navigator.onLine) {
      throw new Error('Device is offline. Connect to the internet to sync.');
    }

    const errors: string[] = [];

    setIsSyncingCloud(true);
    try {
      try {
        await syncProductsFromApi({ force: true });
        refreshProductsSyncTime();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync products.';
        errors.push(message);
      }

      try {
        const result = await syncPendingSales();
        if (result.synced > 0) {
          setLastSalesSync(new Date().toLocaleString());
        }
        await refreshSalesFromStorage();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to sync sales.';
        errors.push(message);
      }
    } finally {
      setIsSyncingCloud(false);
    }

    if (errors.length > 0) {
      throw new Error(errors.join(' '));
    }
  }, [isBrowser, refreshProductsSyncTime, refreshSalesFromStorage]);

  // Check for existing auth token on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoggedIn(true);
      setCurrentScreen('sales');
    }
  }, []);

  useEffect(() => {
    if (!isBrowser) return;
    refreshSalesFromStorage();
    refreshProductsSyncTime();
  }, [isBrowser, refreshSalesFromStorage, refreshProductsSyncTime]);

  useEffect(() => {
    if (!isBrowser) return;

    const handler = () => {
      refreshProductsSyncTime();
    };

    window.addEventListener('products-updated', handler as EventListener);
    return () => window.removeEventListener('products-updated', handler as EventListener);
  }, [isBrowser, refreshProductsSyncTime]);

  useEffect(() => {
    if (!isBrowser) return;
    const handleOnline = () => {
      syncSales();
      syncProductsFromApi({ force: false }).catch((error) => {
        console.error('Failed to auto-sync products', error);
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isBrowser, syncSales]);

  useEffect(() => {
    if (!isBrowser) return;

    const interval = window.setInterval(() => {
      if (!navigator.onLine) return;
      syncProductsFromApi({ force: false }).catch((error) => {
        console.error('Failed to background-sync products', error);
      });
    }, 15 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [isBrowser]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setCurrentScreen('sales');
  };

  const handleLogout = () => {
    // Clear auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    
    setIsLoggedIn(false);
    setCurrentScreen('login');
    setCart([]);
  };

  const handleCompleteSale = async (sale: Sale) => {
    const saleRecord: Sale = { ...sale, synced: false };
    await saveSaleOffline(saleRecord);
    setCurrentSale(saleRecord);
    await refreshSalesFromStorage();
    setCart([]);
    setCurrentScreen('receipt');

    if (isBrowser && navigator.onLine) {
      syncSales();
    }
  };

  const handleBackToPOS = () => {
    setCurrentScreen('sales');
    setCurrentSale(null);
  };

  const handleViewInvoice = (sale: Sale) => {
    setCurrentSale(sale);
    setCurrentScreen('receipt');
  };

  const handleReprintInvoice = async (sale: Sale) => {
    if (window.electronAPI?.printReceipt) {
      try {
        const ok = await window.electronAPI.printReceipt(sale);
        if (ok) return;
        console.error('Electron printReceipt returned false; opening invoice view as fallback');
      } catch (error) {
        console.error('Electron printReceipt threw error; opening invoice view as fallback', error);
      }
    }
    setCurrentSale(sale);
    setCurrentScreen('receipt');
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <Navigation 
        currentScreen={currentScreen} 
        onNavigate={setCurrentScreen}
        onLogout={handleLogout}
      />
      
      <div className="flex-1 overflow-y-auto">
        {currentScreen === 'sales' && (
          <SalesScreen 
            cart={cart}
            setCart={setCart}
            onCompleteSale={handleCompleteSale}
          />
        )}
        {currentScreen === 'receipt' && currentSale && (
          <ReceiptPreview 
            sale={currentSale}
            onBackToPOS={handleBackToPOS}
          />
        )}
        {currentScreen === 'history' && (
          <SalesHistory
            sales={salesHistory}
            onViewInvoice={handleViewInvoice}
            onReprintInvoice={handleReprintInvoice}
          />
        )}
        {currentScreen === 'sync' && (
          <ProductsSync 
            pendingSales={pendingSalesCount}
            isSyncing={isSyncingCloud}
            lastSync={lastProductsSync}
            onSync={syncCloud}
          />
        )}
        {currentScreen === 'settings' && (
          <SettingsScreen />
        )}
      </div>
    </div>
  );
}
