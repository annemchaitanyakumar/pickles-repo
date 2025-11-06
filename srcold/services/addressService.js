const API_BASE = import.meta.env.VITE_BACKEN_URL ? `${import.meta.env.VITE_DJANGO_URL}/api` : `${import.meta.env.VITE_API_URL}`;

import { tokenService } from './tokenService';

const getHeaders = () => {
    const token = tokenService.getAccessToken();
    if (!token) {
        throw new Error('No authentication token available');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
    };
    console.log('Request headers:', headers);
    return headers;
};

const addressService = {
    getAllAddresses: async () => {
        const response = await fetch(`${API_BASE}/get-all-address`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include'
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to fetch addresses');
        }
        const addresses = await response.json();
        // Normalize the field names to ensure consistency
        const normalizedAddresses = addresses.map(address => ({
            ...address,
            lastName: address.lastName || address.lastname, // Handle both cases
            // Ensure all other fields follow camelCase
            addressId: address.addressId,
            firstName: address.firstName,
            streetAddress: address.streetAddress,
            city: address.city,
            state: address.state,
            pinCode: address.pinCode,
            email: address.email,
            mobileNumber: address.mobileNumber
        }));
        console.log('Normalized addresses:', normalizedAddresses);
        return normalizedAddresses;
    },

    addAddress: async (addressData) => {
        try {
            // Format data to exactly match UsersAddressDTO expected by the backend
            const formattedData = {
                firstName: addressData.firstName,
                lastName: addressData.lastName,
                streetAddress: addressData.streetAddress,
                city: addressData.city.split(',')[0].trim(),
                state: addressData.state,
                pinCode: parseInt(addressData.pinCode, 10),
                email: addressData.email,
                mobileNumber: parseInt(addressData.mobileNumber.replace(/\D/g, ''), 10)
            };

            console.log('Sending address data:', formattedData);
            
            const response = await fetch(`${API_BASE}/add-address`, {
                method: 'POST',
                headers: getHeaders(),
                credentials: 'include',
                body: JSON.stringify(formattedData)
            });

            // Get response as text first
            const text = await response.text();
            
            if (!response.ok) {
                throw new Error(text || 'Failed to process request');
            }

            return {
                success: true,
                message: text
            };
        } catch (error) {
            console.error('Error adding address:', error);
            throw error;
        }
    },

    deleteAddress: async (addressId) => {
        if (!addressId) {
            throw new Error('Address ID is required for deletion');
        }

        const response = await fetch(`${API_BASE}/delete-address/${addressId}`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include'
        });

        // Get response as text first
        const text = await response.text();
        
        if (!response.ok) {
            throw new Error(text || 'Failed to delete address');
        }

        // Return success response with the message
        return {
            success: true,
            message: text
        };
    },

    editAddress: async (addressId, addressData) => {
        console.log('Edit address - ID:', addressId, 'Data:', addressData);
        if (!addressId) {
            throw new Error('Address ID is required for editing');
        }
        // Format data to exactly match UsersAddressDTO expected by the backend
        const finalData = {
            firstName: addressData.firstName,
            lastname: addressData.lastName || addressData.lastname, // Match backend's lowercase field name
            streetAddress: addressData.streetAddress,
            city: addressData.city.split(',')[0].trim(),
            state: addressData.state,
            pinCode: parseInt(addressData.pinCode, 10),
            email: addressData.email, // Add email field
            mobileNumber: typeof addressData.mobileNumber === 'string' 
                ? parseInt(addressData.mobileNumber.replace(/\D/g, ''), 10)
                : addressData.mobileNumber
        };
        
        console.log('Sending edit request:', {
            url: `${API_BASE}/edit-address/${addressId}`,
            data: finalData
        });
        
        const response = await fetch(`${API_BASE}/edit-address/${addressId}`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include',
            body: JSON.stringify(finalData)
        });

        // Get response as text first
        const text = await response.text();
        
        if (!response.ok) {
            throw new Error(text || 'Failed to update address');
        }

        // Return success response with the message
        return {
            success: true,
            message: text
        };
    }
};

export { addressService };