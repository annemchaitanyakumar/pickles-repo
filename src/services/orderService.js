import { tokenService } from './tokenService';

const API_BASE = import.meta.env.VITE_API_URL;

export async function getUserOrders() {
  try {
    const token = tokenService.getAccessToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/user-orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }

    const data = await response.json();
    const orders = Array.isArray(data) ? data : (data?.data || []);

    // keep amounts in paise; parse product_list into JSON
    return orders.map(order => ({
      ...order,
      total_amount_paid: order.total_amount_paid,
      product_list: order.product_list
        ? (typeof order.product_list === 'string'
            ? JSON.parse(order.product_list)
            : order.product_list)
        : []
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}
