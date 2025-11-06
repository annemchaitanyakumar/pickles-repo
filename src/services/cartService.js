// src/services/cartService.js
import instance from '@/lib/axios';

const CART_ROUTES = {
  GET_ALL: '/all',
  ADD: '/add',
  UPDATE: '/edit',
  DELETE: '/delete',
  CLEAR: '/delete-all-cart-items',
  PACKAGING: '/packaging'
};

export const cartService = {
  // 🛒 Get all cart items for logged-in user
  async getCartItems() {
    try {
      const response = await instance.get(CART_ROUTES.GET_ALL, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error fetching cart items:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Please login to view your cart');
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch cart items');
    }
  },

  // ➕ Add product to cart
  async addToCart(productId, quantity, productWeight, price) {
    try {
      const requestBody = {
        productId: parseInt(productId),
        quantity: parseInt(quantity),
        productWeight,
        productPrice: parseFloat(price),
      };

      const response = await instance.post(CART_ROUTES.ADD, requestBody, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Please login to add items to cart');
      }
      throw new Error(error.response?.data?.message || 'Failed to add item to cart');
    }
  },

  // ❌ Remove item from cart
  async removeFromCart(cartId) {
    try {
      const response = await instance.delete(CART_ROUTES.DELETE, {
        data: { cartId: parseInt(cartId) },
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error('Error removing from cart:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Please login to remove items from cart');
      }
      throw new Error(error.response?.data?.message || 'Failed to remove item from cart');
    }
  },

  // ✏️ Edit cart item quantity or weight
  async updateCartItem(cartId, newQuantity, productWeight) {
    try {
      const response = await instance.put(
        CART_ROUTES.UPDATE,
        {
          cartId: parseInt(cartId),
          newQuantity: parseInt(newQuantity),
          productWeight,
        },
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Please login to update your cart');
      }
      throw new Error(error.response?.data?.message || 'Failed to update cart item');
    }
  },

  // 📦 Update packaging option (persist container boolean)
  async updatePackaging(cartId, isContainer) {
    try {
      const url = `${CART_ROUTES.PACKAGING}/${encodeURIComponent(cartId)}?isContainer=${isContainer}`;
      const response = await instance.put(url, null, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error updating packaging:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Please login to update packaging');
      }
      throw new Error(error.response?.data?.message || 'Failed to update packaging');
    }
  },

  // 🧹 Clear entire cart
  async clearCart() {
    try {
      const response = await instance.delete(CART_ROUTES.CLEAR, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error clearing cart:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Please login to clear cart');
      }
      throw new Error(error.response?.data?.message || 'Failed to clear cart');
    }
  },

  // 🧾 Clear all cart items (after successful payment)
  async clearAllCartItems() {
    try {
      const response = await instance.delete(CART_ROUTES.CLEAR, { withCredentials: true });
      return response.data;
    } catch (error) {
      console.error('Error clearing all cart items:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        throw new Error('Please login to clear cart');
      }
      throw new Error(error.response?.data?.message || 'Failed to clear cart items');
    }
  },
};
