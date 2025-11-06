class TokenService {
  constructor() {
    this.TOKEN_COOKIE = 'auth_token';
    this.USER_DATA_KEY = 'authData';
    this.USER_COOKIE_PREFIX = 'htp_user_';
    this.USER_FIELDS = [
      'emailid',
      'firstname',
      'lastname',
      'mobilenum',
      'role',
      'userId',
      'userid'
    ];
    this._hasSession = false;
    this.accessToken = null;
    this.init();
  }

  async init() {
    try {
      const userData = localStorage.getItem(this.USER_DATA_KEY);
      const parsedUserData = userData ? JSON.parse(userData) : null;
      console.log('[TokenService] init userData:', parsedUserData);

      const hasRecentSession = parsedUserData?.lastRefresh && 
        (Date.now() - parsedUserData.lastRefresh) < 12 * 60 * 60 * 1000;

      const hasUserHint = hasRecentSession || (document.cookie || '').includes(this.USER_COOKIE_PREFIX);
      
      if (hasUserHint) {
        try {
          const token = await this.refreshToken();
          if (token) {
            console.log('[TokenService] Silent refresh on init succeeded');
            const event = new CustomEvent('auth:token-refreshed', { 
              detail: { success: true } 
            });
            window.dispatchEvent(event);
          }
        } catch (err) {
          console.warn('[TokenService] Silent refresh on init failed:', err);
        }
      } else {
        console.log('[TokenService] No session hint found on init — skipping silent refresh');
      }

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
    } catch (err) {
      console.error('[TokenService] Init error:', err);
    }
  }

  setTokens(accessToken, _, userData) {
    const token = accessToken ? (accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`) : null;
    console.log('[TokenService] setTokens, received token:', !!token, 'userData:', userData);

    this.accessToken = token;
    this._hasSession = !!token || !!userData;

    if (userData) {
      const existing = this.getUserInfo() || {};
      const mergedForStorage = {
        ...existing,
        ...userData,
        role: userData.role || existing.role,
        lastRefresh: Date.now()
      };

      if (mergedForStorage.accessToken) delete mergedForStorage.accessToken;
      localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(mergedForStorage));

      this.USER_FIELDS.forEach(field => {
        if (mergedForStorage[field] != null) {
          const cookieName = `${this.USER_COOKIE_PREFIX}${field}`;
          const cookieValue = encodeURIComponent(String(mergedForStorage[field]));
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          const expires = new Date(Date.now() + oneWeek).toUTCString();
          document.cookie = `${cookieName}=${cookieValue}; expires=${expires}; path=/; SameSite=Strict`;
        }
      });
    }

    this.setAutoRefresh();
  }

  getAccessToken() {
    if (this.accessToken && !this.isTokenExpired(this.accessToken)) {
      const pureToken = this.accessToken.startsWith('Bearer ')
        ? this.accessToken.split(' ')[1]
        : this.accessToken;
      return `Bearer ${pureToken}`;
    }
    return null;
  }

  isTokenExpired(token) {
    if (!token) return true;
    try {
      const raw = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
      const parts = raw.split('.');
      if (parts.length < 2) return true;
      const payload = JSON.parse(atob(parts[1]));
      return Date.now() >= payload.exp * 1000;
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
      return timeLeft <= 5 * 60 * 1000;
    } catch (e) {
      console.warn('[TokenService] willTokenExpireSoon parse error', e);
      return true;
    }
  }

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
        await new Promise(r => setTimeout(r, BASE_DELAY * Math.pow(2, attempt)));
      }
    }
    return null;
  }

  async performRefresh() {
    try {
      console.log('[TokenService] performRefresh -> calling /refresh-token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/refresh-token`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      try {
        const text = await response.text();
        console.log('[TokenService] refresh status', response.status, 'body:', text);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.warn('[TokenService] refresh unauthorized (401/403)');
            return null;
          }
          throw new Error(`Refresh failed: ${response.status}`);
        }

        let data = {};
        try {
          data = JSON.parse(text || '{}');
        } catch (e) {
          console.warn('[TokenService] parse refresh JSON failed', e);
        }

        if (data.accessToken) {
          const token = data.accessToken.startsWith('Bearer ')
            ? data.accessToken 
            : `Bearer ${data.accessToken}`;
          
          const currentUser = this.getUserInfo() || {};
          const updatedUser = { ...currentUser, accessToken: token };
          this.setTokens(token, null, updatedUser);
          console.log('[TokenService] refresh successful, token set');
          return token;
        }

        console.warn('[TokenService] refresh response missing token');
        return null;
      } catch (err) {
        console.error('[TokenService] refresh parse error:', err);
        throw err;
      }
    } catch (err) {
      console.error('[TokenService] refresh request error:', err);
      throw err;
    }
  }

  setAutoRefresh() {
    const REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    
    if (this.accessToken) {
      try {
        const parts = this.accessToken.split(' ')[1];
        const payload = JSON.parse(atob(parts.split('.')[1]));
        const expMs = payload.exp * 1000;
        const timeToRefresh = expMs - Date.now() - REFRESH_BUFFER;
        
        if (timeToRefresh > 0) {
          this._refreshTimeout = setTimeout(() => {
            this.refreshToken().catch(err => {
              console.warn('[TokenService] Auto refresh failed:', err);
            });
          }, timeToRefresh);
        }
      } catch (e) {
        console.warn('[TokenService] setAutoRefresh parse error:', e);
      }
    }
  }

  clearTokens() {
    this.accessToken = null;
    this._hasSession = false;
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }

    localStorage.removeItem(this.USER_DATA_KEY);
    
    const pastDate = new Date(0).toUTCString();
    this.USER_FIELDS.forEach(field => {
      const cookieName = `${this.USER_COOKIE_PREFIX}${field}`;
      document.cookie = `${cookieName}=; expires=${pastDate}; path=/`;
    });
  }

  getUserInfo() {
    try {
      const data = localStorage.getItem(this.USER_DATA_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('[TokenService] getUserInfo parse error:', e);
      return null;
    }
  }
}

const tokenService = new TokenService();
export { tokenService };