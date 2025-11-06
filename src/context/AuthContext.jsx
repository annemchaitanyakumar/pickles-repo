import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '@/services/authService';
import { tokenService } from '@/services/tokenService';
import { userService } from '@/services/userService'; // Import UserService
import { cookieUtils } from '@/utils/cookieUtils';
import { useCartStore } from '@/store/cartStore';
import { cartService } from "@/services/cartService";
import { toast } from '@/hooks/use-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Initialize from localStorage if available
        const storedUser = localStorage.getItem('authData');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(true);
    const { clearCart, initializeCart } = useCartStore();

    // Log the user data to debug
    useEffect(() => {
        console.log('Current user data:', user);
    }, [user]);

    useEffect(() => {
        const initAuth = async () => {
            try {
                setLoading(true);
                
                // First check if we have stored data
                const rawStored = localStorage.getItem('authData');
                const currentData = rawStored ? JSON.parse(rawStored) : null;
                console.log('[AuthContext] Current stored data:', currentData);

                // Attempt to restore session
                const restored = await authService.restoreSession();
                console.log('[AuthContext] Session restored:', restored);

                if (restored) {
                    try {
                        // Fetch fresh user info from server
                        const fetchedUser = await userService.getUserInfo();
                        
                        // If we can't fetch user info but have stored data, use stored data
                        if (!fetchedUser && currentData) {
                            console.log('[AuthContext] Using stored data as fallback');
                            setUser(currentData);
                            return;
                        }

                        // Build updated data: prefer the role from current stored data if present
                        const preservedRole = (currentData && currentData.role) ? currentData.role : (fetchedUser && fetchedUser.role) ? fetchedUser.role : undefined;

                        const updatedData = {
                            // start with server data, then overlay any locally-stored tokens/ids
                            ...fetchedUser,
                            ...(currentData || {}),
                            ...(preservedRole ? { role: preservedRole } : {})
                        };

                        console.log('[AuthContext] Session restoration - Preserved role:', preservedRole);

                        setUser(updatedData);
                        localStorage.setItem('authData', JSON.stringify(updatedData));
                    } catch (error) {
                        console.error('[AuthContext] Error fetching user info:', error);
                        // Optionally fallback to stored data if available
                        if (currentData) {
                            setUser(currentData);
                        } else {
                            setUser(null);
                        }
                    }
                } 
                else {
                    setUser(null);
                    // NOTE: Do NOT remove localStorage.authData here. Previously we cleared
                    // authData when restoreSession() returned false which caused the token
                    // to be lost on simple navigation events (e.g. browser back button).
                    // It's safer to keep the stored auth data and let tokenService/axios
                    // handle refresh/401 logic. Explicit logout should still clear data.
                }
            } catch (error) {
                console.error('[AuthContext] Init error:', error);
                setUser(null);
                // Keep stored authData on transient init errors. Clearing here caused
                // tokens to be removed during navigation/popstate events. Rely on
                // explicit logout or axios/token refresh failure handling to clear.
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

            // Keep the role from login response
            const loginRole = response.role;
            console.log('[AuthContext] Role from login:', loginRole);
            
            // Get additional user info
            const userInfo = await userService.getUserInfo();
            
            // Create userData keeping the role from login response
            const userData = {
                ...userInfo,
                role: loginRole, // Preserve the role from login
                userid: response.userid
            };
            
            console.log('[AuthContext] Final user data with preserved role:', userData);
            setUser(userData);
            
            // Store in localStorage
            localStorage.setItem('authData', JSON.stringify(userData));
            console.log('[AuthContext] Updated user data in localStorage with role:', userData);
            
            // Initialize cart and fetch items immediately
            try {
                await initializeCart(userData.userid);
                // Force an immediate cart fetch
                const cartData = await cartService.fetchCart(userData.userid);
                useCartStore.setState({ items: cartData.items || [] });
            } catch (error) {
                console.error('[AuthContext] Cart initialization error:', error);
            }
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

    // Listen for auth events (emitted by tokenService or other tabs) so UI updates
    // immediately when tokens are set/cleared. This ensures Navbar, cart, etc. reflect
    // session changes (e.g. expired token) without requiring user interaction.
    const showSessionExpiredToast = useCallback(() => {
        try {
            toast({
                variant: 'destructive',
                title: 'Session expired',
                description: 'Your session has expired. Please log in again.'
            });
        } catch (e) {
            console.warn('[AuthContext] Could not show session expired toast', e);
        }
    }, []);

    const onAuthCleared = useCallback((ev) => {
        console.log('[AuthContext] Received auth:cleared event', ev?.detail);
        setUser(null);
        showSessionExpiredToast();
    }, [showSessionExpiredToast]);

    const onAuthSet = useCallback((ev) => {
        try {
            const detail = ev?.detail;
            console.log('[AuthContext] Received auth:set event', detail);
            if (detail) setUser(detail);
        } catch (e) {
            console.warn('[AuthContext] auth:set handler error', e);
        }
    }, []);

    const onStorage = useCallback((ev) => {
        try {
            if (ev.key === 'authData') {
                if (!ev.newValue) {
                    console.log('[AuthContext] storage event: authData removed');
                    setUser(null);
                    showSessionExpiredToast();
                } else {
                    console.log('[AuthContext] storage event: authData changed');
                    setUser(JSON.parse(ev.newValue));
                }
            }
        } catch (e) {
            console.warn('[AuthContext] storage handler error', e);
        }
    }, [showSessionExpiredToast]);

    useEffect(() => {
        window.addEventListener('auth:cleared', onAuthCleared);
        window.addEventListener('auth:set', onAuthSet);
        window.addEventListener('storage', onStorage);

        return () => {
            window.removeEventListener('auth:cleared', onAuthCleared);
            window.removeEventListener('auth:set', onAuthSet);
            window.removeEventListener('storage', onStorage);
        };
    }, [onAuthCleared, onAuthSet, onStorage]);

    // Add this debug code to print all refreshToken cookies with their full URLs
    function logRefreshTokenCookieUrls() {
      const cookies = document.cookie.split('; ');
      cookies.forEach(cookie => {
        if (cookie.startsWith('refreshToken=')) {
          // Try to get path from Application tab (not available in JS for HttpOnly cookies)
          // But we can print the current origin and likely paths
          console.log('Possible refreshToken cookie URL:', window.location.origin + '/api', window.location.origin + '/');
        }
      });
    }
    logRefreshTokenCookieUrls();

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