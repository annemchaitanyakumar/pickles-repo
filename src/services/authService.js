import { tokenService } from './tokenService';

// Make sure your .env has:  VITE_API_URL=http://40.192.63.15:7012/api/spring
const API_BASE = import.meta.env.VITE_API_URL;

class AuthService {
  // -------------------- VERIFY OTP --------------------
  async verifyOtp(verificationData) {
    console.log('[AuthService] Verify OTP called', verificationData);
    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationData),
        credentials: 'include'
      });

      const data = await response.json();
      console.log('[AuthService] OTP verification response:', data);

      if (data.accessToken || data.token) {
        const rawToken = data.accessToken || data.token;
        const token = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;

        const userData = {
          accessToken: token,
          userId: data.userid?.toString() || data.id?.toString(),
          role: data.role || 'CUSTOMER',
          email: data.emailid || data.email
        };

        const storageUser = { ...userData };
        delete storageUser.accessToken;
        localStorage.setItem('authData', JSON.stringify(storageUser));
        tokenService.setTokens(token, null, userData);
      }

      return data;
    } catch (error) {
      console.error('[AuthService] verifyOtp error:', error);
      throw new Error(error.message || 'OTP verification failed');
    }
  }

  // -------------------- REGISTER --------------------
  async register(userData) {
    console.log('[AuthService] Register called', userData);
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const responseText = await response.text();
    if (!response.ok) throw new Error(responseText || 'Registration failed');
    try {
      return JSON.parse(responseText);
    } catch {
      return { message: responseText };
    }
  }

  // -------------------- LOGIN --------------------
  async login(credentials) {
    console.log('[AuthService] Login called', credentials);
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      credentials: 'include', // Important for receiving HttpOnly cookies
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message);
    }

    const data = await response.json();
    
    // The backend now sends the refresh token as an HttpOnly cookie
    // We only need to handle the access token and user data
    if (data.accessToken && data.userid) {
      const token = data.accessToken.startsWith('Bearer ')
        ? data.accessToken
        : `Bearer ${data.accessToken}`;
        
      const userData = {
        accessToken: token,
        userId: data.userid.toString(),
        role: data.role || 'CUSTOMER',
        email: credentials.email
      };
      
      // Store non-sensitive user data in localStorage
      const storageUser = { ...userData };
      delete storageUser.accessToken; // Don't store the access token in localStorage
      localStorage.setItem('authData', JSON.stringify(storageUser));
      
      // Set tokens in memory and handle cookie management
      tokenService.setTokens(token, null, userData);
    }

    return data;
  }

  // -------------------- REFRESH TOKEN --------------------
  async refreshToken() {
    return tokenService.refreshToken();
  }

  // -------------------- LOGOUT --------------------
  async logout() {
    try {
      // Ensure we have a valid access token. If not, attempt a silent refresh.
      let token = tokenService.getAccessToken();
      if (!token) {
        try {
          await tokenService.refreshToken();
        } catch (e) {
          // refresh may fail; we'll still attempt logout with cookies included
          console.warn('[AuthService] Silent refresh before logout failed', e);
        }
        token = tokenService.getAccessToken();
      }

      // Build Authorization header if token available
      const authHeader = token && (token.startsWith('Bearer ') ? token : `Bearer ${token}`);

      // Call backend to invalidate refresh token and clear HttpOnly cookie
      const res = await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',  // Important to include credentials so server can clear cookies
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeader ? { Authorization: authHeader } : {})
      });

      if (!res.ok) {
        const text = await res.text().catch(() => null);
        console.warn('[AuthService] Logout endpoint returned non-OK:', res.status, text);
      }

      // Clear local storage and in-memory tokens regardless of backend response
      localStorage.removeItem('authData');
      tokenService.clearTokens();

      return true;
    } catch (e) {
      console.error('[AuthService] Logout error', e);
      // Still clear local state even if backend call fails
      localStorage.removeItem('authData');
      tokenService.clearTokens();
      return false;
    }
  }

  // -------------------- RESTORE SESSION --------------------
  async restoreSession() {
    try {
      console.log('[AuthService] Attempting to restore session');
      
      // First try to refresh the token using HTTP-only cookie
      const refreshed = await tokenService.refreshToken();
      console.log('[AuthService] Token refresh result:', !!refreshed);
      
      if (refreshed) {
        // Get stored user data
        const stored = localStorage.getItem('authData');
        const userData = stored ? JSON.parse(stored) : null;
        console.log('[AuthService] Found stored user data:', !!userData);
        
        if (!userData) {
          // If we have a valid token but no stored data, fetch user info
          try {
            const userInfo = await userService.getUserInfo();
            if (userInfo) {
              console.log('[AuthService] Retrieved fresh user info');
              localStorage.setItem('authData', JSON.stringify(userInfo));
              tokenService.setTokens(tokenService.getAccessToken(), null, userInfo);
              return true;
            }
          } catch (error) {
            console.error('[AuthService] Failed to fetch user info:', error);
          }
        } else {
          // We have both valid token and stored data
          console.log('[AuthService] Restoring session with stored data');
          tokenService.setTokens(tokenService.getAccessToken(), null, userData);
          return true;
        }
      } else {
        console.log('[AuthService] Token refresh failed, checking stored data');
        // If refresh failed but we have stored data, try one more refresh
        const stored = localStorage.getItem('authData');
        if (stored) {
          try {
            const secondAttempt = await tokenService.refreshToken();
            if (secondAttempt) {
              console.log('[AuthService] Second refresh attempt succeeded');
              return true;
            }
          } catch (error) {
            console.warn('[AuthService] Second refresh attempt failed:', error);
          }
        }
      }
    } catch (error) {
      console.error('[AuthService] Session restoration failed:', error);
    }
    
    console.log('[AuthService] Session restoration unsuccessful');
    return false;
  }

  // -------------------- FORGOT PASSWORD --------------------
  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/forgotpassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  }

  // -------------------- VALIDATE RESET OTP --------------------
  async validateResetOtp(email, otp) {
    const res = await fetch(`${API_BASE}/validate-reset-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, otp })
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  }

  // -------------------- RESET PASSWORD --------------------
  async resetPassword(email, newPassword) {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, newPassword })
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    return JSON.parse(text);
  }
}

export const authService = new AuthService();

