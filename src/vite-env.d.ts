/// <reference types="vite/client" />

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_PRODUCTS_API_URL?: string;
    readonly VITE_SALES_API_URL?: string;
    readonly VITE_AUTH_API_URL?: string;


    readonly VITE_APP_NAME?: string;
    readonly VITE_APP_TAGLINE?: string;
    readonly VITE_APP_VERSION_LABEL?: string;

    readonly VITE_SHOP_NAME?: string;
    readonly VITE_SHOP_ADDRESS?: string;
    readonly VITE_SHOP_PHONE?: string;

    readonly VITE_BRAND_PRIMARY?: string;
    readonly VITE_BRAND_SECONDARY?: string;

    readonly VITE_SHOW_VERSION_LABEL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  interface Window {
    electronAPI?: {
      printReceipt: (sale: import('./types/sales').Sale & { shopInfo?: unknown }) => Promise<boolean>;
    };
  }
}
