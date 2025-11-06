import { tokenService } from './tokenService';

const API_BASE = `${import.meta.env.VITE_API_URL}`;

class UserService {
    async getUserInfo() {
        const token = tokenService.getAccessToken();
        console.log('[UserService] Getting user info with token:', token);

        if (!token) {
            throw new Error('User not authenticated');
        }

        const response = await fetch(`${API_BASE}/get-info`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info');
        }

        const data = await response.json();
        console.log('[UserService] User info response:', data);

        // Get current authData
        const currentAuthData = JSON.parse(localStorage.getItem('authData') || '{}');
        
        // Update user data but preserve the role from current auth data
        const userData = {
            ...currentAuthData,  // Keep current data including role
            ...data,            // Update with new user info
            role: currentAuthData.role  // Explicitly preserve the role from auth data
        };

        console.log('[UserService] Preserving existing role:', currentAuthData.role);

        console.log('[UserService] Preserving role in user data:', userData);
        localStorage.setItem('authData', JSON.stringify(userData));
        return userData;
    }

    async sendOtpForUpdate(editUserDTO) {
        const token = tokenService.getAccessToken();
        console.log('[UserService] Sending OTP for update:', editUserDTO);
        const response = await fetch(`${API_BASE}/user-send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            credentials: 'include',
            body: JSON.stringify(editUserDTO)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[UserService] Error sending OTP:', errorText);
            throw new Error(errorText || 'Failed to send OTP');
        }

        return await response.text();
    }

    async updateUserInfo(validateDTO) {
        const token = tokenService.getAccessToken();
        console.log('[UserService] Updating user info:', validateDTO);
        const response = await fetch(`${API_BASE}/user-update`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            credentials: 'include',
            body: JSON.stringify(validateDTO)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[UserService] Error updating user info:', errorText);
            throw new Error(errorText || 'Failed to update user info');
        }

        return await response.json();
    }

    async getUserOrders(userid) {
        const token = tokenService.getAccessToken();
        if (!token) {
            throw new Error('User not authenticated');
        }

        const response = await fetch(`${API_BASE}/user-orders/${userid}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user orders');
        }

        return response.json();
    }
}

export const userService = new UserService();