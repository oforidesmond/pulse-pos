import { getPendingSales, markSaleSynced } from '../storage/offlineSales';
import type { Sale } from '../types/sales';

const SALES_API_URL = import.meta.env.VITE_SALES_API_URL ?? 'https://sika-ventures-admin.vercel.app/api/sales';

export interface SalesSyncResult {
  total: number;
  synced: number;
  errors: string[];
}

const buildSalePayload = (sale: Sale) => ({
  receiptNumber: sale.receiptNumber,
  userId: sale.userId,
  paymentMethod: sale.paymentMethod,
  discount: sale.discount ?? 0,
  subtotal: sale.subtotal,
  totalAmount: sale.totalAmount,
  customerName: sale.customerName,
  items: sale.items.map((item) => ({
    productId: item.id,
    quantity: item.quantity,
    price: item.price,
  })),
});

export const syncPendingSales = async (): Promise<SalesSyncResult> => {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    throw new Error('Device is offline. Connect to the internet to sync.');
  }

  const pendingSales = await getPendingSales();
  if (pendingSales.length === 0) {
    return { total: 0, synced: 0, errors: [] };
  }

  let synced = 0;
  const errors: string[] = [];

  for (const sale of pendingSales) {
    try {
      const response = await fetch(SALES_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSalePayload(sale)),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Sync failed with status ${response.status}`);
      }

      await markSaleSynced(sale.id);
      synced += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Receipt ${sale.receiptNumber}: ${message}`);
    }
  }

  return {
    total: pendingSales.length,
    synced,
    errors,
  };
};
