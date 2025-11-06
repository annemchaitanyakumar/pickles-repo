import axios from '../lib/axios';
import { tokenService } from './tokenService';

// Get all promo codes
export const getAllPromoCodes = async () => {
    try {
        const response = await axios.get('/getallpromos');
        
        if (Array.isArray(response.data)) {
            // Only transform active promocodes
            return response.data
                .filter(promo => promo.active)
                .map(promo => ({
                    code: promo.code,
                    discount: parseFloat(promo.discount_value)
                }));
        }
        
        console.warn('Unexpected response format from promo API:', response.data);
        return [];
    } catch (error) {
        console.error('Error fetching promo codes:', error);
        return [];
    }
};

// Admin: get full promo objects (no filtering)
export const getAllPromosAdmin = async () => {
    try {
        const response = await axios.get('/getallpromos');
        return response.data || [];
    } catch (error) {
        console.error('Error fetching all promos (admin):', error);
        throw error;
    }
};

// Admin: create a promocode
export const createPromoCodeAdmin = async (payload) => {
    try {
        const makeRequest = async (retryCount = 0) => {
            try {
                // Get CSRF token from cookie
                const getCSRFToken = () => {
                    const match = document.cookie.match(/csrftoken=([^;]+)/);
                    return match ? match[1] : null;
                };
                const csrfToken = getCSRFToken();
                // Debug: show token / csrf / payload
                try {
                    console.log('[PromoService] createPromoCodeAdmin - payload:', payload);
                    console.log('[PromoService] createPromoCodeAdmin - csrfToken:', !!csrfToken);
                    console.log('[PromoService] createPromoCodeAdmin - accessTokenPresent:', !!tokenService.getAccessToken());
                } catch (e) {}

                // Verify we have a valid token before making the request
                const currentToken = tokenService.getAccessToken();
                if (!currentToken && retryCount === 0) {
                    // Try to refresh the token once
                    await tokenService.refreshToken();
                    return makeRequest(1); // Retry with refreshed token
                }

                const config = {
                    headers: Object.assign({
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }, csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                    withCredentials: true
                };

                // Ensure Authorization header is present (interceptor usually covers this)
                try {
                    const at = tokenService.getAccessToken();
                    if (at) config.headers.Authorization = at;
                } catch (e) {}

                const response = await axios.post('/create-promocode', payload, config);
                return response.data;
            } catch (error) {
                // If server returned 500, attempt one refresh+retry (helps diagnose transient session issues)
                const status = error?.response?.status;
                console.error('[PromoService] createPromoCodeAdmin request error', { status, data: error?.response?.data });
                if ((status === 403 || status === 401) && retryCount === 0) {
                    await tokenService.refreshToken();
                    return makeRequest(1);
                }
                if (status === 500 && retryCount === 0) {
                    console.warn('[PromoService] Server error 500; attempting token refresh then retry');
                    try { await tokenService.refreshToken(); } catch (e) {}
                    return makeRequest(1);
                }
                throw error;
            }
        };

        return await makeRequest();
    } catch (error) {
        console.error('Error creating promo code:', error);
        if (error.response?.status === 403) {
            // If we still get 403 after retry, we need to re-authenticate
            window.dispatchEvent(new CustomEvent('auth:required', {
                detail: { message: 'Your session has expired. Please log in again.' }
            }));
        }
        throw error;
    }
};

// Admin: edit promocode
export const editPromoCodeAdmin = async (id, updateFields) => {
    try {
        const makeRequest = async (retryCount = 0) => {
            try {
                // Get CSRF token from cookie
                const getCSRFToken = () => {
                    const match = document.cookie.match(/csrftoken=([^;]+)/);
                    return match ? match[1] : null;
                };
                const csrfToken = getCSRFToken();

                // Debug: show token / csrf / payload
                try {
                    console.log('[PromoService] editPromoCodeAdmin - id:', id, 'updateFields:', updateFields);
                    console.log('[PromoService] editPromoCodeAdmin - csrfToken:', !!csrfToken);
                    console.log('[PromoService] editPromoCodeAdmin - accessTokenPresent:', !!tokenService.getAccessToken());
                } catch (e) {}

                // Verify we have a valid token before making the request
                const currentToken = tokenService.getAccessToken();
                if (!currentToken && retryCount === 0) {
                    // Try to refresh the token once
                    await tokenService.refreshToken();
                    return makeRequest(1); // Retry with refreshed token
                }

                // Include the ID in the payload as Django might expect it
                const payload = Object.assign({}, updateFields, { id: parseInt(id) });

                const config = {
                    headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                    withCredentials: true
                };
                try { const at = tokenService.getAccessToken(); if (at) config.headers.Authorization = at; } catch (e) {}

                const response = await axios.patch(`/promocode/${id}`, payload, config);
                return response.data;
            } catch (error) {
                const status = error?.response?.status;
                console.error('[PromoService] editPromoCodeAdmin request error', { status, data: error?.response?.data });
                if ((status === 403 || status === 401) && retryCount === 0) {
                    await tokenService.refreshToken();
                    return makeRequest(1);
                }
                if (status === 500 && retryCount === 0) {
                    console.warn('[PromoService] Server error 500; attempting token refresh then retry');
                    try { await tokenService.refreshToken(); } catch (e) {}
                    return makeRequest(1);
                }
                throw error;
            }
        };

        return await makeRequest();
    } catch (error) {
        console.error('Error editing promo code:', error);
        if (error.response?.status === 403) {
            // If we still get 403 after retry, we need to re-authenticate
            window.dispatchEvent(new CustomEvent('auth:required', {
                detail: { message: 'Your session has expired. Please log in again.' }
            }));
        }
        throw error;
    }
};

// Admin: delete promocode
export const deletePromoCodeAdmin = async (id) => {
    try {
        const makeRequest = async (retryCount = 0) => {
            try {
                // Get CSRF token from cookie
                const getCSRFToken = () => {
                    const match = document.cookie.match(/csrftoken=([^;]+)/);
                    return match ? match[1] : null;
                };
                const csrfToken = getCSRFToken();

                // Debug: show token / csrf / id
                try {
                    console.log('[PromoService] deletePromoCodeAdmin - id:', id);
                    console.log('[PromoService] deletePromoCodeAdmin - csrfToken:', !!csrfToken);
                    console.log('[PromoService] deletePromoCodeAdmin - accessTokenPresent:', !!tokenService.getAccessToken());
                } catch (e) {}

                // Verify we have a valid token before making the request
                const currentToken = tokenService.getAccessToken();
                if (!currentToken && retryCount === 0) {
                    // Try to refresh the token once
                    await tokenService.refreshToken();
                    return makeRequest(1); // Retry with refreshed token
                }

                const config = {
                    headers: Object.assign({ 'Content-Type': 'application/json', 'Accept': 'application/json' }, csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
                    withCredentials: true
                };
                try { const at = tokenService.getAccessToken(); if (at) config.headers.Authorization = at; } catch (e) {}

                const response = await axios.delete(`/promocode/${id}`, config);
                return response.data;
            } catch (error) {
                const status = error?.response?.status;
                console.error('[PromoService] deletePromoCodeAdmin request error', { status, data: error?.response?.data });
                if ((status === 403 || status === 401) && retryCount === 0) {
                    await tokenService.refreshToken();
                    return makeRequest(1);
                }
                if (status === 500 && retryCount === 0) {
                    console.warn('[PromoService] Server error 500; attempting token refresh then retry');
                    try { await tokenService.refreshToken(); } catch (e) {}
                    return makeRequest(1);
                }
                throw error;
            }
        };

        return await makeRequest();
    } catch (error) {
        console.error('Error deleting promo code:', error);
        if (error.response?.status === 403) {
            // If we still get 403 after retry, we need to re-authenticate
            window.dispatchEvent(new CustomEvent('auth:required', {
                detail: { message: 'Your session has expired. Please log in again.' }
            }));
        }
        throw error;
    }
};

// Apply promo code
export const applyPromoCode = async (code) => {
    try {
        const response = await axios.post(`/apply-promocode?code=${encodeURIComponent(code)}`);
        
        // If the promocode is valid, get its details to show discount
        if (response.data) {
            const detailsResponse = await axios.get('/getallpromos');
            const promoDetails = Array.isArray(detailsResponse.data) 
                ? detailsResponse.data.find(promo => promo.code.toLowerCase() === code.toLowerCase())
                : null;

            if (promoDetails) {
                return {
                    code: promoDetails.code,
                    discount: parseFloat(promoDetails.discount_value)
                };
            }
        }
        throw new Error('Invalid promocode');
    } catch (error) {
        // Handle specific error messages from the backend
        if (error.response?.data) {
            const errorMessage = typeof error.response.data === 'string' 
                ? error.response.data 
                : error.response.data.message;
            throw new Error(errorMessage || 'Failed to apply promocode');
        }
        throw new Error('Failed to apply promocode');
    }
};
