import { Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/toaster";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Policies from "./pages/Policies";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import PromoManagement from "./pages/PromoManagement";
import { MainLayout } from "./components/MainLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ScrollToTop } from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import { enableProtection } from "./utils/protection";
import { useEffect } from "react";
import { useAuth } from "./context/AuthContext";
import { useCartStore } from '@/store/cartStore';

function App() {
  const { user } = useAuth();
  const { initializeCart } = useCartStore();

  useEffect(() => {
    enableProtection();
  }, []);

  useEffect(() => {
    // Initialize cart when user changes
    if (user?.userid) {
      // Small delay to ensure auth token is set
      const timer = setTimeout(() => {
        initializeCart(user.userid);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, initializeCart]);

  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Routes>
        {/* Auth routes without footer */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route element={<MainLayout />}>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="ROLE_ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/promos"
            element={
              <ProtectedRoute requiredRole="ROLE_ADMIN">
                <PromoManagement />
              </ProtectedRoute>
            }
          />
        </Route>
        {/* Protected routes */}
        <Route element={<MainLayout />}>
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Main routes with footer */}
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route 
            path="/checkout" 
            element={
              <ProtectedRoute>
                <Checkout />
              </ProtectedRoute>
            } 
          />
          <Route path="/policies" element={<Policies />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </ErrorBoundary>
  );
}

export default App;
