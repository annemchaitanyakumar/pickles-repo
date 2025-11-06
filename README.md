# Homely Taste Pickles (HTP) - E-commerce Platform Documentation

Welcome to the comprehensive documentation of the Homely Taste Pickles (HTP) e-commerce platform. This document provides detailed information about every feature, functionality, and technical aspect of the platform.

## Table of Contents
- [Overview](#overview)
- [Features & Functionality](#features--functionality)
  - [1. Authentication System](#1-authentication-system)
  - [2. Product Browsing & Search](#2-product-browsing--search)
  - [3. Product Details](#3-product-details)
  - [4. Shopping Cart](#4-shopping-cart)
  - [5. Checkout Process](#5-checkout-process)
  - [6. User Profile Management](#6-user-profile-management)
  - [7. Order Management](#7-order-management)
- [Technical Implementation](#technical-implementation)
- [Installation & Setup](#installation--setup)
- [Payment Integration](#payment-integration)

## Overview

Homely Taste Pickles (HTP) is a modern e-commerce platform specializing in authentic Indian pickles. The platform offers a seamless shopping experience from product discovery to checkout, with robust user authentication and secure payment processing.

## Features & Functionality

### 1. Authentication System

The authentication system provides secure user access management with multiple layers of security and user-friendly features.

#### Sign Up (`/signup`)
**Implementation Details:**
- Component: `SignUp.jsx`
- Service: `authService.js`
- State Management: Context API (`AuthContext.jsx`)

**Features & Validation:**
```javascript
// Example validation rules
const validations = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
  mobile: /^[6-9]\d{9}$/
}
```

**Process Flow:**
1. User fills registration form with:
   - First Name & Last Name
   - Email Address (unique)
   - Mobile Number (Indian format)
   - Password (with strength indicators)
   - Optional: Referral code

2. Real-time Validation:
   - Email format and uniqueness check
   - Password strength requirements:
     - Minimum 8 characters
     - At least one uppercase letter
     - At least one number
     - At least one special character
   - Mobile number format (10 digits, starts with 6-9)

3. Submission & Response:
   - Data encryption (HTTPS)
   - JWT token generation
   - Automatic login redirect
   - Welcome email trigger

#### Login (`/login`)
**Implementation Details:**
- Component: `Login.jsx`
- Service: `authService.js`, `tokenService.js`
- State: Global auth state management

**Authentication Flow:**
1. Credential Validation:
   ```javascript
   // Example authentication flow
   const login = async (credentials) => {
     try {
       const response = await authService.login(credentials);
       tokenService.setTokens(response.tokens);
       initializeUserSession(response.user);
     } catch (error) {
       handleAuthError(error);
     }
   };
   ```

2. Session Management:
   - JWT token storage (HTTP-only cookies)
   - Token refresh mechanism (15-minute intervals)
   - Remember me functionality (30-day persistence)
   - Multiple device session handling

3. Security Features:
   - Rate limiting (5 attempts per 15 minutes)
   - IP-based blocking
   - CSRF token implementation
   - Secure cookie attributes

#### Password Recovery (`/forgot-password`)
**Implementation Details:**
- Components: `ForgotPasswordDialog.jsx`, `ResetPassword.jsx`
- Services: `authService.js`, `emailService.js`

**Recovery Process:**
1. Initiation:
   - Email submission
   - Mobile number verification (OTP)
   - Security question validation (if set)

2. Reset Flow:
   ```javascript
   // Example reset flow
   const resetPassword = async (email) => {
     const token = generateSecureToken();
     await emailService.sendResetLink(email, token);
     storeResetRequest(email, token, expiryTime);
   };
   ```

3. Security Measures:
   - Time-limited reset tokens (15 minutes)
   - One-time use links
   - Email confirmation
   - Activity logging
   - IP tracking

**Error Handling:**
- Invalid credential responses
- Account lockout notifications
- Reset token expiration handling
- Rate limit warnings

### 2. Product Browsing & Search

The product browsing and search system provides an intuitive and efficient way for users to discover and explore products.

#### Product Listing (`/products`)
**Implementation Details:**
- Component: `Products.jsx`
- Services: `productService.js`, `searchStore.js`
- UI Components: `ProductCard.jsx`, `ProductSkeleton.jsx`

**Display System:**
1. Grid Layout:
   ```jsx
   // Example grid implementation
   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
     {products.map(product => (
       <ProductCard key={product.id} product={product} />
     ))}
   </div>
   ```

2. Filtering System:
   - Category filters (with count)
   - Price range selection
   - Rating filters
   - Availability filters
   - Package type filters

3. Sort Options:
   ```javascript
   const sortOptions = {
     'price-asc': { field: 'price', order: 'asc' },
     'price-desc': { field: 'price', order: 'desc' },
     'popularity': { field: 'salesCount', order: 'desc' },
     'rating': { field: 'averageRating', order: 'desc' },
     'newest': { field: 'createdAt', order: 'desc' }
   };
   ```

4. Pagination:
   - Infinite scroll implementation
   - Dynamic loading (20 items per load)
   - Loading skeletons
   - Scroll position memory

#### Search System (`/search`)
**Implementation Details:**
- Component: `SearchBar.jsx`, `SearchResults.jsx`
- Store: `searchStore.js`
- Service: `searchService.js`

**Search Features:**
1. Real-time Search:
   ```javascript
   // Example debounced search
   const debouncedSearch = debounce(async (query) => {
     const results = await searchService.search(query);
     updateSearchResults(results);
   }, 300);
   ```

2. Search Algorithms:
   - Fuzzy matching
   - Keyword relevance scoring
   - Category matching
   - Tag-based search
   - Phonetic matching for Indian terms

3. Search History Management:
   ```javascript
   // Example history management
   const searchHistory = {
     add: (query) => {
       const history = getHistory();
       history.unshift(query);
       localStorage.setItem('searchHistory', JSON.stringify(history.slice(0, 10)));
     },
     get: () => JSON.parse(localStorage.getItem('searchHistory') || '[]')
   };
   ```

4. Advanced Features:
   - Auto-complete suggestions
   - Popular searches tracking
   - Recent searches (user-specific)
   - Search analytics
   - Voice search capability

**Performance Optimizations:**
1. Search Indexing:
   - Product name indexing
   - Category indexing
   - Description keyword extraction
   - Tag indexing

2. Caching:
   - Recent search results
   - Popular products cache
   - Category results cache
   - Filter combinations cache

**User Experience:**
1. Visual Feedback:
   - Loading states
   - No results handling
   - Error states
   - Suggestion prompts

2. Accessibility:
   - Keyboard navigation
   - Screen reader support
   - ARIA labels
   - Focus management

### 3. Product Details

The product details system provides comprehensive information about each product with interactive features for enhanced user experience.

#### Product Information Page (`/product/:id`)
**Implementation Details:**
- Component: `ProductDetail.jsx`
- Services: `productService.js`, `reviewService.js`
- UI Components: `Product3D.jsx`, `ProductCarousel.jsx`

**Content Structure:**
1. Product Media:
   ```jsx
   // Example media carousel structure
   <ProductCarousel
     images={product.images}
     threeDModel={product.modelUrl}
     zoomEnabled={true}
     aspectRatio="square"
   />
   ```

2. Product Information Display:
   ```typescript
   interface ProductDetails {
     id: string;
     name: string;
     description: string;
     price: {
       base: number;
       discounted?: number;
       bulk?: Array<{quantity: number, price: number}>
     };
     variants: Array<{
       id: string;
       size: string;
       price: number;
       containerType: string;
       inStock: boolean
     }>;
     nutritionalInfo: {
       servingSize: string;
       calories: number;
       ingredients: string[];
       allergens?: string[];
     };
   }
   ```

3. Dynamic Pricing System:
   - Base price display
   - Bulk pricing calculations
   - Container charge inclusion
   - Discount applications
   - Tax calculations

#### Interactive Features

1. Image Interaction:
   ```javascript
   // Example zoom functionality
   const handleZoom = (event) => {
     const { left, top, width, height } = image.getBoundingClientRect();
     const x = (event.clientX - left) / width;
     const y = (event.clientY - top) / height;
     updateZoomPosition(x, y);
   };
   ```

2. 3D Product View:
   - Three.js integration
   - Model loading optimization
   - Interactive rotation
   - Mobile gesture support
   - Fallback 2D view

3. Review System:
   ```typescript
   interface Review {
     id: string;
     userId: string;
     rating: number;
     comment: string;
     images?: string[];
     verified: boolean;
     createdAt: Date;
     helpful: number;
   }
   ```

4. Review Management:
   - Star rating input
   - Comment submission
   - Image upload
   - Verification badges
   - Helpful votes
   - Report functionality

5. Social Sharing:
   ```javascript
   const shareOptions = {
     whatsapp: `whatsapp://send?text=${encodedProductUrl}`,
     facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedProductUrl}`,
     twitter: `https://twitter.com/intent/tweet?url=${encodedProductUrl}`,
     email: `mailto:?subject=${encodedSubject}&body=${encodedBody}`
   };
   ```

**User Experience Features:**

1. Stock Management:
   - Real-time stock status
   - Low stock warnings
   - Back in stock notifications
   - Quantity selector limits

2. Related Products:
   ```javascript
   const getRelatedProducts = async (productId) => {
     const related = await productService.getRelated(productId, {
       category: true,
       similar: true,
       purchased: true,
       limit: 4
     });
     return related;
   };
   ```

3. Analytics Integration:
   - View tracking
   - Click heatmaps
   - Conversion tracking
   - A/B testing support

4. Performance Optimization:
   - Image lazy loading
   - Progressive image loading
   - Content preloading
   - Cache management
   - Modal preloading

### 4. Shopping Cart

The shopping cart system provides a robust and user-friendly interface for managing product selections and preparing for checkout.

#### Cart Management (`/cart`)
**Implementation Details:**
- Component: `Cart.jsx`
- Store: `cartStore.js`
- Service: `cartService.js`

**Core Functionality:**
1. Cart State Management:
   ```javascript
   // Example cart store implementation using Zustand
   const useCartStore = create((set, get) => ({
     items: [],
     addItem: async (product, quantity, variant) => {
       const item = createCartItem(product, quantity, variant);
       await cartService.addToCart(item);
       set(state => ({
         items: [...state.items, item]
       }));
     },
     updateQuantity: async (itemId, quantity) => {
       await cartService.updateQuantity(itemId, quantity);
       set(state => ({
         items: state.items.map(item =>
           item.id === itemId 
           ? { ...item, quantity }
           : item
         )
       }));
     },
     removeItem: async (itemId) => {
       await cartService.removeFromCart(itemId);
       set(state => ({
         items: state.items.filter(item => item.id !== itemId)
       }));
     },
     clearCart: async () => {
       await cartService.clearCart();
       set({ items: [] });
     }
   }));
   ```

2. Price Calculations:
   ```javascript
   const calculateTotals = (items) => {
     const subtotal = items.reduce((sum, item) => {
       const itemPrice = item.price * item.quantity;
       const containerCharge = item.containerFee || 0;
       return sum + itemPrice + containerCharge;
     }, 0);

     const tax = subtotal * (TAX_RATE / 100);
     const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
     
     return {
       subtotal,
       tax,
       shipping,
       total: subtotal + tax + shipping
     };
   };
   ```

3. Persistence Layer:
   ```javascript
   // Cart persistence handling
   const persistCart = {
     save: (items) => {
       localStorage.setItem('cart', JSON.stringify(items));
       syncWithServer(items);
     },
     load: async () => {
       const localCart = JSON.parse(localStorage.getItem('cart') || '[]');
       const serverCart = await cartService.getCart();
       return mergeCartItems(localCart, serverCart);
     }
   };
   ```

#### Advanced Features

1. Stock Management:
   ```javascript
   const validateStock = async (items) => {
     const stockCheck = await Promise.all(
       items.map(item => 
         productService.checkStock(item.productId, item.variant)
       )
     );
     
     return stockCheck.every(check => check.available);
   };
   ```

2. Save for Later:
   ```typescript
   interface SavedItem {
     productId: string;
     variant?: string;
     addedAt: Date;
     expiresAt: Date;
     price: number;
   }
   ```

3. Weight Calculation:
   ```javascript
   const calculateTotalWeight = (items) => {
     return items.reduce((total, item) => {
       const itemWeight = item.weight * item.quantity;
       return total + itemWeight;
     }, 0);
   };
   ```

**User Experience Features:**

1. Real-time Updates:
   - Price recalculation
   - Stock validation
   - Shipping fee updates
   - Tax calculation
   - Total weight updates

2. Error Handling:
   ```javascript
   const handleCartError = (error) => {
     switch (error.code) {
       case 'STOCK_UNAVAILABLE':
         notifyStockIssue(error.productId);
         break;
       case 'INVALID_QUANTITY':
         correctQuantity(error.productId, error.maxQuantity);
         break;
       case 'PRICE_CHANGED':
         updatePrice(error.productId, error.newPrice);
         break;
     }
   };
   ```

3. Performance Optimizations:
   - Debounced updates
   - Batch processing
   - Local state management
   - Cache invalidation
   - Background syncing

4. Mobile Optimization:
   - Touch-friendly controls
   - Responsive layout
   - Gesture support
   - Offline capabilities

### 5. Checkout Process

The checkout system provides a streamlined and secure process for order completion, from address selection to payment processing.

#### Checkout Flow (`/checkout`)
**Implementation Details:**
- Component: `Checkout.jsx`
- Services: `addressService.js`, `orderService.js`
- Payment: `PaymentButton.jsx`

**Architecture Overview:**
```typescript
interface CheckoutState {
  step: 'address' | 'payment' | 'confirmation';
  orderData: OrderData;
  addressData: AddressData;
  paymentData: PaymentData;
  validationErrors: ValidationErrors;
}

interface OrderData {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  containerCharges: number;
  total: number;
  appliedDiscounts: Discount[];
}
```

#### 1. Address Management System

**Implementation:**
1. Address Form:
   ```javascript
   const validateAddress = (address) => {
     const validations = {
       firstName: (v) => v.length >= 2 || 'First name is required',
       lastName: (v) => !v || v.length >= 2 || 'Invalid last name',
       email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || 'Invalid email',
       phone: (v) => /^[6-9]\d{9}$/.test(v) || 'Invalid phone number',
       address: (v) => v.length >= 10 || 'Please enter detailed address',
       pincode: (v) => /^\d{6}$/.test(v) || 'Invalid PIN code',
       city: (v) => v.length > 0 || 'City is required',
       state: (v) => v.length > 0 || 'State is required'
     };

     return Object.entries(validations).reduce(
       (errors, [field, validator]) => ({
         ...errors,
         [field]: validator(address[field])
       }),
       {}
     );
   };
   ```

2. PIN Code Verification:
   ```javascript
   const verifyPincode = async (pincode) => {
     try {
       const response = await fetch(
         `https://api.postalpincode.in/pincode/${pincode}`
       );
       const data = await response.json();
       
       if (data[0].Status === "Success") {
         const location = data[0].PostOffice[0];
         return {
           city: location.District,
           state: location.State,
           valid: true
         };
       }
       return { valid: false };
     } catch (error) {
       console.error('PIN verification failed:', error);
       return { valid: false };
     }
   };
   ```

3. Address Storage:
   ```typescript
   interface SavedAddress {
     id: number;
     type: 'home' | 'work' | 'other';
     isDefault: boolean;
     firstName: string;
     lastName: string;
     email: string;
     phone: string;
     address: string;
     city: string;
     state: string;
     pincode: string;
     landmark?: string;
   }
   ```

#### 2. Payment Integration

**RazorPay Implementation:**
```javascript
const initializePayment = async (orderData) => {
  const options = {
    key: process.env.RAZORPAY_KEY_ID,
    amount: orderData.total * 100, // amount in paisa
    currency: "INR",
    name: "Homely Taste Pickles",
    description: `Order #${orderData.orderId}`,
    order_id: orderData.razorpayOrderId,
    handler: response => handlePaymentSuccess(response),
    prefill: {
      name: `${orderData.firstName} ${orderData.lastName}`,
      email: orderData.email,
      contact: orderData.phone
    },
    notes: {
      address: orderData.shippingAddress
    },
    theme: {
      color: "#E11D48"
    }
  };

  const razorpay = new Razorpay(options);
  razorpay.open();
};
```

**Payment Methods:**
1. RazorPay Options:
   - Credit/Debit Cards
   - UPI
   - Netbanking
   - Wallets
   - EMI options

2. Cash on Delivery:
   ```javascript
   const handleCOD = async (orderData) => {
     try {
       const order = await orderService.createCODOrder({
         ...orderData,
         paymentMethod: 'COD',
         codCharges: calculateCODCharges(orderData.total)
       });
       
       return {
         success: true,
         orderId: order.id
       };
     } catch (error) {
       handleOrderError(error);
       return { success: false };
     }
   };
   ```

#### 3. Order Processing

**Order Creation Flow:**
```javascript
const processOrder = async (checkoutData) => {
  try {
    // 1. Validate final order
    const validationResult = await validateOrder(checkoutData);
    if (!validationResult.valid) throw new Error(validationResult.error);

    // 2. Create order in database
    const order = await orderService.create({
      userId: checkoutData.userId,
      items: checkoutData.items,
      address: checkoutData.address,
      payment: checkoutData.payment,
      totals: calculateOrderTotals(checkoutData)
    });

    // 3. Process payment
    const paymentResult = await processPayment(order);
    if (paymentResult.success) {
      await orderService.confirmOrder(order.id);
      clearCart();
      return { success: true, orderId: order.id };
    }

    // 4. Handle payment failure
    await orderService.failOrder(order.id);
    throw new Error('Payment failed');

  } catch (error) {
    handleOrderError(error);
    return { success: false, error };
  }
};
```

**Security Measures:**
1. Data Encryption
2. Payment Gateway Security
3. Form Data Validation
4. CSRF Protection
5. Rate Limiting

**User Experience:**
1. Progress Tracking
2. Error Handling
3. Loading States
4. Success/Failure Animations
5. Email Confirmations

### 6. User Profile Management

The user profile management system provides comprehensive control over user information, preferences, and settings.

#### Profile Management (`/profile`)
**Implementation Details:**
- Component: `Profile.jsx`, `UserProfile.jsx`
- Services: `userService.js`, `profileService.js`
- Context: `AuthContext.jsx`

**Core Architecture:**
```typescript
interface UserProfile {
  id: string;
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    avatar?: string;
    dateOfBirth?: Date;
  };
  preferences: {
    notifications: NotificationPreferences;
    marketing: MarketingPreferences;
    language: string;
    currency: string;
  };
  security: {
    lastPasswordChange: Date;
    twoFactorEnabled: boolean;
    activeSessions: Session[];
  };
}

interface NotificationPreferences {
  email: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
    productAlerts: boolean;
  };
  sms: {
    orderUpdates: boolean;
    promotions: boolean;
    authentication: boolean;
  };
}
```

#### 1. Profile Information Management

**Personal Info Updates:**
```javascript
const updateProfile = async (data) => {
  try {
    // Validate input
    const validationResult = validateProfileData(data);
    if (!validationResult.valid) {
      throw new Error(validationResult.errors.join(', '));
    }

    // Process avatar if changed
    let avatarUrl = data.avatar;
    if (data.newAvatar) {
      avatarUrl = await uploadProfileImage(data.newAvatar);
    }

    // Update profile
    const updatedProfile = await userService.updateProfile({
      ...data,
      avatar: avatarUrl
    });

    // Update local state
    updateUserContext(updatedProfile);
    
    return {
      success: true,
      profile: updatedProfile
    };
  } catch (error) {
    handleProfileError(error);
    return {
      success: false,
      error: error.message
    };
  }
};
```

**Security Management:**
```javascript
const securityOperations = {
  changePassword: async (currentPassword, newPassword) => {
    const validPassword = validatePasswordStrength(newPassword);
    if (!validPassword.valid) {
      throw new Error(validPassword.error);
    }
    
    await authService.changePassword(currentPassword, newPassword);
    await logoutOtherSessions();
  },

  enableTwoFactor: async () => {
    const secret = await authService.setupTwoFactor();
    return {
      qrCode: generateQRCode(secret),
      backupCodes: generateBackupCodes()
    };
  },

  manageSessions: async () => {
    const sessions = await authService.getActiveSessions();
    return sessions.map(session => ({
      ...session,
      current: isCurrentSession(session.id)
    }));
  }
};
```

#### 2. Preferences Management

**Implementation:**
```javascript
const preferenceManager = {
  notifications: {
    update: async (preferences) => {
      await userService.updateNotificationPreferences(preferences);
      updateLocalPreferences(preferences);
    },
    
    getChannels: () => ({
      email: ['orders', 'promotions', 'newsletter', 'alerts'],
      sms: ['orders', 'promotions', 'authentication'],
      push: ['orders', 'chat', 'alerts']
    })
  },

  marketing: {
    updateConsent: async (consent) => {
      await userService.updateMarketingPreferences(consent);
      trackConsentUpdate(consent);
    }
  },

  display: {
    setLanguage: async (lang) => {
      await userService.updateLanguage(lang);
      loadTranslations(lang);
    },
    
    setCurrency: async (currency) => {
      await userService.updateCurrency(currency);
      updatePriceDisplay(currency);
    }
  }
};
```

#### 3. Address Book Management

**Implementation:**
```typescript
interface AddressBook {
  addresses: Address[];
  defaultAddressId?: string;

  add: (address: NewAddress) => Promise<Address>;
  update: (id: string, address: AddressUpdate) => Promise<Address>;
  remove: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
}

const addressManager = {
  validateAddress: (address: Address): ValidationResult => {
    // Address validation logic
  },

  formatAddress: (address: Address): string => {
    // Address formatting for display
  },

  geocode: async (address: Address): Promise<GeoLocation> => {
    // Geocoding logic for delivery optimization
  }
};
```

**Features:**
1. Profile Updates:
   - Real-time validation
   - Image cropping
   - Field masking
   - Auto-save

2. Security:
   - Password strength enforcement
   - Session management
   - Activity logging
   - Security notifications

3. Preferences:
   - Notification controls
   - Language selection
   - Currency preferences
   - Privacy settings

4. Address Book:
   - Multiple addresses
   - Default selection
   - Quick edit
   - Address verification

### 7. Order Management

The order management system provides comprehensive tracking and management of customer orders from placement to delivery.

#### Order System (`/orders`)
**Implementation Details:**
- Components: `OrdersList.jsx`, `OrderDetail.jsx`
- Services: `orderService.js`
- State Management: Custom hooks and context

**Core Architecture:**
```typescript
interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  payment: PaymentDetails;
  shipping: ShippingDetails;
  timeline: OrderEvent[];
  totals: OrderTotals;
  metadata: OrderMetadata;
}

type OrderStatus =
  | 'pending_payment'
  | 'processing'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'returned';

interface OrderItem {
  productId: string;
  variantId?: string;
  quantity: number;
  price: number;
  containerFee: number;
  weight: number;
  status: 'processing' | 'shipped' | 'delivered' | 'returned';
}
```

#### 1. Order Tracking System

**Implementation:**
```javascript
const orderTracker = {
  getOrderStatus: async (orderId) => {
    const order = await orderService.getOrder(orderId);
    return {
      status: order.status,
      timeline: order.timeline,
      expectedDelivery: calculateExpectedDelivery(order),
      currentLocation: order.shipping?.currentLocation
    };
  },

  trackDelivery: async (orderId) => {
    const tracking = await orderService.getTracking(orderId);
    return {
      carrier: tracking.carrier,
      trackingNumber: tracking.number,
      checkpoints: tracking.checkpoints,
      estimatedDelivery: tracking.eta
    };
  },

  subscribePushNotifications: (orderId) => {
    return orderService.subscribeToUpdates(orderId, {
      status: true,
      location: true,
      delivery: true
    });
  }
};
```

#### 2. Order Management Features

**Status Updates:**
```javascript
const orderStatusManager = {
  update: async (orderId, newStatus, reason) => {
    // Validate status transition
    if (!isValidStatusTransition(currentStatus, newStatus)) {
      throw new Error('Invalid status transition');
    }

    // Update order status
    await orderService.updateStatus(orderId, {
      status: newStatus,
      reason: reason,
      timestamp: new Date(),
      updatedBy: getCurrentUser().id
    });

    // Trigger notifications
    await notifyStatusChange(orderId, newStatus);
  },

  cancel: async (orderId, reason) => {
    const order = await orderService.getOrder(orderId);
    
    // Check cancellation eligibility
    if (!canCancelOrder(order)) {
      throw new Error('Order cannot be cancelled');
    }

    // Process cancellation
    await orderService.cancelOrder(orderId, {
      reason: reason,
      refundAmount: calculateRefundAmount(order),
      cancelledBy: getCurrentUser().id
    });

    // Handle inventory
    await updateInventory(order.items, 'cancel');
    
    // Notify customer
    await sendCancellationEmail(order);
  }
};
```

#### 3. Documentation and Invoicing

**Implementation:**
```javascript
const orderDocuments = {
  generateInvoice: async (orderId) => {
    const order = await orderService.getOrder(orderId);
    const template = await loadInvoiceTemplate();
    
    const invoice = {
      orderId: order.id,
      date: order.createdAt,
      billing: order.billing,
      items: order.items,
      totals: calculateInvoiceTotals(order),
      taxes: calculateTaxBreakdown(order)
    };

    return await generatePDF(template, invoice);
  },

  downloadDocuments: async (orderId) => {
    return {
      invoice: await orderService.getInvoice(orderId),
      packingSlip: await orderService.getPackingSlip(orderId),
      warranty: await orderService.getWarrantyCard(orderId)
    };
  }
};
```

#### 4. Returns and Refunds

**Processing System:**
```typescript
interface ReturnRequest {
  orderId: string;
  items: {
    itemId: string;
    quantity: number;
    reason: ReturnReason;
    condition: ItemCondition;
    images?: string[];
  }[];
  pickupAddress: Address;
  refundMethod: 'original' | 'wallet' | 'bank';
}

const returnsManager = {
  initiateReturn: async (returnRequest: ReturnRequest) => {
    // Validate return eligibility
    const eligibility = await checkReturnEligibility(returnRequest);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason);
    }

    // Create return request
    const return = await orderService.createReturn(returnRequest);

    // Schedule pickup
    const pickup = await scheduleReturnPickup(return.id);

    // Initialize refund process
    const refund = await initializeRefund(return);

    return {
      returnId: return.id,
      pickup: pickup,
      refund: refund
    };
  }
};
```

**Features:**
1. Order Tracking:
   - Real-time status updates
   - Location tracking
   - Delivery estimates
   - Push notifications

2. Management:
   - Order history
   - Status updates
   - Cancellation handling
   - Return processing

3. Documentation:
   - Invoice generation
   - Digital receipts
   - Warranty information
   - Return labels

4. Refunds:
   - Multiple refund methods
   - Partial refunds
   - Refund tracking
   - Automatic processing

## Technical Implementation

### Frontend Stack
- React with Vite
- Tailwind CSS for styling
- shadcn/ui components
- Framer Motion for animations
- Axios for API requests
- JWT token management
- Local storage utilization
- Responsive design
- Progressive Web App (PWA)

### Key Features
- Token-based authentication
- Real-time form validation
- Secure payment processing
- Responsive UI/UX
- Error handling
- Loading states
- Toast notifications
- Protected routes
- Data persistence
- Mobile optimization

## Installation & Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/homely-taste-pickles.git
```

2. Install dependencies:
```bash
cd homely-taste-pickles
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

## Payment Integration

### RazorPay Setup
1. Test mode configuration
2. API key integration
3. Webhook setup
4. Payment verification
5. Success/failure handling
6. Order ID generation
7. Payment receipt generation

### Security Measures
- SSL/TLS encryption
- PCI DSS compliance
- Data sanitization
- XSS protection
- CSRF protection
- Rate limiting
- Input validation

2.  **Navigate to the Project Directory:**

    ```sh
    cd <YOUR_PROJECT_NAME>
    ```

3.  **Install Frontend Dependencies:**

    ```sh
    cd src
    npm install
    ```

4.  **Start the Frontend Development Server:**

    ```sh
    npm run dev
    ```

    This will launch the frontend application with hot-reloading, allowing you to see changes in real-time.

5.  **Start the Backend Server:**

    *   Navigate to the backend project directory.
    *   Run the Spring Boot application (e.g., using your IDE or Maven).

**Direct Editing on GitHub**

For quick edits:

1.  Navigate to the file you want to modify.
2.  Click the "Edit" button (pencil icon).
3.  Make your changes and commit.

**GitHub Codespaces**

For a cloud-based development environment:

1.  Go to the main page of the repository.
2.  Click the "Code" button.
3.  Select the "Codespaces" tab.
4.  Create a new Codespace and start editing.

## Key Components

*   **Authentication:**
    *   `src/context/AuthContext.jsx`: Manages user authentication state and provides login, logout, and session management.
    *   `src/services/authService.js`: Handles API calls for authentication-related tasks (login, registration, logout).
    *   `src/services/tokenService.js`: Manages JWT tokens, including storage, retrieval, and validation.
*   **User Profile:**
    *   `src/pages/Profile.jsx`: Displays and manages user profile information.
    *   `src/services/userService.js`: Handles API calls for fetching and updating user profile data.
*   **UI Components:**
    *   `src/components/ui`: Contains reusable UI components built with shadcn/ui and Tailwind CSS.
*   **Routing:**
    *   `src/App.jsx`: Main application component that sets up routing and context providers.
    *   `src/routes.jsx`: Defines the application's routes and handles navigation.

## Contributing

We welcome contributions to Homely-Taste-Pickles! Please follow these guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with clear, concise messages.
4.  Submit a pull request.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

Note: this project includes third-party dependencies and code which are governed by their own licenses. When using or redistributing this project, you must comply with the licenses of those third-party components. For a list of dependency licenses, please review the dependency metadata or generate a third-party license report.
