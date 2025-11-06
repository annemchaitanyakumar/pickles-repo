// API endpoints for user profile management
const API_URL = import.meta.env.VITE_API_URL;

const getHeaders = () => {
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    const token = localStorage.getItem('accessToken');
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
};

const handleResponse = async (response) => {
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    
    if (!response.ok) {
        const error = data.message || response.statusText;
        throw new Error(error);
    }
    
    return data;
};

const profileService = {
    // Get user profile details
    getProfile: async () => {
        const response = await fetch(`${API_URL}/user-profile`, {
            method: 'GET',
            headers: getHeaders()
        });
        return handleResponse(response);
    },

    // Update user profile
    updateProfile: async (data) => {
        const response = await fetch(`${API_URL}/user-profile`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    // Change password
    changePassword: async (data) => {
        const response = await fetch(`${API_URL}/change-password`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    // Get user addresses
    getAddresses: async () => {
        const response = await fetch(`${API_URL}/user-addresses`, {
            method: 'GET',
            headers: getHeaders()
        });
        return handleResponse(response);
    },

    // Add new address
    addAddress: async (data) => {
        const response = await fetch(`${API_URL}/user-addresses`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    // Update address
    updateAddress: async (id, data) => {
        const response = await fetch(`${API_URL}/user-addresses/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    // Delete address
    deleteAddress: async (id) => {
        const response = await fetch(`${API_URL}/user-addresses/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(response);
    },

    // Get user orders
    getOrders: async () => {
        const response = await fetch(`${API_URL}/user-orders`, {
            method: 'GET',
            headers: getHeaders()
        });
        return handleResponse(response);
    },

    // Get order details
    getOrderDetails: async (orderId) => {
        const response = await fetch(`${API_URL}/user-orders/${orderId}`, {
            method: 'GET',
            headers: getHeaders()
        });
        return handleResponse(response);
    }
};

export default profileService;
