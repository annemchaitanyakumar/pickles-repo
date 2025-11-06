// services/tokenService.js
const TOKEN_COOKIE = 'auth_token'; // kept for compatibility but we don't persist token here
const USER_DATA_KEY = 'authData';
const USER_COOKIE_PREFIX = 'htp_user_';

const USER_FIELDS = [
  'emailid',
  'firstname',
  'lastname',
  'mobilenum',
  'role',
  'userId',
  'userid'
];

export default class TokenService {
  constructor() {
    console.log('[TokenService] Initializing');
    this.tokenKey = TOKEN_COOKIE;
    this.userKey = USER_DATA_KEY;
    this.init();
  }

  async init() {
    // load user info (authData) from localStorage to preserve UI state
    const userData = localStorage.getItem(this.userKey);
    console.log('[TokenService] init userData:', userData ? JSON.parse(userData) : null);

    // Always attempt a token refresh on init if we have a session hint
    const hasUserHint = !!userData || (document.cookie || '').includes('refreshToken');
    console.log('[TokenService] Session hint detected:', hasUserHint);

    if (hasUserHint) {
      try {
        const refreshResult = await this.refreshToken();
        if (refreshResult) {
          console.log('[TokenService] Silent refresh on init succeeded');
          // Don't clear local data on refresh failure - let explicit logout handle that
          this._hasSession = true;
          return;
        }
      } catch (err) {
        console.warn('[TokenService] Silent refresh on init failed:', err);
        // Keep stored data even if refresh fails - may be temporary network issue
      }
    } else {
      console.log('[TokenService] No session hint found on init — skipping silent refresh');
    }

    // visibility/focus listeners to attempt refresh when user returns
    if (typeof window !== 'undefined') {
      let visTimeout = null;
      window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          if (visTimeout) clearTimeout(visTimeout);
          visTimeout = setTimeout(() => {
            if (!this.accessToken || this.willTokenExpireSoon()) {
              this.refreshToken().catch(e => console.warn('[TokenService] visibility refresh failed:', e));
            }
          }, 300);
        }
      });

      window.addEventListener('focus', () => {
        if (!this.accessToken || this.willTokenExpireSoon()) {
          this.refreshToken().catch(e => console.warn('[TokenService] focus refresh failed:', e));
        }
      });
    }
  }

  /**
   * Set tokens and user data.
   * accessToken: full "Bearer ..." string or raw token
   * userData: object to store in localStorage (authData) and mirror some fields to cookies
   */
  setTokens(accessToken, _, userData) {
    const token = accessToken ? (accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`) : null;
    console.log('[TokenService] setTokens, received token:', !!token, 'userData:', userData);

    // keep token in-memory only
    this.accessToken = token;
  // mark that we have a session when a token is set
  this._hasSession = !!token || !!userData;

    // if userData provided, merge with existing stored data and save to localStorage
    if (userData) {
      const existing = this.getUserInfo() || {};
      // Do NOT persist accessToken to localStorage. Store only non-sensitive user info.
      const mergedForStorage = { ...existing, ...userData, role: userData.role || existing.role };
      // Remove any accessToken field if present
      if (mergedForStorage.accessToken) delete mergedForStorage.accessToken;
      localStorage.setItem(this.userKey, JSON.stringify(mergedForStorage));
      // mirror non-sensitive user fields to cookies (not the refresh cookie)
      USER_FIELDS.forEach(field => {
        if (mergedForStorage[field] !== undefined && mergedForStorage[field] !== null) {
          const cookieName = `${USER_COOKIE_PREFIX}${field}`;
          const cookieValue = encodeURIComponent(String(mergedForStorage[field]));
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          const expires = new Date(Date.now() + oneWeek).toUTCString();
          // not HttpOnly (can't be) — don't store secrets here
          document.cookie = `${cookieName}=${cookieValue}; expires=${expires}; path=/; SameSite=Strict`;
        }
      });
    }

    this.setAutoRefresh();
  }

  getAccessToken() {
    // return in-memory token if valid
    if (this.accessToken && !this.isTokenExpired(this.accessToken)) {
      return this.accessToken;
    }
    // Do NOT recover token from localStorage. Rely on in-memory token and silent refresh via HttpOnly cookie.
    return null;
  }

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const raw = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const parts = raw.split('.');
      if (parts.length < 2) return true;
      const payload = JSON.parse(atob(parts[1]));
      const expMs = payload.exp * 1000;
      // treat expired if now past expiry
      return Date.now() >= expMs;
    } catch (e) {
      console.warn('[TokenService] isTokenExpired parse error', e);
      return true;
    }
  }

  willTokenExpireSoon(token = this.accessToken) {
    if (!token) return true;
    try {
      const parts = token.split(' ')[1];
      const payload = JSON.parse(atob(parts.split('.')[1]));
      const expMs = payload.exp * 1000;
      const timeLeft = expMs - Date.now();
      return timeLeft <= 5 * 60 * 1000; // 5 minutes
    } catch (e) {
      console.warn('[TokenService] willTokenExpireSoon parse error', e);
      return true;
    }
  }

  // perform up to MAX_RETRIES with exponential backoff
  async refreshToken() {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 800;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const res = await this.performRefresh();
        if (res) return res;
      } catch (err) {
        console.warn(`[TokenService] refresh attempt ${attempt + 1} failed`, err);
        if (attempt === MAX_RETRIES - 1) throw err;
        const wait = BASE_DELAY * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    return null;
  }

  // IMPORTANT: do not send Authorization header here. backend will read the refresh cookie.
  async performRefresh() {
    try {
      console.log('[TokenService] performRefresh -> calling /refresh-token (cookie-based)');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/refresh-token`, {
        method: 'POST',
        credentials: 'include',  // Important to include credentials for cookies
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Don't immediately clear tokens on 401/403
      // This helps prevent logout on temporary network issues
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('[TokenService] refresh unauthorized (401/403)');
          return null;
        }
        // For other errors, throw but don't clear tokens
        throw new Error(`Refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      // The backend returns both new access token and refresh token
      // Refresh token is automatically handled via HttpOnly cookie
      if (data.accessToken) {
        const token = data.accessToken.startsWith('Bearer ') ? data.accessToken : `Bearer ${data.accessToken}`;
        
        // Preserve existing user data in localStorage (role, ids)
        const currentUser = this.getUserInfo() || {};
        const updatedUser = { 
          ...currentUser, 
          accessToken: token,
          role: data.role || currentUser.role // Update role if provided in refresh response
        };
        
        this.setTokens(token, null, updatedUser);
        console.log('[TokenService] refresh successful, token set');
        return token;
      }

      // If backend returns nothing usable, treat as failure
      throw new Error('No accessToken in refresh response');
    } catch (error) {
      console.error('[TokenService] performRefresh error:', error);
      throw error;
    }
  }

  setAutoRefresh() {
    const token = this.getAccessToken();
    if (!token) return;
    try {
      const parts = token.split(' ')[1];
      const payload = JSON.parse(atob(parts.split('.')[1]));
      const expMs = payload.exp * 1000;
      const timeLeft = expMs - Date.now();
      const refreshDelay = Math.max(timeLeft - 5 * 60 * 1000, 0); // 5 minutes before expiry

      if (this._autoRefreshTimer) clearTimeout(this._autoRefreshTimer);
      console.log('[TokenService] scheduling auto refresh in ms:', refreshDelay);

      this._autoRefreshTimer = setTimeout(async () => {
        try {
          await this.refreshToken();
        } catch (e) {
          console.warn('[TokenService] auto refresh failed:', e);
        }
      }, refreshDelay);
    } catch (e) {
      console.warn('[TokenService] setAutoRefresh error:', e);
    }
  }

  clearTokens() {
    console.log('[TokenService] Clearing tokens and user data');
    this.accessToken = null;
    localStorage.removeItem(this.userKey);

    // clear mirrored cookies
    USER_FIELDS.forEach(field => {
      const cookieName = `${USER_COOKIE_PREFIX}${field}`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Strict`;
    });

    // Request backend to clear HttpOnly refresh cookie (best-effort).
    // Only attempt if we previously detected a session to avoid
    // unnecessary network calls that will 403 when there is no session.
    if (this._hasSession) {
      fetch(`${import.meta.env.VITE_API_URL}/logout`, {
        method: 'POST',
        credentials: 'include'
      }).catch(e => console.warn('[TokenService] backend logout error', e));
    }
    // reset session flag
    this._hasSession = false;

    // notify app
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:cleared', { detail: { reason: 'cleared' } }));
      }
    } catch (e) {
      console.warn('[TokenService] dispatch auth:cleared failed', e);
    }
  }

  getUserInfo() {
    const userData = localStorage.getItem(this.userKey);
    const parsed = userData ? JSON.parse(userData) : {};
    // merge with cookies
    const cookies = (document.cookie || '').split('; ').reduce((acc, kv) => {
      const [k, v] = kv.split('=');
      if (!k) return acc;
      if (k.startsWith(USER_COOKIE_PREFIX)) {
        const field = k.replace(USER_COOKIE_PREFIX, '');
        acc[field] = decodeURIComponent(v || '');
      }
      return acc;
    }, {});
    const merged = { ...cookies, ...parsed };
    if (Object.keys(merged).length > 0 && typeof window !== 'undefined') {
      try { window.dispatchEvent(new CustomEvent('auth:set', { detail: merged })); } catch (e) {}
      return merged;
    }
    return null;
  }
}

export const tokenService = new TokenService();