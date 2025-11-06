// src/lib/shipping.js

export const FREE_SHIPPING_THRESHOLD = 500;
export const DEFAULT_SHIPPING_CHARGE = 50;

export const calculateShippingCharge = (cartTotal, containerCharges = 0) => {
  // Calculate total without container charges
  const totalWithoutContainer = cartTotal - containerCharges;
  
  // If total (excluding container charges) is >= FREE_SHIPPING_THRESHOLD, shipping is free
  if (totalWithoutContainer >= FREE_SHIPPING_THRESHOLD) {
    return 0;
  }
  
  // Otherwise, return default shipping charge
  return DEFAULT_SHIPPING_CHARGE;
};

export const getShippingMessage = (cartTotal, containerCharges = 0) => {
  const totalWithoutContainer = cartTotal - containerCharges;
  
  if (totalWithoutContainer >= FREE_SHIPPING_THRESHOLD) {
    return "Your order qualifies for FREE delivery!";
  }
  
  const remaining = FREE_SHIPPING_THRESHOLD - totalWithoutContainer;
  return `Add ₹${remaining.toFixed(2)} more to your cart for FREE delivery!`;
};