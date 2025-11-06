import { tokenService } from './tokenService';

const API_BASE = import.meta.env.VITE_API_URL;

export async function getTaxInfo() {
  try {
    const token = tokenService.getAccessToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/get-tax-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch tax information');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching tax info:', error);
    throw error;
  }
}