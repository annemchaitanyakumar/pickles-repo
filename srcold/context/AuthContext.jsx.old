import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/authService';
import { tokenService } from '@/services/tokenService';
import { userService } from '@/services/userService'; // Import UserService
import { cookieUtils } from '@/utils/cookieUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Initialize from localStorage if available
        const storedUser = localStorage.getItem('authData');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    // Log the user data to debug
    useEffect(() => {
        console.log('Current user data:', user);
    }, [user]);

    useEffect(() => {
        const initAuth = async () => {
            try {
                setLoading(true);
                const restored = await authService.restoreSession();
                console.log('[AuthContext] Session restored:', restored);

                if (restored) {
                    // Fetch user info using UserService
                    const userData = await userService.getUserInfo();
                    setUser(userData);
                    console.log('[AuthContext] User data from UserService:', userData);
                    // Save to localStorage
                    localStorage.setItem('authData', JSON.stringify(userData));
                } else {
                    setUser(null);
                    localStorage.removeItem('authData');
                }
            } catch (error) {
                console.error('[AuthContext] Init error:', error);
                setUser(null);
                localStorage.removeItem('authData');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    const login = async (credentials) => {
        try {
            setLoading(true);
            const response = await authService.login(credentials);
            console.log('[AuthContext] Login successful:', response);

            // Fetch user info using UserService after login
            const userData = await userService.getUserInfo();
            setUser(userData);
            console.log('[AuthContext] User data from UserService:', userData);
            // Save to localStorage
            localStorage.setItem('authData', JSON.stringify(userData));
            return true;
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            setUser(null);
            localStorage.removeItem('authData');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            await authService.logout();
            setUser(null);
            localStorage.removeItem('authData');
            console.log('[AuthContext] Logout successful');
        } catch (error) {
            console.error('[AuthContext] Logout error:', error);
        } finally {
            setLoading(false);
        }
    };

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};