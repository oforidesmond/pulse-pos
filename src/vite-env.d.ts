/// <reference types="vite/client" />

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_PRODUCTS_API_URL?: string;
    readonly VITE_SALES_API_URL?: string;
    readonly VITE_AUTH_API_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    electronAPI?: {
      printReceipt: (sale: import('./types/sales').Sale) => Promise<boolean>;
    };
  }
}
