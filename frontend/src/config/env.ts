export const ENV = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
  ADMIN_PORTAL_URL:
    import.meta.env.VITE_ADMIN_URL?.trim() || 'http://localhost:5174',
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '',
} as const;
