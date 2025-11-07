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
        const normalizedAddresses = addresses.map(address => {
            // Determine boolean isDefault from various possible backend field names
            const isDefault = !!(address.isDefault || address.is_default || address.default || address.is_default_address || address.defaultAddress || address.isdefault || address.default_address);
            // Prefer strong id fields
            const addressId = address.addressId || address.id || address._id || address.address_id || null;
            return {
                ...address,
                lastName: address.lastName || address.lastname || address.surname || '',
                addressId,
                isDefault,
                firstName: address.firstName || address.firstname || '',
                streetAddress: address.streetAddress || address.street_address || address.address || '',
                city: address.city || address.town || '',
                state: address.state || '',
                pinCode: address.pinCode || address.pincode || address.pin || '',
                email: address.email || address.emailid || '',
                mobileNumber: address.mobileNumber || address.mobile || address.mobilenum || ''
            };
        });
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
    },
    setDefaultAddress: async (addressId) => {
        if (!addressId) {
            throw new Error('Address ID is required to set default');
        }
        const response = await fetch(`${API_BASE}/set-default/${addressId}`, {
            method: 'PUT',
            headers: getHeaders(),
            credentials: 'include'
        });
        const text = await response.text();
        if (!response.ok) {
            throw new Error(text || 'Failed to set default address');
        }
        return {
            success: true,
            message: text
        };
    }
};

export { addressService };