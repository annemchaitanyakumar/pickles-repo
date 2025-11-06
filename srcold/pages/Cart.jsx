// src/pages/Cart.jsx  (replace your current Cart file or integrate changes)
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Minus, ShoppingBag, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from '@/lib/axios';
import { PackagingSelect } from '@/components/PackagingSelect';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { prepareProductListForOrder } from '@/utils/orderUtils';
import { OrderSummary } from '@/components/OrderSummary';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function Cart() {
  const { 
    items, 
    removeItem, 
    incrementQuantity, 
    decrementQuantity, 
    loadCartItems,
    updatePackaging,
    isCheckoutAllowed,
    getItemTotalPrice,
    getTotalWithPackaging
  } = useCartStore();

  // Add image URL persistence
  const [persistentImages, setPersistentImages] = useState({});

  useEffect(() => {
    // Load persistent images from localStorage
    const savedImages = localStorage.getItem('cart-images');
    if (savedImages) {
      setPersistentImages(JSON.parse(savedImages));
    }
  }, []);

  useEffect(() => {
    // Update persistent images when items change
    const newImages = items.reduce((acc, item) => {
      if (item.image && item.image !== '/placeholder.png') {
        acc[item.productId] = item.image;
      }
      return acc;
    }, {});
    
    setPersistentImages(prev => {
      const merged = { ...prev, ...newImages };
      try {
        localStorage.setItem('cart-images', JSON.stringify(merged));
      } catch (err) {
        console.warn('Failed to persist cart-images to localStorage', err);
      }
      return merged;
    });
  }, [items]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState({});
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [taxInfo, setTaxInfo] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    setLoadingStates((prev) => ({
      ...prev,
      ...items.reduce((acc, item) => ({ ...acc, [item.cartId]: false }), {}),
    }));
  }, [items]);

  // totals (same as your previous logic; packaging fees are optional client-side)
  const calculateSubtotal = () => {
    return items.reduce((total, item) => {
      // Use the total price from backend directly
      const totalPrice = parseFloat(item.totalPrice || item.weightBasedPrice || item.productPrice || item.price || 0);
      return total + totalPrice;
    }, 0);
  };

  const calculateTotalContainerFee = () => {
    return items.reduce((total, item) => {
      if (item.packagingType === 'container' && taxInfo?.containerCharges) {
        return total + (taxInfo.containerCharges * (item.quantity || 1));
      }
      return total;
    }, 0);
  };

  // Prepare optimized product list for order
  const prepareOrderData = () => {
    const optimizedItems = prepareProductListForOrder(items);
    // Convert to string and limit size
    return JSON.stringify(optimizedItems).slice(0, 1000); // Adjust size based on your DB column size
  };
  
  const freeShippingThreshold = 500; // TODO: This should come from backend config
  
  // Calculate shipping based on the new rules
  const calculateShipping = () => {
    if (items.length === 0 || !taxInfo) return 0;
    const totalWithoutContainer = subtotal - totalContainerFee;
    return totalWithoutContainer >= freeShippingThreshold ? 0 : taxInfo.shippingCharges;
  };
  
  const subtotal = calculateSubtotal();
  const totalContainerFee = calculateTotalContainerFee();
  const tax = taxInfo ? (subtotal * taxInfo.gstPercentage) / 100 : 0;
  const shipping = calculateShipping();
  // Include container fee in total calculation
  const total = taxInfo ? (subtotal + totalContainerFee + shipping + tax) : subtotal;
  
  // Calculate how much more needed for free shipping
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - (subtotal - totalContainerFee));

  const setItemLoading = (cartId, isLoadingFlag) => {
    setLoadingStates((prev) => ({ ...prev, [cartId]: isLoadingFlag }));
  };

  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `${import.meta.env.VITE_API_URL}/api/products/${productId}/presigned-urls`;
    try {
      const response = await axios.get(presignedUrlsUrl);
      const data = response.data;
      return data.product_image1_url || data.image1_url || data[0] || '/placeholder.png';
    } catch (error) {
      console.error(`Failed to fetch presigned URL for product ${productId}:`, error);
      return '/placeholder.png';
    }
  };

  const fetchTaxInfo = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/get-tax-info`);
      setTaxInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch tax info:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tax information',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    async function initializeCart() {
      if (!user) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to view your cart.',
          variant: 'destructive',
        });
        navigate('/login', { state: { from: '/cart' } });
        return;
      }
      try {
        setIsLoading(true);
        await Promise.all([
          loadCartItems(),
          fetchTaxInfo()
        ]);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load cart information',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    initializeCart();
  }, [user, loadCartItems, navigate, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 gradient-primary rounded-full flex items-center justify-center animate-pulse">
                <ShoppingBag className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Loading your cart...</h1>
              <p className="text-xl text-muted-foreground mb-8">Please wait while we fetch your cart items</p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 gradient-primary rounded-full flex items-center justify-center">
                <ShoppingBag className="h-12 w-12 text-primary-foreground" />
              </div>
              <h1 className="text-4xl font-bold mb-4">Your cart is empty</h1>
              <p className="text-xl text-muted-foreground mb-8">Looks like you haven't added any delicious pickles yet!</p>
              <Link to="/products">
                <Button size="lg" className="gradient-primary text-primary-foreground">
                  Start Shopping
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  const handleCheckout = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmCheckout = () => {
    setShowConfirmDialog(false);
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      <div className="pt-10 pb-16 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-center mb-3 sm:mb-4">
              Shopping <span className="gradient-primary bg-clip-text text-transparent">Cart</span>
            </h1>
            <p className="text-center text-sm sm:text-base text-muted-foreground">Review your selected pickles and proceed to checkout</p>
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl sm:text-2xl font-semibold">Cart Items ({items.length})</h2>
              </div>
              <AnimatePresence>
                {items.map((item, index) => (
                  <motion.div
                    key={item.cartId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="w-full px-2 sm:px-0">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                          {/* Product Info Section */}
                          <div className="flex items-start gap-4 w-full lg:w-1/2">
                            <Link
                              to={item.slug ? `/products/${item.slug}` : `/products/${item.productName.toLowerCase().replace(/\s+/g, '-')}`}
                              className="hover:opacity-75 transition-opacity duration-200 shrink-0"
                            >
                              {(() => {
                                const displaySrc = item.image || persistentImages[item.productId] || '/placeholder.png';
                                // Debug log to help diagnose flicker
                                console.debug('[Cart] render image', { productId: item.productId, itemImage: item.image, persistent: persistentImages[item.productId], displaySrc });
                                return (
                                  <img
                                    src={displaySrc}
                                    alt={item.productName}
                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg cursor-pointer"
                                    loading="eager"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = '/placeholder.png';
                                    }}
                                  />
                                );
                              })()}
                            </Link>
                            <div className="flex-1 min-w-0">
                              <Link
                                to={item.slug ? `/products/${item.slug}` : `/products/${item.productName.toLowerCase().replace(/\s+/g, '-')}`}
                                className="hover:text-primary transition-colors duration-200"
                              >
                                <h3 className="font-semibold text-sm sm:text-base md:text-lg cursor-pointer truncate">
                                  {item.productName}
                                </h3>
                              </Link>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {item.productWeight}g - {item.category}
                              </p>
                              <p className="font-bold text-primary text-sm sm:text-base md:text-lg">
                                ₹{item.weightBasedPrice || item.productPrice || item.price || 0}
                                {item.packagingType === 'container' && taxInfo?.containerCharges ? ` + ₹${taxInfo.containerCharges} (container)` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Actions Section */}
                          <div className="flex flex-row items-center justify-between lg:justify-end w-full sm:w-auto sm:gap-4">
                            <div className="w-[130px] lg:w-48 flex-shrink-0">
                              <PackagingSelect 
                                value={item.packagingType || (item.isContainer ? 'container' : 'general')} 
                                containerCharges={taxInfo.containerCharges}
                                quantity={item.quantity}
                                onChange={async (value) => {
                                  setItemLoading(item.cartId, true);
                                  try {
                                    await updatePackaging(item.cartId, value);
                                  } catch (e) {
                                    // toast handled by store
                                  } finally {
                                    setItemLoading(item.cartId, false);
                                  }
                                }}
                              />
                            </div>
                            <div className="flex items-center">
                              <div className="flex items-center border rounded-md">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none"
                                  onClick={() => {
                                    if (item.isContainer) {
                                      toast({
                                        title: "Container quantity is fixed",
                                        description: "Container quantity cannot be modified",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    setItemLoading(item.cartId, true);
                                    decrementQuantity(item.cartId)
                                      .catch((error) => {
                                        toast({
                                          title: 'Error',
                                          description: error.message || 'Failed to update quantity. Please try again.',
                                          variant: 'destructive',
                                        });
                                      })
                                      .finally(() => setItemLoading(item.cartId, false));
                                  }}
                                  disabled={loadingStates[item.cartId] || item.quantity <= 1 || item.isContainer}
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-none"
                                  onClick={() => {
                                    if (item.isContainer) {
                                      toast({
                                        title: "Container quantity is fixed",
                                        description: "Container quantity cannot be modified",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    if (item.quantity >= 10) {
                                      toast({
                                        title: "Maximum quantity reached",
                                        description: "Maximum 10 items allowed per order",
                                        variant: "destructive"
                                      });
                                      return;
                                    }
                                    setItemLoading(item.cartId, true);
                                    incrementQuantity(item.cartId)
                                      .catch((error) => {
                                        toast({
                                          title: 'Error',
                                          description: error.message || 'Failed to update quantity. Please try again.',
                                          variant: 'destructive',
                                        });
                                      })
                                      .finally(() => setItemLoading(item.cartId, false));
                                  }}
                                  disabled={loadingStates[item.cartId] || item.isContainer || item.quantity >= 10}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive border rounded-md ml-2"
                                onClick={() => {
                                  setItemLoading(item.cartId, true);
                                  removeItem(item.cartId)
                                    .catch(() => {
                                      toast({
                                        title: 'Error',
                                        description: 'Failed to remove item. Please try again.',
                                        variant: 'destructive',
                                      });
                                    })
                                    .finally(() => setItemLoading(item.cartId, false));
                                }}
                                disabled={loadingStates[item.cartId]}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <OrderSummary 
                    subtotal={calculateSubtotal()}
                    containerCharges={totalContainerFee}
                    shipping={shipping}
                    taxInfo={taxInfo}
                    total={total}
                  />
                  <div className="border-t pt-4">
                    {!isCheckoutAllowed() && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Please select packaging type for all items before proceeding to checkout.
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="flex flex-col gap-4">
                      <Button 
                        className="w-full bg-[#F4B63F] hover:bg-[#F4B63F]/90 text-black" 
                        onClick={handleCheckout}
                      >
                        Proceed to Checkout
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/products')}
                      >
                        Continue Shopping
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        By clicking the pay now button, you agree to our{' '}
                        <Link to="/terms" className="text-primary hover:underline">
                          Terms and Conditions
                        </Link>{' '}
                        and{' '}
                        <Link to="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </Link>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Move the AlertDialog outside of CardContent */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Order</AlertDialogTitle>
            <AlertDialogDescription>
              Please note that this is a non-returnable and non-refundable order. 
              By proceeding, you acknowledge and agree to these terms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-[#F4B63F] hover:bg-[#F4B63F]/90 text-black"
              onClick={handleConfirmCheckout}
            >
              Proceed to Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
