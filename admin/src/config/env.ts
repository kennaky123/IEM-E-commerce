export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
  STOREFRONT_URL:
    import.meta.env.VITE_STOREFRONT_URL?.trim() || 'http://localhost:5173',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '',
} as const;
