export type PaymentMethod = 'CASH' | 'MOBILE_MONEY' | 'CARD' | 'TRANSFER';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  userId: string;
  date: string;
  time: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  amountPaid?: number;
  changeGiven?: number;
  customerName?: string;
  synced?: boolean;
}

export interface SaleItemPayload {
  productId: string;
  quantity: number;
  price: number;
}

export interface BackendSalePayload {
  id: string;
  receiptNumber: string;
  userId: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  items: SaleItemPayload[];
  createdAt: string;
  customerName?: string;
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  MOBILE_MONEY: 'Mobile Money',
  CARD: 'Card',
  TRANSFER: 'Transfer',
};

export const formatPaymentMethod = (method: PaymentMethod) => paymentMethodLabels[method] ?? method;
