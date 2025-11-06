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
      credentials: 'include',
      body: JSON.stringify(credentials)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Login failed' }));
      throw new Error(err.message);
    }

    const data = await response.json();
    if (data.accessToken && data.userid) {
      const token = data.accessToken.startsWith('Bearer ')
        ? data.accessToken
        : `Bearer ${data.accessToken}`;
      const userData = {
        accessToken: token,
        userId: data.userid.toString(),
        role: data.role,
        email: data.emailid || credentials.email
      };
      const storageUser = { ...userData };
      delete storageUser.accessToken;
      localStorage.setItem('authData', JSON.stringify(storageUser));
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
      await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (e) {
      console.error('[AuthService] Logout error', e);
    }
    localStorage.removeItem('authData');
    tokenService.clearTokens();
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

