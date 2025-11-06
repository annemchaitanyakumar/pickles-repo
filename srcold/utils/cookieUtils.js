export const cookieUtils = {
    setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
        const cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
        document.cookie = cookie;
        console.log('[CookieUtils] Setting cookie:', { name, expires });
    },

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const cookieValue = decodeURIComponent(parts.pop().split(';').shift());
            console.log('[CookieUtils] Retrieved cookie:', { name, exists: !!cookieValue });
            return cookieValue;
        }
        console.log('[CookieUtils] Cookie not found:', { name });
        return null;
    },

    removeCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        console.log('[CookieUtils] Removed cookie:', { name });
    }
};