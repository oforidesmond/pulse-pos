export type ShopInfo = {
  shopName: string;
  address: string;
  phoneNumber: string;
};

const asString = (value: unknown, fallback: string) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const asOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const asOptionalBoolean = (value: unknown): boolean | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  return undefined;
};

const env = ((import.meta as any).env ?? {}) as Record<string, unknown>;

export const branding = {
  appName: asString(env.VITE_APP_NAME, 'Pulse POS'),
  appTagline: asString(env.VITE_APP_TAGLINE, 'Sign in to continue'),
  appVersionLabel: asOptionalString(env.VITE_APP_VERSION_LABEL),

  shopInfoDefaults: {
    shopName: asString(env.VITE_SHOP_NAME, 'Pulse POS'),
    address: asString(env.VITE_SHOP_ADDRESS, ''),
    phoneNumber: asString(env.VITE_SHOP_PHONE, ''),
  } satisfies ShopInfo,

  brand: {
    primary: asString(env.VITE_BRAND_PRIMARY, '#3b82f6'),
    secondary: asString(env.VITE_BRAND_SECONDARY, '#14b8a6'),
  },

  features: {
    showVersionLabel: asOptionalBoolean(env.VITE_SHOW_VERSION_LABEL),
  },
};

export const brandGradientStyle = () => {
  return {
    backgroundImage: `linear-gradient(to bottom right, ${branding.brand.primary}, ${branding.brand.secondary})`,
  } as const;
};
