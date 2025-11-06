// src/store/cartStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartService } from '@/services/cartService';
import { toast } from '@/hooks/use-toast';
import axiosDefault from 'axios'; // fresh axios instance (bypass app's global axios)
import axios from '@/lib/axios'; // keep for other authenticated calls if needed
import { tokenService } from '@/services/tokenService';

/**
 * CartItem shape (frontend):
 * { cartId, productId, productName, productTitle, productDescription,
 *   productPrice, category, productStockQuantity, stockByWeight,
 *   productWeight, quantity, addedAt, productImage1, productImage2, productImage3,
 *   weightBasedPrice, image, slug,
 *   isContainer (boolean),
 *   packagingType ('container'|'general'),
 *   containerFee (number)
 * }
 */

const useCartStore = create()(
  persist(
    (set, get) => ({
      items: [],
      settings: null, // Will store tax info
      userId: null, // Add userId to track current user
      loading: false,
      error: null,
      taxInfo: null,

      // fetch presigned URLs for images using a plain axios instance (no credentials)
      fetchPresignedUrls: async (productId) => {
        const presignedUrlsUrl = `${import.meta.env.VITE_DJANGO_URL}/products/${productId}/presigned-urls/`;
        try {
          const plain = axiosDefault.create();
          const response = await plain.get(presignedUrlsUrl, { withCredentials: false, timeout: 8000 });
          const data = response?.data ?? {};

          const normalized = {
            product_image1_url: data?.product_image1_url || data?.image1_url || (Array.isArray(data) ? data[0] : undefined) || '/placeholder.png',
            product_image2_url: data?.product_image2_url || data?.image2_url || (Array.isArray(data) ? data[1] : undefined) || '/placeholder.png',
            product_image3_url: data?.product_image3_url || data?.image3_url || (Array.isArray(data) ? data[2] : undefined) || '/placeholder.png',
            product_image4_url: data?.product_image4_url || data?.image4_url || (Array.isArray(data) ? data[3] : undefined) || '/placeholder.png',
            product_image5_url: data?.product_image5_url || data?.image5_url || (Array.isArray(data) ? data[4] : undefined) || '/placeholder.png',
          };

          const firstUrl = [normalized.product_image1_url, normalized.product_image2_url, normalized.product_image3_url, normalized.product_image4_url, normalized.product_image5_url]
            .find(u => u && u !== '/placeholder.png');

          return { normalized, firstUrl };
        } catch (error) {
          console.error('Error fetching presigned URLs (cartStore):', error);
          return {
            normalized: {
              product_image1_url: '/placeholder.png',
              product_image2_url: '/placeholder.png',
              product_image3_url: '/placeholder.png',
              product_image4_url: '/placeholder.png',
              product_image5_url: '/placeholder.png',
            },
            firstUrl: '/placeholder.png'
          };
        }
      },

      // Compute total price for item (excluding container fee unless included)
      getItemTotalPrice: (item) => {
        const unitPrice = Number(item.weightBasedPrice ?? item.productPrice) || 0;
        const qty = Number(item.quantity || 0);
        return unitPrice * qty; // Base price * quantity, exclude containerFee
      },

      calculateItemTotal: (item) => {
        const unitPrice = item.productPrice || item.price;
        return unitPrice * item.quantity;
      },

      getTotalWithPackaging: () => {
        const state = get();
        return state.items.reduce((total, item) => total + state.getItemTotalPrice(item), 0);
      },

      calculateSubtotal: () => {
        const { items } = get();
        return items.reduce((total, item) => {
          // Use totalPrice directly as it's already calculated with quantity
          const price = Number(item.totalPrice ?? item.weightBasedPrice ?? item.productPrice ?? item.price) || 0;
          return total + price; // Don't multiply by quantity as totalPrice includes it
        }, 0);
      },

      getTotal: () => {
        const items = get().items;
        const settings = get().settings;
        
        // Calculate subtotal
        const subtotal = items.reduce((sum, item) => 
          sum + ((item?.unitPrice || 0) * (item?.quantity || 1)), 0);

        // Use settings if available, otherwise return minimal calculation
        if (!settings) {
          return {
            subtotal,
            gstPercentage: 0,
            gstAmount: 0,
            containerCharges: 0,
            shippingCharges: 0,
            total: subtotal
          };
        }

        // Calculate with tax info
        const gstPercentage = settings.gstPercentage;
        const gstAmount = (subtotal * gstPercentage) / 100;
        const containerCharges = settings.containerCharges || 0;
        const shippingCharges = subtotal >= 500 ? 0 : (settings.shippingCharges || 0);
        
        return {
          subtotal,
          gstPercentage,
          gstAmount,
          containerCharges,
          shippingCharges,
          total: subtotal + gstAmount + containerCharges + shippingCharges
        };
      },
  
      isCheckoutAllowed: () => {
        const state = get();
        return state.items.length > 0 && state.items.every(item => typeof item.isContainer === 'boolean');
      },

      loadCartItems: async () => {
        set({ loading: true, error: null });
        try {
          const cartItems = await cartService.getCartItems();

          const itemsWithImages = await Promise.all(
            (cartItems || []).map(async (item) => {
              const { firstUrl } = await get().fetchPresignedUrls(item.productId).catch(() => ({ firstUrl: '/placeholder.png' }));
              const basePrice = parseFloat(item.productPrice) || 0; // Ensure base price is per unit
              const containerFee = item.isContainer && get().taxInfo?.containerCharges ? get().taxInfo.containerCharges : 0;

              return {
                ...item,
                isContainer: typeof item.isContainer === 'boolean' ? item.isContainer : false,
                packagingType: item.isContainer ? 'container' : (item.packagingType || 'general'),
                weightBasedPrice: basePrice, // Set to base unit price
                image: firstUrl || '/placeholder.png',
                slug: item.slug || undefined,
                containerFee,
              };
            })
          );

          set({ items: itemsWithImages, loading: false });
        } catch (error) {
          console.error('Error loading cart items:', error);
          set({ error: error?.message || String(error), loading: false });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error?.message || 'Failed to load cart items',
          });
        }
      },

      addItem: async (product, quantity = 1) => {
        set({ loading: true, error: null });
        try {
          const existingItem = get().items.find(
            (item) => item.productId === product.id && item.productWeight === (product.selectedWeight || product.weight)
          );

          if (existingItem) {
            if (existingItem.quantity + quantity > 10) {
              throw new Error('Maximum quantity limit (10) reached for this item');
            }
            return await get().updateQuantity(
              existingItem.cartId,
              existingItem.quantity + quantity,
              existingItem.productWeight
            );
          }

          if (!product.id) throw new Error('Product ID is required');

          let price = product.selectedPrice || product.price || product.product_price;
          let weight = product.selectedWeight || product.weight || null;

          if (!price || !weight) throw new Error('Please select a weight option first');

          const cartItem = await cartService.addToCart(product.id, quantity, weight, price);

          const { firstUrl } = await get().fetchPresignedUrls(product.id).catch(() => ({ firstUrl: '/placeholder.png' }));
          const containerFee = cartItem.isContainer && get().taxInfo?.containerCharges ? get().taxInfo.containerCharges : 0;

          const cartItemWithClientFields = {
            ...cartItem,
            weightBasedPrice: parseFloat(price), // Ensure base price is per unit
            image: firstUrl || '/placeholder.png',
            slug: product.slug,
            isContainer: typeof cartItem.isContainer === 'boolean' ? cartItem.isContainer : false,
            packagingType: cartItem.isContainer ? 'container' : (cartItem.packagingType || 'general'),
            containerFee,
          };

          set((state) => ({
            items: [cartItemWithClientFields, ...state.items],
            loading: false,
          }));

          if (cartItemWithClientFields.cartId) {
            toast({ 
              title: 'Success', 
              description: `${cartItemWithClientFields.productName || 'Item'} (${weight}g) added to cart`
            });
          }
        } catch (error) {
          console.error('addItem error', error);
          set({ error: error?.message || String(error), loading: false });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error?.message || 'Failed to add item to cart',
          });
        }
      },

      removeItem: async (cartId) => {
        set({ loading: true, error: null });
        try {
          await cartService.removeFromCart(cartId);
          set((state) => ({
            items: state.items.filter((item) => item.cartId !== cartId),
            loading: false,
          }));
          toast({ title: 'Success', description: 'Item removed from cart' });
        } catch (error) {
          console.error('Error removing item:', error);
          set({ error: error?.message || String(error), loading: false });
          toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Failed to remove item' });
        }
      },

      updateQuantity: async (cartId, newQuantity, weight) => {
        set({ loading: true, error: null });
        try {
          if (newQuantity > 10) {
            throw new Error('Maximum quantity limit (10) reached for this item');
          }

          const updatedItem = await cartService.updateCartItem(cartId, newQuantity, weight);
          console.log("🧾 Backend Response:", updatedItem);
const existing = get().items.find(i => i.cartId === cartId);
const containerFee = updatedItem.isContainer && get().taxInfo?.containerCharges 
  ? get().taxInfo.containerCharges
  : 0;

// ✅ Ensure we keep per-unit price, not total
const unitPrice = parseFloat(updatedItem.productPrice || existing?.productPrice || 0);

set((state) => ({
  items: state.items.map((item) =>
    item.cartId === cartId
      ? {
          ...item,
          ...updatedItem,
          productPrice: unitPrice,
          weightBasedPrice: unitPrice,
          quantity: newQuantity,
          image: existing?.image,
          slug: existing?.slug,
          packagingType: updatedItem.isContainer ? 'container' : (updatedItem.packagingType || 'general'),
          isContainer: Boolean(updatedItem.isContainer),
          containerFee
        }
      : item
  ),
  loading: false,
}));

          toast({ title: 'Success', description: 'Cart updated successfully' });
        } catch (error) {
          console.error('updateQuantity error', error);
          set({ error: error?.message || String(error), loading: false });
          toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Failed to update cart' });
        }
      },

      // Fetch current cart count from backend
      fetchCartCount: async () => {
        try {
          const response = await axios.get('/cart-count');
          const count = response?.data ?? 0;
          return count;
        } catch (error) {
          console.error('Error fetching cart count:', error);
          return null;
        }
      },

      incrementQuantity: async (cartId) => {
        const item = get().items.find((i) => i.cartId === cartId);
        if (item && item.quantity < 10) {
          await get().updateQuantity(cartId, item.quantity + 1, item.productWeight);
          // Fetch updated count after increment
          const count = await get().fetchCartCount();
          if (count !== null) {
            window.dispatchEvent(new CustomEvent('cart-count-updated', { detail: count }));
          }
        }
      },

      decrementQuantity: async (cartId) => {
        const item = get().items.find((i) => i.cartId === cartId);
        if (item && item.quantity > 1) {
          await get().updateQuantity(cartId, item.quantity - 1, item.productWeight);
          // Fetch updated count after decrement
          const count = await get().fetchCartCount();
          if (count !== null) {
            window.dispatchEvent(new CustomEvent('cart-count-updated', { detail: count }));
          }
        } else if (item && item.quantity === 1) {
          await get().removeItem(cartId);
          // Fetch updated count after remove
          const count = await get().fetchCartCount();
          if (count !== null) {
            window.dispatchEvent(new CustomEvent('cart-count-updated', { detail: count }));
          }
        }
      },

      updatePackaging: async (cartId, packagingType) => {
        const isContainer = packagingType === 'container' || packagingType === true;
        const prevItems = get().items;
        set(state => ({
          items: state.items.map(item =>
            item.cartId === cartId ? { ...item, packagingType: isContainer ? 'container' : 'general', isContainer, containerFee: isContainer && get().taxInfo?.containerCharges ? get().taxInfo.containerCharges : 0 } : item
          )
        }));

        try {
          const updated = await cartService.updatePackaging(cartId, isContainer);
          const containerFee = updated.isContainer ? (Number(updated.containerFee ?? get().taxInfo?.containerCharges) || 0) : 0;

          set(state => ({
            items: state.items.map(item =>
              item.cartId === cartId
                ? {
                    ...item,
                    productId: updated.productId ?? item.productId,
                    productPrice: updated.productPrice ?? item.productPrice,
                    quantity: updated.quantity ?? item.quantity,
                    productWeight: updated.productWeight ?? item.productWeight,
                    isContainer: Boolean(updated.isContainer),
                    packagingType: updated.isContainer ? 'container' : 'general',
                    containerFee
                  }
                : item
            )
          }));

          toast({ title: 'Packaging updated', description: `Saved ${isContainer ? 'container' : 'general'} packaging.` });
        } catch (err) {
          set({ items: prevItems });
          console.error('Failed to persist packaging change', err);
          toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save packaging. Please try again.' });
          throw err;
        }
      },

      clearCart: async () => {
        set({ loading: true, error: null });
        try {
          const currentItems = get().items;
          await Promise.all(currentItems.map(item => cartService.removeFromCart(item.cartId)));
          set({ items: [], loading: false });
          toast({ title: 'Success', description: 'Cart cleared successfully' });
        } catch (error) {
          console.error('Error clearing cart:', error);
          set({ error: error?.message || String(error), loading: false });
          toast({ variant: 'destructive', title: 'Error', description: error?.message || 'Failed to clear cart' });
        }
      },

      getTotalItems: () => {
        const state = get();
        return state.items.reduce((total, item) => total + (Number(item.quantity) || 0), 0);
      },

      getTotalPrice: () => {
        const state = get();
        return state.items.reduce((total, item) => total + state.getItemTotalPrice(item), 0);
      },

      fetchTaxInfo: async () => {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/get-tax-info`);
          set({ taxInfo: response.data });
        } catch (error) {
          console.error('Failed to fetch tax info:', error);
        }
      },

      calculateGST: (subtotal) => {
        const { taxInfo } = get();
        if (!subtotal || !taxInfo.gstPercentage) return 0;
        return (subtotal * taxInfo.gstPercentage) / 100;
      },

      calculateContainerFee: () => {
        const { items, taxInfo } = get();
        return items.reduce((total, item) => {
          const containerFee = item.containerCharge || taxInfo.containerCharges;
          return total + (containerFee * item.quantity);
        }, 0);
      },

      // Update initialization to include userId
      initializeCart: async (userId) => {
  try {
    console.log('Initializing cart for user:', userId);
    set({ userId, loading: true });

    // No user → clear cart
    if (!userId) {
      console.log('No user ID provided, clearing cart');
      set({ items: [], loading: false });
      return;
    }

    console.log('Fetching cart items...');
    // Ensure we have an access token (try refresh with cookie if missing)
    try {
      let accessToken = tokenService.getAccessToken();
      if (!accessToken) {
        console.log('[cartStore] No access token, attempting tokenService.refreshToken() before fetching cart');
        await tokenService.refreshToken();
        accessToken = tokenService.getAccessToken();
        console.log('[cartStore] After refresh, access token present:', !!accessToken);
      }
    } catch (e) {
      console.warn('[cartStore] token refresh attempt failed before fetching cart:', e);
      // we'll still try the request; server may accept Authorization from local storage token
    }

    // ✅ Fetch cart items using axios (Authorization header attached by interceptor)
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/all`, {
      withCredentials: true,
      headers: {
        'Accept': 'application/json',
      }
    });

    // Normalize possible response formats
    let cartItems = [];
    if (response.data) {
      if (Array.isArray(response.data)) {
        cartItems = response.data;
      } else if (response.data.items && Array.isArray(response.data.items)) {
        cartItems = response.data.items;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        cartItems = response.data.data;
      }
    }

    set({
      items: cartItems,
      loading: false,
      error: null,
    });

    return cartItems;
  } catch (error) {
    console.error('Failed to initialize cart:', error?.response?.data || error.message);

    // Handle unauthenticated user
    if (error?.response?.status === 403 || error?.response?.status === 401) {
      console.error('Authentication error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        headers: error?.response?.headers,
      });

      // Check if we have a cookie
      const cookies = document.cookie;
      console.log('Current cookies:', cookies);

      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error?.response?.data?.message || 'Please login again to continue',
      });
      set({ items: [], userId: null });
    } else {
      console.error('Cart initialization error:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error.message
      });
      set({
        items: [],
        error: error?.response?.data?.message || error.message,
      });
    }

    set({ loading: false });
  }
},


      // Clear cart for logout
      clearCart: () => {
        set({ items: [], userId: null });
      },
    }),
    {
      name: 'cart-storage',
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState;
        const items = Array.isArray(persistedState.items)
          ? persistedState.items.map((it) => {
              if (!it) return it;
              return {
                ...it,
                isContainer: typeof it.isContainer === 'boolean' ? it.isContainer : false,
                containerFee: it.isContainer ? (Number(it.containerFee ?? get().taxInfo?.containerCharges) || 0) : 0,
                packagingType: it.isContainer ? (it.packagingType || 'container') : 'general',
              };
            })
          : [];
        return { ...persistedState, items };
      },
      skipHydration: false,
    }
  )
);

export { useCartStore };