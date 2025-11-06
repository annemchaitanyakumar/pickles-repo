// src/services/productService.js
import axios from '../lib/axios';
import { slugify } from '@/lib/slugify';

class ProductService {
  /**
   * Fetch paginated products from backend gateway (Spring).
   * Note: removed custom cache headers that caused preflight CORS errors.
   */
  async getPaginatedProducts(page = 1, category = null) {
    try {
      const params = { page: page.toString() };
      if (category && category !== 'all') params.category = category;

      // IMPORTANT: do NOT set Cache-Control / Pragma / Expires here
      // those custom headers cause CORS preflight failures unless server allows them.
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/get-all-products`, {
        params
      });

      console.log('Raw API response:', response.data);
      const results = response.data.results || [];

      const productsWithSlugs = results.map(product => {
        const productName = product.product_name || product.name || `product-${product.id}`;
        const slug = product.slug || slugify(productName);

        // Normalize product_stock_quantity to a number
        let stock = 0;
        if (product.product_stock_quantity !== null && product.product_stock_quantity !== undefined) {
          stock = typeof product.product_stock_quantity === 'string'
            ? parseInt(product.product_stock_quantity, 10) || 0
            : Number(product.product_stock_quantity) || 0;
        }

        // Ensure price_by_weight & stock_by_weight are objects
        let price_by_weight = product.price_by_weight;
        if (typeof price_by_weight === 'string') {
          try { price_by_weight = JSON.parse(price_by_weight); } catch { price_by_weight = {}; }
        }

        let stock_by_weight = product.stock_by_weight;
        if (typeof stock_by_weight === 'string') {
          try { stock_by_weight = JSON.parse(stock_by_weight); } catch { stock_by_weight = {}; }
        }

        return {
          ...product,
          product_stock_quantity: stock,
          price_by_weight,
          stock_by_weight,
          slug
        };
      });

      return { ...response.data, results: productsWithSlugs };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  }

  async getAllProducts(page = 1, category = null) {
    return this.getPaginatedProducts(page, category);
  }

  async getAllProductsFull(category = null) {
    let allProducts = [];
    let page = 1;
    while (true) {
      const paginated = await this.getPaginatedProducts(page, category);
      allProducts = [...allProducts, ...paginated.results];
      if (!paginated.next) break;
      page++;
    }
    return allProducts;
  }

  async getProduct(slugOrId, category = null) {
    const allProducts = await this.getAllProductsFull(category);
    let product = allProducts.find(p => p.slug === slugOrId);
    if (!product && !isNaN(slugOrId)) {
      const id = typeof slugOrId === 'string' ? parseInt(slugOrId, 10) : slugOrId;
      product = allProducts.find(p => p.id === id);
    }
    if (!product) throw new Error('Product not found');
    return product;
  }
}

export const productService = new ProductService();
