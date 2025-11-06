import { imageInstance as axios, IMAGE_API_BASE } from '@/lib/axios';

// Image API routes
const IMAGE_ROUTES = {
  GET_PRESIGNED_URLS: (productId) => `/api/products/${productId}/presigned-urls/`
};

export const imageService = {
  // Get presigned URLs for a product
  async getProductImageUrls(productId) {
    try {
      const response = await axios.get(IMAGE_ROUTES.GET_PRESIGNED_URLS(productId));
      return response.data;
    } catch (error) {
      console.error('Error fetching image URLs:', error);
      throw error.response?.data || { message: 'Failed to fetch image URLs' };
    }
  },
};