import React, { useState, useRef } from "react";
import axios from "axios";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { tokenService } from "@/services/tokenService";
import { cartService } from "@/services/cartService";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * PaymentButton (simplified: no unload/navigation restrictions)
 * - On Razorpay success: clear cart silently + navigate to /order-confirm
 */

const PaymentButton = ({ amount, customerInfo, isFormValid }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { items, isCheckoutAllowed } = useCartStore();
  const [isLoading, setIsLoading] = useState(false);

  const pendingMarkFailed = useRef(new Set());
  const razorpayOrderIdRef = useRef(null);
  const authTokenRef = useRef(null);

  const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const callMarkFailed = async (orderId, authToken) => {
    if (!orderId) return;
    if (pendingMarkFailed.current.has(orderId)) return;
    pendingMarkFailed.current.add(orderId);
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/mark-failed`,
        { razorpayOrderId: orderId },
        { headers: { Authorization: authToken } }
      );
    } catch (err) {
      console.error("mark-failed error:", err);
      toast({
        title: "Update Error",
        description: err.response?.data?.message || "Could not update order status",
        variant: "destructive",
      });
    } finally {
      pendingMarkFailed.current.delete(orderId);
    }
  };

  const clearCartSilent = () => {
    try {
      const store = useCartStore.getState();

      if (typeof store.clearCart === "function") {
        try {
          store.clearCart({ silent: true });
          return;
        } catch (e) {}
      }

      if (typeof useCartStore.setState === "function") {
        try {
          useCartStore.setState({ items: [] });
          return;
        } catch (e) {}
      }

      if (typeof store.setState === "function") {
        try {
          store.setState({ items: [] });
          return;
        } catch (e) {}
      }

      if (typeof store.clearCart === "function") {
        try {
          store.clearCart();
          return;
        } catch (e) {
          console.warn("clearCart fallback failed", e);
        }
      }
    } catch (err) {
      console.warn("clearCartSilent: unexpected error", err);
    }
  };

  const handlePayment = async () => {
    if (isLoading) return;

    try {
      setIsLoading(true);

      if (!razorpayKey) {
        toast({
          title: "Payment Error",
          description: "Razorpay key missing",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const authToken = tokenService.getAccessToken();
      authTokenRef.current = authToken;

      if (!authToken) {
        toast({
          title: "Login Required",
          description: "Please log in",
          variant: "destructive",
        });
        setIsLoading(false);
        navigate("/login");
        return;
      }

      if (!items || items.length === 0) {
        toast({
          title: "Cart Empty",
          description: "Please add items before checkout",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!isCheckoutAllowed()) {
        toast({
          title: "Packaging Required",
          description: "Select packaging for all items",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!amount || amount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Order amount must be greater than 0",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!isFormValid) {
        toast({
          title: "Form Incomplete",
          description: "Fill in required info",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!customerInfo.addressId) {
        toast({
          title: "Address Required",
          description: "Please select or save a delivery address",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      for (const item of items) {
        if (!item.productId || !item.quantity) {
          toast({
            title: "Invalid Product",
            description: "Missing required product information",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (item.quantity <= 0) {
          toast({
            title: "Invalid Quantity",
            description: "Quantity must be greater than 0",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (!item.productWeight && !item.weight) {
          toast({
            title: "Invalid Weight",
            description: "Weight selection is required for each product",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      // Amount is already in paise from the Checkout component
      const amountInPaise = amount; // amount is already in paise

      const orderRequest = {
        paymentOrders: {
          addressid: customerInfo.addressId,
          total_amount_paid: amountInPaise, // Send amount in paise
          discounted_amount:
            customerInfo.promoDiscount && customerInfo.promoDiscount > 0
              ? Math.round(customerInfo.promoDiscount * 100)
              : 0,
          promo_code: customerInfo.promoCode || null // Include promo code if applied
        },
        orderedProducts: items
          .filter((item) => item.productId && item.quantity > 0)
          .map((item) => {
            // Try all possible sources for name and price
            const productName =
              item.productName ||
              item.name ||
              item.title ||
              item.productTitle ||
              item.productDescription ||
              "Unknown Product";

            // Use weighted price if available, else fallback to productPrice or price
            const weightedPrice =
              (item.weightBasedPrice && item.weightBasedPrice[item.weight]) ||
              item.productPrice ||
              item.price ||
              0;

            return {
              product_id: Number(item.productId),
              productName,
              productPrice: String(Math.round(Number(weightedPrice) * 100)), // String in paise
              quantity: Number(item.quantity),
              weight: item.weight || item.productWeight || "250",
            };
          }),
        dto: {
          containerCharges: Math.round(10 * 100), // 10 rupees to paise
          shippingCharges: Math.round(50 * 100), // 50 rupees to paise
          gstPercentage: 9 // 9% GST
        }
      };

      // Debug: log the raw items, customer info and the fully serialized order payload
      try {
        console.groupCollapsed && console.groupCollapsed('create-order payload');
        console.log('cart items (raw):', items);
        console.log('customerInfo:', customerInfo);
        const mappedProducts = orderRequest.orderedProducts;
        console.log('mapped orderedProducts (raw):', mappedProducts);
        // Print fully serialized payload to make it easy to copy/inspect
        try {
          console.log('orderRequest payload (JSON):', JSON.stringify(orderRequest, null, 2));
        } catch (jsonErr) {
          // fallback to object log if stringify fails
          console.log('orderRequest payload (object):', orderRequest);
        }
        // Also print plainly and in table form for immediate visibility
        console.log('ORDER_REQUEST_RAW:', orderRequest);
        if (Array.isArray(mappedProducts)) {
          console.log('ORDER_PRODUCTS_TABLE:');
          try { console.table(mappedProducts); } catch (_) { console.log(mappedProducts); }
        }
        console.groupEnd && console.groupEnd();
      } catch (e) {
        console.error('Error logging order payload', e);
      }

      let response;
      try {
        response = await axios.post(
          `${import.meta.env.VITE_API_URL}/create-order`,
          orderRequest,
          {
            headers: { Authorization: authToken },
          }
        );
      } catch (err) {
        console.error("create-order error:", err);
        const errorMessage = err.response?.data?.message || err.message;
        toast({
          title: "Order Error",
          description: errorMessage || "Server error while creating order",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const data = response.data;
      if (data.message !== "Order created successfully") {
        toast({
          title: "Order Error",
          description: data.message || "Could not create order",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      razorpayOrderIdRef.current = data.razorpayOrderId;

      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        toast({
          title: "Payment Error",
          description: "Razorpay SDK failed to load",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const options = {
  key: razorpayKey,
  amount: amountInPaise, // Always use paise
  currency: "INR",
  name: "Homely Taste Pickles",
        description: "Order Payment",
        order_id: data.razorpayOrderId,
        handler: async function (response) {
          try {
            // Clear cart items from both server and local state
            await cartService.clearAllCartItems();
            clearCartSilent();
            
            navigate("/profile", {
              state: {
                activeTab: "orders",
                paymentSuccess: true,
                orderId: response.razorpay_order_id,
              },
            });
          } catch (error) {
            console.error("Error clearing cart after payment:", error);
            // Still navigate to profile even if cart clear fails
            navigate("/profile", {
              state: {
                activeTab: "orders",
                paymentSuccess: true,
                orderId: response.razorpay_order_id,
              },
            });
          }
        },
        prefill: {
          name: `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`,
          email: customerInfo?.email || "",
          contact: customerInfo?.phone || "",
        },
        theme: { color: "#3399cc" },
        modal: {
          ondismiss: async function () {
            const orderId = razorpayOrderIdRef.current;
            try {
              await callMarkFailed(orderId, authTokenRef.current);
              toast({
                title: "Payment Cancelled",
                description: "You closed the payment window",
                variant: "destructive",
              });
            } finally {
              setIsLoading(false);
            }
          },
        },
      };

      const rzp = new window.Razorpay(options);

      if (rzp && typeof rzp.on === "function") {
        rzp.on("payment.failed", async function () {
          const orderId = razorpayOrderIdRef.current;
          try {
            await callMarkFailed(orderId, authTokenRef.current);
          } finally {
            setIsLoading(false);
            toast({
              title: "Payment Failed",
              description: "Payment failed. Please try again.",
              variant: "destructive",
            });
          }
        });
      }

      rzp.open();
    } catch (error) {
      toast({
        title: "Payment Error",
        description: error.response?.data?.message || error.message || "Unexpected error",
        variant: "destructive",
      });
      console.error("Payment Error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handlePayment}
        disabled={isLoading || !isCheckoutAllowed() || !isFormValid}
        className="w-full bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Loading...
          </span>
        ) : (
          "Pay Now"
        )}
      </Button>

      {!isCheckoutAllowed() && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Select packaging type for all items before checkout</AlertDescription>
        </Alert>
      )}

      {!isFormValid && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Fill in all required personal and shipping information correctly</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PaymentButton;
