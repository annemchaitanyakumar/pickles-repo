import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, CreditCard, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/hooks/use-toast';
import { Link } from "react-router-dom";
import { OrderFor } from '@/components/OrderFor';
import { useAuth } from '@/context/AuthContext';
import { userService } from '@/services/userService';
import { addressService } from '@/services/addressService';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import axios from 'axios';
import { tokenService } from '@/services/tokenService';
import PaymentButton from './PaymentButton';
import { PromoCodeInput } from '@/components/PromoCodeInput';
import { PromoCodeBanner } from '@/components/PromoCodeBanner';

export default function Checkout() {
  const cartStore = useCartStore();
  
  useEffect(() => {
    const fetchTaxInfo = async () => {
      try {
        await cartStore.fetchTaxInfo();
      } catch (error) {
        console.error('Failed to fetch tax info:', error);
      }
    };
    fetchTaxInfo();
  }, []);

  // Now getTotal() will work with the fetched tax info
  const totals = cartStore.getTotal();
  
  const { items, clearCart, calculateSubtotal } = cartStore;

  const [currentSubtotal, setCurrentSubtotal] = useState(() => calculateSubtotal());
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [currentTotal, setCurrentTotal] = useState(() => cartStore.getTotal());

  const { toast } = useToast();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const { user } = useAuth();
  const [orderFor, setOrderFor] = useState('myself');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    paymentMethod: 'razorpay'
  });

  const [localTaxInfo, setLocalTaxInfo] = useState(null);
  const [isTaxInfoLoading, setIsTaxInfoLoading] = useState(true);

  // Fetch tax info
  useEffect(() => {
    const fetchTaxInfo = async () => {
      try {
        setIsTaxInfoLoading(true);
        const authToken = tokenService.getAccessToken();
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/get-tax-info`, {
          headers: { Authorization: authToken }
        });
        setLocalTaxInfo(response.data);
      } catch (error) {
        console.error('Failed to fetch tax info:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tax information. Using default values.',
          variant: 'destructive',
        });
        setLocalTaxInfo(null);
      } finally {
        setIsTaxInfoLoading(false);
      }
    };
    fetchTaxInfo();
  }, [toast]);

  // Fetch addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      if (user) {
        try {
          const addresses = await addressService.getAllAddresses();
          setSavedAddresses(addresses);
          if (addresses.length > 0 && !useNewAddress) {
            setSelectedAddressId(addresses[0].addressId);
            const a = addresses[0];
            setFormData(prev => ({
              ...prev,
              firstName: a.firstName || '',
              lastName: (a.lastName || a.lastname) || '',
              email: a.email || '',
              phone: String(a.mobileNumber || ''),
              address: a.streetAddress || '',
              city: a.city || '',
              state: a.state || '',
              pincode: String(a.pinCode || '')
            }));
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch your saved addresses."
          });
        }
      }
    };
    fetchAddresses();
  }, [user, useNewAddress, toast]);

  // Fill personal info when ordering for myself
  useEffect(() => {
    if (orderFor === 'myself' && user) {
      (async () => {
        try {
          const userData = await userService.getUserInfo();
          setFormData(prev => ({
            ...prev,
            firstName: userData.firstname || '',
            lastName: userData.lastname || '',
            email: userData.emailid || '',
            phone: String(userData.mobilenum || '')
          }));
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch your profile information."
          });
        }
      })();
    } else {
      setFormData(prev => ({ ...prev, firstName: '', lastName: '', email: '', phone: '' }));
    }
  }, [orderFor, user, toast]);

  // Recalculate subtotal & total
  useEffect(() => {
    const newSubtotal = calculateSubtotal();
    setCurrentSubtotal(newSubtotal);

    let total = cartStore.getTotal(); // Use cartStore.getTotal() instead of getTotal()
    if (appliedPromo) {
      const discountAmount = (newSubtotal * appliedPromo.discount) / 100;
      total -= discountAmount;
    }
    setCurrentTotal(total);
  }, [items, calculateSubtotal, appliedPromo]);

  useEffect(() => {
    const loadCart = async () => {
      if (cartStore.loadCartItems) {
        await cartStore.loadCartItems();
        setCurrentSubtotal(calculateSubtotal());
      }
    };
    loadCart();
  }, []);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const validatePhone = (phone) => /^[6-9]\d{9}$/.test(phone);
  const validatePinCode = (pincode) => /^\d{6}$/.test(pincode);
  const validateName = (name) => name.trim().length >= 2;
  const validateAddress = (address) => address.trim().length >= 10;

  const validateForm = () => {
    const errors = [];
    if (!formData.firstName.trim() || !validateName(formData.firstName)) errors.push("First name is required and should be at least 2 characters");
    if (formData.lastName.trim() && !validateName(formData.lastName)) errors.push("Last name should be at least 2 characters");
    if (!formData.email.trim() || !validateEmail(formData.email)) errors.push("A valid email is required");
    if (!formData.phone.trim() || !validatePhone(formData.phone)) errors.push("A valid 10-digit mobile number is required");
    if (!formData.address.trim() || !validateAddress(formData.address)) errors.push("Street address should be minimum 10 characters");
    if (!formData.pincode.trim() || !validatePinCode(formData.pincode)) errors.push("A valid 6-digit PIN code is required");
    if (!formData.city.trim()) errors.push("City is required");
    if (!formData.state.trim()) errors.push("State is required");
    return errors;
  };

  const isFormValid = () => {
    if (savedAddresses.length > 0 && !useNewAddress) return selectedAddressId !== null;
    return (
      formData.firstName.trim() &&
      validateEmail(formData.email) &&
      validatePhone(formData.phone) &&
      formData.address.trim() &&
      formData.pincode.length === 6 &&
      formData.city.trim() &&
      formData.state.trim() &&
      (!formData.lastName.trim() || validateName(formData.lastName))
    );
  };

  const handleAddressSelect = (addressId) => {
    const selectedAddress = savedAddresses.find(addr => addr.addressId === parseInt(addressId));
    if (selectedAddress) {
      setSelectedAddressId(selectedAddress.addressId);
      setFormData({
        ...formData,
        firstName: selectedAddress.firstName || '',
        lastName: (selectedAddress.lastName || selectedAddress.lastname) || '',
        email: selectedAddress.email || '',
        phone: String(selectedAddress.mobileNumber || ''),
        address: selectedAddress.streetAddress || '',
        city: selectedAddress.city || '',
        state: selectedAddress.state || '',
        pincode: String(selectedAddress.pinCode || '')
      });
    }
  };

  const handleSaveNewAddress = async () => {
    const errors = validateForm();
    if (errors.length) {
      errors.forEach(err => toast({ variant: "destructive", title: "Validation Error", description: err }));
      return;
    }
    try {
      const addressData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        mobileNumber: formData.phone.trim(),
        streetAddress: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pinCode: formData.pincode.trim()
      };
      await addressService.addAddress(addressData);
      const updated = await addressService.getAllAddresses();
      setSavedAddresses(updated);
      const newAddr = updated[updated.length - 1];
      setSelectedAddressId(newAddr.addressId);
      setUseNewAddress(false);
      toast({ title: "Success", description: "Address saved successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to save address" });
    }
  };

  const handleUpdateAddress = async (addressId) => {
    const errors = validateForm();
    if (errors.length) {
      errors.forEach(err => toast({ variant: "destructive", title: "Validation Error", description: err }));
      return;
    }
    try {
      const addressData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        mobileNumber: formData.phone.trim(),
        streetAddress: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pinCode: formData.pincode.trim()
      };
      await addressService.editAddress(addressId, addressData);
      const updated = await addressService.getAllAddresses();
      setSavedAddresses(updated);
      setIsEditingAddress(false);
      setEditingAddressId(null);
      setSelectedAddressId(addressId);
      toast({ title: "Success", description: "Address updated successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update address" });
    }
  };

  const handleStartEditAddress = (address) => {
    setIsEditingAddress(true);
    setEditingAddressId(address.addressId);
    setFormData({
      ...formData,
      firstName: address.firstName || '',
      lastName: (address.lastName || address.lastname) || '',
      email: address.email || '',
      phone: String(address.mobileNumber || ''),
      address: address.streetAddress || '',
      city: address.city || '',
      state: address.state || '',
      pincode: String(address.pinCode || '')
    });
  };

  const handleCancelEdit = () => {
    setIsEditingAddress(false);
    setEditingAddressId(null);
    if (selectedAddressId) handleAddressSelect(selectedAddressId);
  };

  const validateField = (field, value) => {
    switch (field) {
      case 'firstName': return validateName(value) ? null : 'First name is required and should be at least 2 characters';
      case 'lastName': return value ? (validateName(value) ? null : 'Last name should be at least 2 characters') : null;
      case 'email': return validateEmail(value) ? null : 'Please enter a valid email address';
      case 'phone': return validatePhone(value) ? null : 'Please enter a valid 10-digit mobile number';
      case 'address': return validateAddress(value) ? null : 'Please enter a detailed street address (minimum 10 characters)';
      case 'pincode': return validatePinCode(value) ? null : 'Please enter a valid 6-digit PIN code';
      case 'city': case 'state': return value.trim() ? null : `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      default: return null;
    }
  };

  const handleInputChange = async (field, value) => {
    let processedValue = value;
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setFieldErrors(prev => ({ ...prev, [field]: error }));

    if (field === 'phone') processedValue = value.replace(/\D/g, '').slice(0, 10);
    if (field === 'pincode') processedValue = value.replace(/\D/g, '').slice(0, 6);

    setFormData(prev => ({ ...prev, [field]: processedValue }));

    if (field === 'pincode' && processedValue.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${processedValue}`);
        const data = await response.json();
        if (data[0].Status === "Success") {
          const location = data[0].PostOffice[0];
          setFormData(prev => ({ ...prev, city: `${location.Name}, ${location.District}`, state: location.State }));
        } else {
          setFormData(prev => ({ ...prev, city: '', state: '' }));
        }
      } catch {
        setFormData(prev => ({ ...prev, city: '', state: '' }));
      }
    }
  };

  const handlePlaceOrder = () => {
    if (!isFormValid()) {
      toast({ title: 'Invalid Information', description: 'Please fill in all required fields correctly.', variant: 'destructive' });
      return;
    }
    setTimeout(() => {
      setOrderPlaced(true);
      clearCart();
      toast({ title: 'Order Placed Successfully!', description: 'Thank you for your order. You will receive a confirmation email shortly.' });
    }, 1000);
  };

  // === FINAL CALCULATIONS ===
  const safeSubtotal = Number(currentSubtotal) || 0;
  const discountAmount = appliedPromo ? (safeSubtotal * appliedPromo.discount) / 100 : 0;
  const subtotalAfterDiscount = safeSubtotal - discountAmount;

  const totalContainerFee = items.reduce((total, item) => {
    if (item.packagingType === 'container' && localTaxInfo?.containerCharges) {
      return total + (localTaxInfo.containerCharges * (item.quantity || 1));
    }
    return total;
  }, 0);

  const shipping = safeSubtotal >= 500 ? 0 : Number(localTaxInfo?.shippingCharges || 0);
  const tax = (subtotalAfterDiscount * (Number(localTaxInfo?.gstPercentage || 0))) / 100;
  const totalAmount = subtotalAfterDiscount + totalContainerFee + shipping + tax;

  // === DEBUG LOG ===
  console.log('Checkout Final Values:', {
    safeSubtotal,
    discountAmount,
    totalContainerFee,
    shipping,
    tax,
    totalAmount,
    appliedPromo,
    localTaxInfo
  });

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Navbar />
        <div className="pt-24 pb-16 px-4">
          <div className="container mx-auto">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h1 className="text-4xl font-bold mb-4 text-green-600">Order Confirmed!</h1>
              <p className="text-xl text-muted-foreground mb-8">Your delicious pickles are on their way! Order #PK{Date.now()}</p>
              <div className="space-y-4">
                <Button size="lg" className="gradient-primary text-primary-foreground">Track Your Order</Button>
                <div><Button variant="outline" onClick={() => window.location.href = '/'}>Continue Shopping</Button></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="container mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-4"><span className="gradient-primary bg-clip-text text-transparent">Checkout</span></h1>
            <p className="text-muted-foreground">Complete your order details</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* ORDER SUMMARY */}
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card className="sticky top-24">
                <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
                <CardContent>
                  <div className="mb-6"><PromoCodeBanner /></div>
                  <div className="mb-6">
                    <PromoCodeInput onApplyPromo={setAppliedPromo} appliedPromo={appliedPromo} onRemovePromo={() => setAppliedPromo(null)} />
                  </div>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.cartId ?? item.id} className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <img src={item.image || '/placeholder.png'} alt={item.productName} className="w-16 h-16 object-cover rounded-lg" />
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity} • ₹{item.productPrice} / units • {item.packagingType}</p>
                            {item.packagingType === 'container' && localTaxInfo?.containerCharges ? (
                              <p className="text-sm text-muted-foreground">Container: ₹{localTaxInfo.containerCharges}</p>
                            ) : null}
                          </div>
                        </div>
                        <p className="font-medium">
                          ₹{(item.totalPrice || item.weightBasedPrice || item.productPrice || item.price || 0).toFixed(2)}
                          {item.packagingType === 'container' && localTaxInfo?.containerCharges ? ` + ₹${(localTaxInfo.containerCharges * item.quantity).toFixed(2)} (container)` : ''}
                        </p>
                      </div>
                    ))}
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between">
                        <span>Subtotal (excl. container fees)</span>
                        <span>₹{safeSubtotal.toFixed(2)}</span>
                      </div>
                      {totalContainerFee > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Container Charges</span>
                          <span>₹{totalContainerFee.toFixed(2)}</span>
                        </div>
                      )}
                      {safeSubtotal >= 500 ? (
                        <div className="flex items-center gap-2 text-sm text-green-600 border border-green-200 rounded-md p-2 bg-green-50">
                          <Truck className="h-4 w-4 flex-shrink-0" />
                          <span>Your order qualifies for FREE delivery!</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-primary border border-primary/20 rounded-md p-2 bg-primary/5">
                          <Truck className="h-4 w-4 flex-shrink-0" />
                          <span>Add ₹{(500 - safeSubtotal).toFixed(2)} more for FREE delivery!</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>₹{shipping.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>GST {isTaxInfoLoading ? "(loading...)" : `(${localTaxInfo?.gstPercentage}%)`}</span>
                        <span>₹{tax.toFixed(2)}</span>
                      </div>
                      {appliedPromo && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Discount ({appliedPromo.discount}%)</span>
                          <span>-₹{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-4">
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>₹{totalAmount.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-500 text-center mt-4">
                          By clicking the pay now button, you agree to our{' '}
                          <Link to="/terms" className="text-primary hover:underline">Terms and Conditions</Link>{' '}
                          and{' '}
                          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* FORM */}
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="space-y-6">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">1</div>
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <OrderFor value={orderFor} onChange={setOrderFor} />
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="Enter your first name" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} className={fieldErrors.firstName && touched.firstName ? 'border-red-500' : ''} required />
                        {fieldErrors.firstName && touched.firstName && <p className="text-sm text-red-500 mt-1">{fieldErrors.firstName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Enter your last name" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} className={fieldErrors.lastName && touched.lastName ? 'border-red-500' : ''} />
                        {fieldErrors.lastName && touched.lastName && <p className="text-sm text-red-500 mt-1">{fieldErrors.lastName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                        <Input id="email" type="email" placeholder="Enter your email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className={fieldErrors.email && touched.email ? 'border-red-500' : ''} required />
                        {fieldErrors.email && touched.email && <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" placeholder="Enter your phone number" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className={fieldErrors.phone && touched.phone ? 'border-red-500' : ''} required />
                        {fieldErrors.phone && touched.phone && <p className="text-sm text-red-500 mt-1">{fieldErrors.phone}</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">2</div>
                    <Truck className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {savedAddresses.length > 0 && (
                    <div className="mb-6">
                      <Label className="text-base">Select Delivery Address</Label>
                      <div className="mt-3">
                        <RadioGroup value={useNewAddress ? "new" : String(selectedAddressId)} onValueChange={(value) => {
                          if (value === "new") {
                            setUseNewAddress(true);
                            setSelectedAddressId(null);
                            setIsEditingAddress(false);
                            setEditingAddressId(null);
                            setFormData(prev => ({ firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '', paymentMethod: prev.paymentMethod }));
                          } else {
                            setUseNewAddress(false);
                            handleAddressSelect(value);
                          }
                        }}>
                          {savedAddresses.map((address) => (
                            <div key={address.addressId} className="flex items-center space-x-2 mb-4 border rounded-lg p-3 hover:bg-accent relative">
                              <RadioGroupItem value={String(address.addressId)} id={`address-${address.addressId}`} />
                              <Label htmlFor={`address-${address.addressId}`} className="text-sm flex-1 cursor-pointer">
                                <div>
                                  <span className="font-medium">{address.firstName} {address.lastName || address.lastname}</span>
                                  <p className="text-muted-foreground">{address.streetAddress}</p>
                                  <p className="text-muted-foreground">{address.city}, {address.state} {address.pinCode}</p>
                                  <p className="text-muted-foreground">Phone: {address.mobileNumber}</p>
                                </div>
                              </Label>
                              <Button type="button" variant="ghost" size="sm" className="absolute top-2 right-2" onClick={(e) => { e.stopPropagation(); setUseNewAddress(true); handleStartEditAddress(address); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                              </Button>
                            </div>
                          ))}
                          <div className="flex items-center space-x-2 mt-2">
                            <RadioGroupItem value="new" id="new-address" />
                            <Label htmlFor="new-address" className="cursor-pointer">Enter New Delivery Address</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </div>
                  )}
                  {savedAddresses.length === 0 && !useNewAddress && (
                    <div className="space-y-4">
                      <p className="text-gray-600">No address found. Please add address to proceed.</p>
                      <Button onClick={() => setUseNewAddress(true)}>Add Address</Button>
                    </div>
                  )}
                  {useNewAddress && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" value={formData.firstName} onChange={(e) => handleInputChange('firstName', e.target.value)} placeholder="First Name" className={fieldErrors.firstName && touched.firstName ? 'border-red-500' : ''} required />
                          {fieldErrors.firstName && touched.firstName && <p className="text-sm text-red-500 mt-1">{fieldErrors.firstName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" value={formData.lastName} onChange={(e) => handleInputChange('lastName', e.target.value)} placeholder="Last Name (Optional)" className={fieldErrors.lastName && touched.lastName ? 'border-red-500' : ''} />
                          {fieldErrors.lastName && touched.lastName && <p className="text-sm text-red-500 mt-1">{fieldErrors.lastName}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder="Email Address" className={fieldErrors.email && touched.email ? 'border-red-500' : ''} required />
                          {fieldErrors.email && touched.email && <p className="text-sm text-red-500 mt-1">{fieldErrors.email}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Mobile Number</Label>
                          <Input id="phone" type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} placeholder="Mobile Number" className={fieldErrors.phone && touched.phone ? 'border-red-500' : ''} required />
                          {fieldErrors.phone && touched.phone && <p className="text-sm text-red-500 mt-1">{fieldErrors.phone}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address</Label>
                        <Textarea id="address" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder="Enter your street address" className={fieldErrors.address && touched.address ? 'border-red-500' : ''} required />
                        {fieldErrors.address && touched.address && <p className="text-sm text-red-500 mt-1">{fieldErrors.address}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode">PIN Code</Label>
                        <Input id="pincode" value={formData.pincode} onChange={(e) => handleInputChange('pincode', e.target.value)} placeholder="Enter PIN code" className={fieldErrors.pincode && touched.pincode ? 'border-red-500' : ''} required maxLength={6} type="text" pattern="\d*" />
                        {fieldErrors.pincode && touched.pincode && <p className="text-sm text-red-500 mt-1">{fieldErrors.pincode}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} placeholder="City (auto-filled from PIN)" className={fieldErrors.city && touched.city ? 'border-red-500' : ''} required />
                          {fieldErrors.city && touched.city && <p className="text-sm text-red-500 mt-1">{fieldErrors.city}</p>}
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State</Label>
                          <Input id="state" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} placeholder="State (auto-filled from PIN)" className={fieldErrors.state && touched.state ? 'border-red-500' : ''} required />
                          {fieldErrors.state && touched.state && <p className="text-sm text-red-500 mt-1">{fieldErrors.state}</p>}
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        {isEditingAddress ? (
                          <>
                            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                            <Button onClick={() => handleUpdateAddress(editingAddressId)}>Update Address</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" onClick={() => setUseNewAddress(false)}>Cancel</Button>
                            <Button onClick={handleSaveNewAddress}>Save Address</Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-full flex items-center justify-center text-primary-foreground font-bold text-sm">3</div>
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="razorpay">Pay with RazorPay</SelectItem>
                      {/* <SelectItem value="cod">Cash on Delivery</SelectItem> */}
                    </SelectContent>
                  </Select>

                  {formData.paymentMethod === 'razorpay' && (
                    <div className="mt-4">
                      <PaymentButton
                        amount={Math.round(totalAmount * 100)} // in paise
                        customerInfo={{
                          ...formData,
                          addressId: selectedAddressId ? Number(selectedAddressId) : null,
                          promoDiscount: discountAmount // in rupees
                        }}
                        isFormValid={isFormValid()}
                        dto={{
                          containerCharges: Math.round(totalContainerFee * 100),
                          shippingCharges: Math.round(shipping * 100),
                          ShippingCharges: Math.round(shipping * 100),
                          gst: Math.round(tax * 100), // Added GST in paise
                          gstPercentage: Number(localTaxInfo?.gstPercentage || 0) // Added GST percentage
                        }}
                        disabled={isLoading}
                      />
                    </div>
                  )}

                  {formData.paymentMethod === 'cod' && (
                    <Button onClick={handlePlaceOrder} size="lg" className="w-full gradient-primary text-primary-foreground mt-4" disabled={isLoading}>
                      Place Order (COD)
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}