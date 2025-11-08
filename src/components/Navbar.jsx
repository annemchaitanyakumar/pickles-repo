import React, { useState, useEffect, useRef} from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Menu, X, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/store/cartStore';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/SearchBar';
import { useAuth } from '@/context/AuthContext';
import { useProductStore } from '@/store/productStore';
import axiosInstance from '@/lib/axios';
import axios from 'axios';
import { tokenService } from '@/services/tokenService';

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const products = useProductStore(state => state.products);
  const cartStore = useCartStore();
  const { items, initializeCart, userId, getTotalItems } = cartStore;
  const totalItemsLocal = getTotalItems();
  
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe(
      state => state.items,
      (items) => {
        const newCount = cartStore.getTotalItems();
        console.log('Cart items changed, new count:', newCount);
        setBackendCount(newCount);
      }
    );
    return () => unsubscribe();
  }, []);

  const [backendCount, setBackendCount] = useState(null);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const [showBadge, setShowBadge] = useState(true);

  useEffect(() => {
    const loadCartData = async () => {
      if (user?.userid && isAuthenticated) {
        try {
          console.log('Initializing cart for user:', user.userid);
          await initializeCart(user.userid);
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
          abortControllerRef.current = new AbortController();
          await fetchCartCount(abortControllerRef.current.signal);
          setShowBadge(true);
        } catch (error) {
          console.error('Error loading cart data:', error);
          setBackendCount(null);
        }
      } else {
        setBackendCount(null);
        setShowBadge(false);
      }
    };

    loadCartData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, isAuthenticated]);

  const isAdmin = () => {
    const storedAuthData = localStorage.getItem('authData');
    if (storedAuthData) {
      const authData = JSON.parse(storedAuthData);
      return authData?.role?.toUpperCase() === 'ROLE_ADMIN' || 
             authData?.role?.toUpperCase() === 'ADMIN';
    }
    return false;
  };

  const isCustomerCare = () => {
    const stored = localStorage.getItem('authData');
    if (!stored) return false;
    try {
      const auth = JSON.parse(stored);
      const candidate = auth?.role ?? auth?.roles ?? auth?.authorities ?? '';
      if (Array.isArray(candidate)) {
        return candidate.some((r) => {
          if (!r) return false;
          if (typeof r === 'string') return r.toUpperCase().includes('CUSTOMERCARE');
          if (typeof r === 'object') {
            const v = r.authority || r.role || r.name || r;
            return String(v).toUpperCase().includes('CUSTOMERCARE');
          }
          return false;
        });
      }
      const s = String(candidate || '').trim().toUpperCase();
      if (!s) return false;
      if (s.startsWith('ROLE_')) return s.includes('CUSTOMERCARE');
      return s === 'CUSTOMERCARE' || s.includes('CUSTOMERCARE');
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const authData = localStorage.getItem('authData');
    if (authData) {
      console.log('Current user role:', JSON.parse(authData).role);
    }
  }, []);

  const baseNavItems = [
    { name: 'Home', path: '/' },
    { name: 'Products', path: '/products' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];
  const adminMenu = [
    { name: 'Product Management', path: '/admin' },
    { name: 'Promo Management', path: '/admin/promos' }
  ];

  const navItems = isAdmin()
    ? [...baseNavItems]
    : baseNavItems;

  // If the user is CUSTOMERCARE, show a Manage link in the main nav
  if (isCustomerCare()) {
    // avoid duplicate if already present
    if (!navItems.find(i => i.path === '/customer-care')) {
      navItems.push({ name: 'Manage', path: '/customer-care' });
    }
  }

  const fetchCartCount = async (signal) => {
    try {
      const token = tokenService.getAccessToken();
      if (!token) {
        console.warn('No access token available for cart count fetch (will attempt silent refresh if possible)');
        return;
      }

      const items = useCartStore.getState().items;
      const localCount = items?.length || 0;
      
      console.log('Fetching cart count with token:', token);
      const resp = await axiosInstance.get('/cart-count', {
        headers: {
          Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal
      });

      console.log('Cart count response:', resp.data);
      
      const d = resp?.data ?? {};
      let count = null;
      
      if (typeof d === 'number') {
        count = d;
      } else if (typeof d.count === 'number') {
        count = d.count;
      } else if (typeof d.total === 'number') {
        count = d.total;
      } else if (typeof d.totalItems === 'number') {
        count = d.totalItems;
      } else if (typeof d.data?.count === 'number') {
        count = d.data.count;
      }

      if (count === null || typeof count === 'undefined') {
        console.log('Using local cart count:', localCount);
        count = localCount;
      }

      console.log('Setting backend count to:', count);
      setBackendCount(Number(count));
      
      if (count > 0 && isAuthenticated) {
        setShowBadge(true);
      }
    } catch (err) {
      if (axios.isCancel(err)) {
        // aborted - ignore
      } else {
        console.warn('fetchCartCount error:', err?.response?.data ?? err.message);
      }
    }
  };

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    fetchCartCount(abortControllerRef.current.signal);

    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setShowBadge(true);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      fetchCartCount(abortControllerRef.current.signal);
    } else {
      setShowBadge(false);
      setBackendCount(null);
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch (e) {}
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const unsub = useCartStore.subscribe(
      (items) => items,
      (currentItems, previousItems) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          if (!isAuthenticated) {
            setShowBadge(false);
            setBackendCount(null);
            return;
          }

          if (abortControllerRef.current) abortControllerRef.current.abort();
          abortControllerRef.current = new AbortController();
          fetchCartCount(abortControllerRef.current.signal);
        }, 250);
      }
    );

    return () => {
      try {
        unsub();
      } catch (e) {}
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [isAuthenticated]);

  const displayedCount = typeof backendCount === 'number' && !Number.isNaN(backendCount)
    ? backendCount
    : (totalItemsLocal || 0);

  const handleLogout = () => {
    try {
      if (abortControllerRef.current) {
        try { abortControllerRef.current.abort(); } catch (e) {}
      }
    } finally {
      logout();
      navigate('/');
    }
  };

  useEffect(() => {
    if (user?.userid !== userId) {
      initializeCart(user?.userid);
    }
  }, [user, initializeCart, userId]);

  const handleCartCountUpdate = (event) => {
    console.log('Cart count updated:', event.detail);
    setBackendCount(event.detail);
    if (isAuthenticated) setShowBadge(true);
  };

  useEffect(() => {
    window.addEventListener('cart-count-updated', handleCartCountUpdate);
    return () => {
      window.removeEventListener('cart-count-updated', handleCartCountUpdate);
    };
  }, [isAuthenticated]);

  function onSearchSubmit(e) {
    e.preventDefault();
    // wire this to your search action/navigation
    console.log("Search for:", query);
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-white/80 md:bg-white backdrop-blur-md md:backdrop-blur-none border-b"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Logo */}
                    {/* Left Section: Logo */}
          <div className="flex items-center md:w-auto md:justify-start">
            <Link to="/" className="flex items-center">
              <img src="/HT_Pickles_gif.gif" alt="Logo" className="h-10 w-auto md:h-12" />
            </Link>
            <div className="flex-1 flex justify-center md:hidden">
              <img 
                src="/ww.png" 
                alt="HT Pickles" 
                className="h-6 w-auto mx-4"
                style={{ maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
            <div className="hidden md:flex md:ml-2">
              <img 
                src="/ww.png" 
                alt="HT Pickles" 
                className="h-8 w-auto"
                style={{ maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Center Section: Navigation - centered */}
          <div className="hidden md:flex items-center space-x-6 flex-1 justify-center">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-colors hover:text-primary whitespace-nowrap bubble-text ${location.pathname === item.path ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {item.name}
              </Link>
            ))}

            {isAdmin() && (
              <div className="relative group inline-block">
                <button className={`text-sm font-medium transition-colors whitespace-nowrap ${location.pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground'} hover:text-primary`}>
                  Admin
                </button>
                <div className="invisible group-hover:visible absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white border z-40 opacity-0 group-hover:opacity-100 transform scale-95 group-hover:scale-100 transition-all duration-200">
                  <div className="py-1">
                    {adminMenu.map(m => (
                      <Link
                        key={m.path}
                        to={m.path}
                        className={`block px-4 py-2 text-sm hover:bg-secondary/5 ${location.pathname === m.path ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {m.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Section: Search, Auth, and Cart */}
          <div className="flex items-center space-x-4">
            {/* Search Bar - Only visible on desktop */}
            <div className="hidden md:block">
              {/* Keep search permanently expanded in navbar on md+ */}
              <SearchBar className="w-48 lg:w-60" forceExpanded={true} />
            </div>
            
            {/* Auth Buttons */}
            <div className="hidden md:flex items-center space-x-2">
              {isAuthenticated ? (
                <>
                  <Link to="/profile">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:bg-secondary/10 hover:text-secondary transition-colors"
                    >
                      <User className="h-4 w-4 mr-1" />
                      <span className="truncate max-w-[100px]">
                        {user?.firstname || user?.emailid || 'Account'}
                      </span>
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Link to="/login">
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-warm"
                  >
                    Login
                  </Button>
                </Link>
              )}
            </div>

            {/* Cart */}
            <Link
              to="/cart"
              onClick={() => {
                window.scrollTo(0, 0);
                setIsMenuOpen(false);
              }}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                <Button variant="outline" size="icon" className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  {showBadge && displayedCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {displayedCount}
                    </Badge>
                  )}
                </Button>
              </motion.div>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="md:hidden bg-white/95 shadow-lg absolute top-full left-0 right-0"
            >
              <div className="py-4">
                <div className="px-4 mb-4">
                  <SearchBar className="w-full" />
                </div>
                
                <div className="space-y-1">
                  {navItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/10 ${
                        location.pathname === item.path ? 'text-primary bg-secondary/5' : 'text-muted-foreground'
                      }`}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  {isAdmin() && (
                    <>
                      <div className="border-t my-2" />
                      {adminMenu.map(m => (
                        <Link
                          key={m.path}
                          to={m.path}
                          className={`block px-4 py-2.5 text-sm font-medium transition-colors hover:bg-secondary/10 ${location.pathname === m.path ? 'text-primary bg-secondary/5' : 'text-muted-foreground'}`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {m.name}
                        </Link>
                      ))}
                    </>
                  )}
                </div>

                <div className="mt-4 px-4 pt-4 border-t border-border space-y-2">
                  {isAuthenticated ? (
                    <>
                      <Link to="/profile" className="w-full" onClick={() => setIsMenuOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full text-muted-foreground hover:bg-secondary/10 hover:text-secondary transition-colors"
                        >
                          <User className="h-4 w-4 mr-2" />
                          {user?.firstname || user?.emailid || 'Account'}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </Button>
                    </>
                  ) : (
                    <Link to="/login" className="w-full" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-warm">
                        <User className="w-4 h-4 mr-2" />
                        Login
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      {/* Close container div */}
    </div>

      {/* minimal responsive CSS injected so this file is standalone */}
      <style>{`
          /* hide/show logo text and search based on width */
          .logo-full { display: inline; }
          .logo-short { display: none; }
          .desktop-search { display: block; }
          .mobile-menu { display: block; overflow: hidden; transition: max-height 240ms ease, padding 200ms ease; }

          @media (max-width: 767px) {
              .logo-full { display: none; }
              .logo-short { display: inline; }
              .desktop-search { display: none; }
          }
      `}</style>
    </motion.nav>
  );
};
