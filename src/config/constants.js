const isDev = import.meta.env.DEV;
const BASE_URL = isDev ? `${import.meta.env.VITE_API_URL}` : `${import.meta.env.VITE_API_URL}`; 
const DJANGO_URL = isDev ? `${import.meta.env.VITE_DJANGO_URL}` : `${import.meta.env.VITE_DJANGO_URL}`;

export const API_ENDPOINTS = {
  PRODUCTS: `${BASE_URL}/products`,
  REVIEWS: `${BASE_URL}/reviews`,
  CART: `${BASE_URL}/cart`,
  DJANGO_PRESIGN: `${DJANGO_URL}/products`,
};

// Obfuscate the paths in production
export const getApiUrl = (key, params = {}) => {
  const base = API_ENDPOINTS[key];
  if (!base) return '';
  
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
};