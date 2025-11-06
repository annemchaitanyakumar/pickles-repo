import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReactDOM from 'react-dom';
import OrderInvoice from '../components/OrderInvoice';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { User, MapPin, Package, Plus, ShoppingBag, X, Printer, Loader2, Download } from 'lucide-react';
import { userService } from '@/services/userService';
import { addressService } from '@/services/addressService';
import { tokenService } from '@/services/tokenService';
import { getUserOrders } from '@/services/orderService';
import { getTaxInfo } from '@/services/taxService';
import { cartService } from '@/services/cartService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axios from 'axios';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, isWithinLast6Months } from '@/lib/utils';
import { format } from "date-fns";
import { useReactToPrint } from 'react-to-print';

const plainAxios = axios.create();

const Profile = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "account");
  const [taxInfo, setTaxInfo] = useState({ gstPercentage: 0, shippingCharges: 0 });
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [orderProducts, setOrderProducts] = useState([]);
  const [orderAddress, setOrderAddress] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [isSaveButtonEnabled, setIsSaveButtonEnabled] = useState(false);
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [addressFormData, setAddressFormData] = useState({
    firstName: '', lastName: '', streetAddress: '', city: '', state: '', pinCode: '', email: '', mobileNumber: ''
  });
  const [openOrders, setOpenOrders] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const ordersPerPage = 5;
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const invoiceRef = useRef(null);

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${selectedOrder?.orderid || 'unknown'}`,
    removeAfterPrint: true,
    pageStyle: `
      @page { size: A4; margin: 15mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .no-print { display: none !important; }
      }
    `,
  });

  // Validators
  const validators = {
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
    phone: (value) => /^[6-9]\d{9}$/.test(value),
    pinCode: (value) => /^\d{6}$/.test(value),
    name: (value) => value.trim().length >= 2,
    address: (value) => value.trim().length >= 10
  };

  const validationMessages = {
    required: (field) => `${field} is required`,
    email: 'Please enter a valid email address',
    phone: 'Please enter a valid 10-digit mobile number starting with 6-9',
    pinCode: 'Please enter a valid 6-digit PIN code',
    name: (field) => `${field} should be at least 2 characters`,
    address: 'Please enter a detailed street address (minimum 10 characters)'
  };

  const validateField = (field, value) => {
    if (!value.trim() && field !== 'lastName') return validationMessages.required(field.replace(/([A-Z])/g, ' $1').trim());
    switch (field) {
      case 'firstName': return validators.name(value) ? null : validationMessages.name('First name');
      case 'lastName': return value ? (validators.name(value) ? null : validationMessages.name('Last name')) : null;
      case 'email': return validators.email(value) ? null : validationMessages.email;
      case 'mobileNumber': return validators.phone(value) ? null : validationMessages.phone;
      case 'streetAddress': return validators.address(value) ? null : validationMessages.address;
      case 'pinCode': return validators.pinCode(value) ? null : validationMessages.pinCode;
      case 'city': case 'state': return value.trim() ? null : validationMessages.required(field);
      default: return null;
    }
  };

  // Fetch profile
  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getUserInfo();
      setProfileData(data);
      setEditedData(data);
    } catch (err) {
      setError(err.message || 'Failed to load profile data');
      toast({ variant: "destructive", title: "Error", description: err.message || 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProfileData();
    fetchAddresses();
  }, [fetchProfileData]);

  // Fetch addresses
  const fetchAddresses = async () => {
    try {
      setAddressLoading(true);
      const addresses = await addressService.getAllAddresses();
      setUserAddresses(addresses);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to fetch addresses" });
    } finally {
      setAddressLoading(false);
    }
  };

  // product helpers
  const fetchProductById = async (id) => {
    try {
      const response = await plainAxios.get(`http://18.61.135.23:8000/api/products/${id}`);
      const productData = response.data;
      if (productData && !productData.price && productData.product_price) {
        productData.price = productData.product_price;
      }
      return productData;
    } catch (err) {
      console.warn('[Profile] Failed to fetch product', id, err);
      return null;
    }
  };

  const fetchPresignedUrls = async (productId) => {
    try {
      const response = await plainAxios.get(`http://18.61.135.23:8000/api/products/${productId}/presigned-urls/`);
      return response.data || {};
    } catch (err) {
      console.warn('[Profile] Failed to fetch presigned urls', productId, err);
      return {};
    }
  };

  // Fetch orders and normalize item price fields
  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await getUserOrders();
      const list = Array.isArray(res) ? res : (res?.data || []);
      const addresses = await addressService.getAllAddresses();

      const allIdsSet = new Set();
      list.forEach(order => {
        if (order.product_list) {
          try {
            const parsed = typeof order.product_list === 'string' ? JSON.parse(order.product_list) : order.product_list;
            if (Array.isArray(parsed)) parsed.forEach(p => p.product_id && allIdsSet.add(String(p.product_id)));
          } catch (e) { console.warn('Error parsing product_list:', e); }
        }
      });

      const allIds = Array.from(allIdsSet);
      const productMap = {};
      const presignedMap = {};
      if (allIds.length) {
        await Promise.all(allIds.map(async (pid) => {
          const [product, urls] = await Promise.all([fetchProductById(pid), fetchPresignedUrls(pid)]);
          if (product) productMap[pid] = product;
          presignedMap[pid] = urls;
        }));
      }

      const enriched = await Promise.all(list.map(async order => {
        let items = [];
        if (order.product_list) {
          try {
            const parsed = typeof order.product_list === 'string' ? JSON.parse(order.product_list) : order.product_list;
            if (Array.isArray(parsed)) {
              items = await Promise.all(parsed.map(async p => {
                const pid = String(p.product_id);
                const product = productMap[pid] || {};
                const urls = presignedMap[pid] || {};
                const image = urls.product_image1_url || urls.product_image_url || '/placeholder.png';
                const quantity = Number(p.quantity ?? p.qty ?? 1) || 1;

                // derive unit price in paise
                const productPrice = product.price ?? product.product_price;
                const orderItemPrice = p.unitPrice ?? p.productPrice ?? p.price;
                const unitPrice = Number(orderItemPrice ?? productPrice ?? 0);

                // derive total in paise
                const total = Number(p.total ?? p.totalPrice ?? (unitPrice * quantity));

                return {
                  ...p,
                  productName: product.product_name || p.productname || p.product_name || 'Unknown Product',
                  product_name: product.product_name || p.productname || p.product_name || 'Unknown Product',
                  image,
                  // keep all keys for compatibility
                  price: unitPrice,
                  unitPrice,
                  total,
                  totalPrice: total,
                  quantity,
                  weight: p.weight
                };
              }));
            }
          } catch (e) { console.error('Error parsing order:', e, order); }
        }

        const address = addresses.length > 0 ? addresses[0] : null;

        return {
          ...order,
          items,
          subtotal: order.subtotal,
          gst_amount: order.gst_amount,
          containerCharges: parseFloat(order.containerCharges || 0),
          shippingCharges: order.shippingCharges || 0,
          total_amount_paid: order.total_amount_paid,
          address: address
        };
      }));

      setOrders(enriched);

      try {
        // Only clear the cart automatically if this page load was triggered by a
        // recent payment flow. We use `location.state?.paymentSuccess` (set by the
        // checkout redirect) to indicate this. This prevents clearing the cart
        // when the user simply opens the Orders tab later.
        if (location.state?.paymentSuccess) {
          // Prefer an explicit orderId passed in the navigation state; otherwise
          // fall back to the first successful paid order from the fetched list.
          const paidOrder = Array.isArray(enriched) ? enriched.find(o => o?.payment_status === 'SUCCESS') : null;
          const orderIdToClear = location.state?.orderId || paidOrder?.orderid;
          if (orderIdToClear) {
            const key = `cart_cleared_for_order_${orderIdToClear}`;
            if (!localStorage.getItem(key)) {
              await cartService.clearAllCartItems();
              localStorage.setItem(key, '1');
              toast({ title: 'Cart cleared', description: 'Cart items removed after successful payment' });
            }
          }

          // Remove the paymentSuccess flag from history/state so subsequent
          // navigations to this page don't trigger another clear.
          try {
            navigate(location.pathname, { replace: true, state: {} });
          } catch (e) {
            // Fallback to history API if navigate isn't available for some reason
            try { window.history.replaceState({}, '', location.pathname); } catch (ee) {}
          }
        }
      } catch (err) {
        console.error('Error clearing cart after payment:', err);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to fetch orders" });
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (profileData?.userid) fetchOrders();
  }, [profileData]);

  useEffect(() => {
    if (location.state?.paymentSuccess) {
      toast({ title: "Payment Successful", description: "Your order has been placed successfully!" });
      fetchOrders();
    }
  }, [location.state]);

  useEffect(() => {
    const fetchTaxInfo = async () => {
      try {
        const info = await getTaxInfo();
        setTaxInfo(info);
      } catch (error) {
        console.error('Error fetching tax info:', error);
      }
    };
    fetchTaxInfo();
  }, []);

  // Address form helpers
  const validateAddressForm = (showToasts = false) => {
    const requiredFields = { firstName: "First Name", email: "Email", mobileNumber: "Mobile Number", streetAddress: "Street Address", city: "City", state: "State", pinCode: "PIN Code" };
    let hasErrors = false;
    const emptyFields = Object.entries(requiredFields).filter(([field]) => {
      const raw = addressFormData[field];
      const str = raw == null ? '' : String(raw);
      return !str.trim();
    });
    if (emptyFields.length > 0) {
      const newErrors = {};
      emptyFields.forEach(([field, fieldName]) => {
        newErrors[field] = `${fieldName} is required`;
        if (showToasts) toast({ variant: "destructive", title: "Required Field Empty", description: `${fieldName} is required` });
      });
      setFieldErrors(prev => ({ ...prev, ...newErrors }));
      hasErrors = true;
    }
    const fieldErrs = {};
    Object.keys(addressFormData).forEach(field => {
      const raw = addressFormData[field];
      const str = raw == null ? '' : String(raw);
      if (str.trim()) {
        const error = validateField(field, str);
        if (error) {
          fieldErrs[field] = error;
          if (showToasts) toast({ variant: "destructive", title: "Validation Error", description: error });
          hasErrors = true;
        }
      }
    });
    setFieldErrors(prev => ({ ...prev, ...fieldErrs }));
    return !hasErrors;
  };

  const resetAddressForm = () => {
    setAddressFormData({ firstName: '', lastName: '', streetAddress: '', city: '', state: '', pinCode: '', email: '', mobileNumber: '' });
    setTouched({});
    setFieldErrors({});
  };

  const handleAddAddress = async () => {
    setTouched(prev => ({ ...prev, ...Object.keys(addressFormData).reduce((acc, field) => ({ ...acc, [field]: true }), {}) }));
    if (!validateAddressForm(true)) return;
    try {
      setAddressLoading(true);
      if (!profileData) { const userData = await userService.getUserInfo(); setProfileData(userData); }
      const addressData = { ...addressFormData };
      ['firstName', 'lastName', 'email', 'mobileNumber', 'streetAddress', 'city', 'state', 'pinCode'].forEach(k => addressData[k] = addressData[k].trim());
      await addressService.addAddress(addressData);
      await fetchAddresses();
      setAddressDialogOpen(false);
      resetAddressForm();
      toast({ title: "Success", description: "Address added successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to add address" });
    } finally {
      setAddressLoading(false);
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress({ ...address, id: address.addressId || address.id });
    setAddressFormData({ firstName: address.firstName || '', lastName: address.lastName || '', streetAddress: address.streetAddress || '', city: address.city || '', state: address.state || '', pinCode: address.pinCode || '', email: address.email || '', mobileNumber: address.mobileNumber || '' });
    setTouched({});
    setFieldErrors({});
    setAddressDialogOpen(true);
  };

  const handleUpdateAddress = async () => {
    setTouched(prev => ({ ...prev, ...Object.keys(addressFormData).reduce((acc, field) => ({ ...acc, [field]: true }), {}) }));
    if (!validateAddressForm(true)) return;
    try {
      setAddressLoading(true);
      await addressService.editAddress(editingAddress.id, addressFormData);
      await fetchAddresses();
      setAddressDialogOpen(false);
      setEditingAddress(null);
      toast({ title: "Success", description: "Address updated successfully" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to update address" });
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;
    try {
      setAddressLoading(true);
      await addressService.deleteAddress(addressToDelete);
      await fetchAddresses();
      toast({ title: "Success", description: "Address deleted successfully" });
      setDeleteDialogOpen(false);
      setAddressToDelete(null);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to delete address" });
    } finally {
      setAddressLoading(false);
    }
  };

  const openDeleteDialog = (addressId) => {
    setAddressToDelete(addressId);
    setDeleteDialogOpen(true);
  };

  const handleAddressInputChange = async (e) => {
    const { id, value } = e.target;
    let processedValue = value;
    if (id === 'pinCode') processedValue = value.replace(/\D/g, '').slice(0, 6);
    else if (id === 'mobileNumber') processedValue = value.replace(/\D/g, '').slice(0, 10);
    setAddressFormData(prev => ({ ...prev, [id]: processedValue }));
    setTouched(prev => ({ ...prev, [id]: true }));
    const error = validateField(id, processedValue);
    setFieldErrors(prev => ({ ...prev, [id]: error }));

    if (id === 'pinCode' && processedValue.length === 6) {
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${processedValue}`);
        const data = await response.json();
        if (data[0].Status === "Success") {
          const location = data[0].PostOffice[0];
          setAddressFormData(prev => ({ ...prev, city: `${location.Name}, ${location.District}`, state: location.State }));
          setFieldErrors(prev => ({ ...prev, city: null, state: null }));
          setTouched(prev => ({ ...prev, city: true, state: true }));
        }
      } catch (error) { console.error('Error fetching pincode data:', error); }
    }
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    const fieldMapping = { 'mobile': 'mobilenum', 'email': 'emailid' };
    setEditedData(prevData => ({ ...prevData, [fieldMapping[id] || id]: value }));
  };

  useEffect(() => {
    if (profileData && editedData) {
      const hasChanges = profileData?.firstname !== editedData?.firstname || profileData?.lastname !== editedData?.lastname || profileData?.emailid !== editedData?.emailid || profileData?.mobilenum !== editedData?.mobilenum;
      setIsSaveButtonEnabled(hasChanges);
    }
  }, [editedData, profileData]);

  const handleSendOtp = async () => {
    try {
      setLoading(true);
      setError('');
      const editUserDTO = { userid: profileData.userid, firstname: editedData.firstname, lastname: editedData.lastname, emailid: editedData.emailid, mobilenum: editedData.mobilenum };
      await userService.sendOtpForUpdate(editUserDTO);
      setOtpDialogOpen(true);
      setResendTimer(30);
      setCanResend(false);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otpDialogOpen && resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (resendTimer === 0) setCanResend(true);
  }, [resendTimer, otpDialogOpen]);

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      const editUserDTO = { userid: profileData.userid, firstname: editedData.firstname, lastname: editedData.lastname, emailid: editedData.emailid, mobilenum: editedData.mobilenum };
      await userService.sendOtpForUpdate(editUserDTO);
      setResendTimer(30);
      toast({ title: "Success", description: "OTP has been resent to your email" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to resend OTP" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const validateDTO = { userid: profileData.userid, otp, firstname: editedData.firstname, lastname: editedData.lastname, emailid: editedData.emailid, mobilenum: editedData.mobilenum };
      const updatedUser = await userService.updateUserInfo(validateDTO);
      const existingAuth = JSON.parse(localStorage.getItem('authData') || '{}');
      const mergedAuth = {
        ...existingAuth,
        ...updatedUser,
        role: existingAuth.role || updatedUser.role,
        accessToken: existingAuth.accessToken || updatedUser.accessToken || tokenService.getAccessToken() || null,
        userid: existingAuth.userid || updatedUser.userid || updatedUser.userId || existingAuth.userId || existingAuth.userid
      };

      setProfileData(mergedAuth);
      setEditMode(false);
      setOtpDialogOpen(false);
      setOtp('');
      localStorage.setItem('authData', JSON.stringify(mergedAuth));
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message || 'Invalid OTP. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrderDetails = async (order) => {
    try {
      const toNumeric = (v) => {
        if (v == null) return 0;
        const s = String(v);
        const cleaned = s.replace(/[^0-9.-]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
      };

      let productList = [];
      try {
        productList = typeof order.product_list === 'string' ? JSON.parse(order.product_list) : order.product_list;
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to parse order details" });
        return;
      }
      if (!Array.isArray(productList)) {
        toast({ variant: "destructive", title: "Error", description: "Invalid product list format" });
        return;
      }

      const firstItem = productList.length ? productList[0] : null;
      const unitPriceFromFirst = firstItem ? toNumeric(firstItem.productPrice ?? firstItem.unitPrice ?? firstItem.price ?? 0) : 0;
      const sumUnitPrices = productList.length ? productList.reduce((s, it) => s + toNumeric(it.productPrice ?? it.unitPrice ?? it.price ?? 0), 0) : 0;
      let originalSubtotal = sumUnitPrices > 0 ? sumUnitPrices : (unitPriceFromFirst || Number(order.subtotal ?? 0) || 0);

      setSelectedOrder({ ...order, originalSubtotal });
      setOrderDetailsOpen(true);

      // Do NOT clear the cart when simply viewing a past successful order.
      // Clearing should only happen immediately after a successful payment flow
      // (handled elsewhere using navigation state).

      const productDetails = await Promise.all(productList.map(async (item) => {
        const pid = String(item.product_id);
        const [urls, product] = await Promise.all([fetchPresignedUrls(pid), fetchProductById(pid)]);
        const image = urls.product_image1_url || urls.product_image_url || '/placeholder.png';
        const unitPrice = Number(item.productPrice ?? item.unitPrice ?? item.price ?? 0);
        const qty = Number(item.quantity ?? 1) || 1;
        const totalPrice = Number(item.total ?? item.totalPrice ?? unitPrice * qty);

        return {
          product_name: item.productname || product?.product_name || `Product ${item.product_id}`,
          quantity: item.quantity,
          weight: item.weight,
          price: unitPrice,
          unitPrice,
          totalPrice,
          product_image: image
        };
      }));

      setOrderAddress(order.address || (userAddresses.length > 0 ? userAddresses[0] : null));
      setOrderProducts(productDetails);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to load order details" });
    }
  };

  const formatCurrency = (value) => {
    if (value == null) return '₹0';
    const num = Number(String(value).replace(/[^0-9.-]/g, ''));
    const rupees = num / 100;
    return `₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filterOrders = (orders) => {
    if (!orders) return [];
    return orders.filter(order => {
      if (timeFilter === 'last6months' && !isWithinLast6Months(order.createdTime)) return false;
      if (yearFilter !== 'all') {
        const orderYear = new Date(order.createdTime).getFullYear().toString();
        if (orderYear !== yearFilter) return false;
      }
      if (statusFilter !== 'all' && order.payment_status !== statusFilter) return false;
      return true;
    }).sort((a, b) => (b.createdTime || 0) - (a.createdTime || 0));
  };

  const getPaginatedOrders = (orders) => {
    const filtered = filterOrders(orders);
    const lastIndex = currentPage * ordersPerPage;
    const firstIndex = lastIndex - ordersPerPage;
    return { orders: filtered.slice(firstIndex, lastIndex), totalPages: Math.ceil(filtered.length / ordersPerPage) };
  };

  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2025; year--) years.push(year);
    return years;
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } .hide-scrollbar::-webkit-scrollbar { display: none; }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const generateInvoiceHTML = (order, address, products) => {
    const subtotalPaise = Number(order.originalSubtotal ?? order.subtotal ?? 0);
    const discountPaise = Number(order.discounted_amount ?? 0);
    const taxablePaise = Math.max(0, subtotalPaise - discountPaise);
    const gstPaise = Number(order.gst_amount ?? Math.round((taxablePaise * (taxInfo.gstPercentage || 0)) / 100));
    return `
      <div style="max-width:800px;margin:0 auto;padding:32px;background:#fff;font-family:Arial,sans-serif;">
        <h1 style="text-align:center;margin-bottom:24px;">Invoice</h1>
        <h2 style="text-align:center;margin-bottom:16px;">Order #${order.orderid}</h2>
        <div style="display:flex;justify-content:space-between;margin-bottom:24px;">
          <div><strong>Bill To:</strong><br>${address?.firstName} ${address?.lastName}<br>${address?.streetAddress}<br>${address?.city}, ${address?.state} ${address?.pinCode}<br>Phone: ${address?.mobileNumber}</div>
          <div style="text-align:right;"><strong>Date:</strong> ${order.createdTime ? new Date(order.createdTime).toLocaleDateString() : ''}<br><strong>Time:</strong> ${order.createdTime ? new Date(order.createdTime).toLocaleTimeString() : ''}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead><tr style="background:#f4f4f4;"><th style="padding:8px;border:1px solid #ddd;text-align:left;">Product</th><th style="padding:8px;border:1px solid #ddd;text-align:center;">Qty</th><th style="padding:8px;border:1px solid #ddd;text-align:center;">Weight</th><th style="padding:8px;border:1px solid #ddd;text-align:right;">Unit Price</th><th style="padding:8px;border:1px solid #ddd;text-align:right;">Total</th></tr></thead>
          <tbody>${products.map(p => `<tr><td style="padding:8px;border:1px solid #ddd;">${p.product_name}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;">${p.quantity}</td><td style="padding:8px;border:1px solid #ddd;text-align:center;">${p.weight}g</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${(p.unitPrice/100).toFixed(2)}</td><td style="padding:8px;border:1px solid #ddd;text-align:right;">${(p.totalPrice/100).toFixed(2)}</td></tr>`).join('')}</tbody>
        </table>
        <div style="width:100%;margin-bottom:24px;">
          <div style="display:flex;justify-space-between;margin-bottom:8px;"><span>Subtotal:</span><span>₹${((order.originalSubtotal ?? 0) / 100).toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Discount:</span><span>-₹${((order.discounted_amount ?? 0) / 100).toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>GST (${taxInfo.gstPercentage}%):</span><span>₹${(gstPaise / 100).toFixed(2)}</span></div>
          ${order.containerCharges > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Container Charges:</span><span>₹${Number(order.containerCharges).toFixed(2)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Shipping:</span><span>₹${Number(order.shippingCharges || 0).toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #ddd;padding-top:8px;"><span>Total:</span><span>₹${((order.total_amount_paid ?? 0) / 100).toFixed(2)}</span></div>
        </div>
        <div style="text-align:center;color:#888;margin-top:32px;"><p>Thank you for your business!</p><p>support@howtopickles.com</p></div>
      </div>
    `;
  };

  const handleDownloadInvoice = async (order, address, products) => {
    setDownloadingPdf(true);
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '727px';
    container.style.height = '1600px';
    container.style.background = '#FBF6EE';
    document.body.appendChild(container);

    try {
      const enrichedOrder = {
        ...order,
        originalSubtotal: order.originalSubtotal,
        discounted_amount: order.discounted_amount,
        containerCharges: 10,
        shippingCharges: 50,
        total_amount_paid: order.total_amount_paid,
        dto: {
          ...order.dto,
          gstPercentage: 9
        }
      };

      await new Promise((resolve) => {
        ReactDOM.render(
          <OrderInvoice order={enrichedOrder} address={address} products={products} />,
          container,
          () => resolve()
        );
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      container.style.display = 'block';

      const PRINT_DPI = 300;
      const SCREEN_DPI = 72;
      const dpiScale = PRINT_DPI / SCREEN_DPI;

      const canvas = await html2canvas(container, {
        scale: dpiScale,
        useCORS: true,
        logging: true,
        backgroundColor: '#FBF6EE',
        width: 727,
        height: 1600,
        windowWidth: 727,
        windowHeight: 1600,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('div');
          if (clonedContainer) {
            clonedContainer.style.width = '727px';
            clonedContainer.style.height = '1600px';
            clonedContainer.style.background = '#FBF6EE';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = Math.round((727 / PRINT_DPI) * 72);
      const pdfHeight = Math.round((1600 / PRINT_DPI) * 72);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');

      const orderDate = order.createdTime ? new Date(order.createdTime).toLocaleDateString('en-GB').replace(/\//g, '-') : 'unknown-date';
      pdf.save(`HT-Pickles_#${order.orderid}_${orderDate}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      ReactDOM.unmountComponentAtNode(container);
      document.body.removeChild(container);
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 pt-16 sm:pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full">
          <Card className="w-full max-w-4xl mx-auto">
            <CardContent className="p-4 sm:p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="flex w-full overflow-x-auto hide-scrollbar gap-2 p-1">
                  <TabsTrigger value="account" className="data-[state=active]:bg-primary text-xs sm:text-sm px-4 h-9 flex-shrink-0"><User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /><span>Account</span></TabsTrigger>
                  <TabsTrigger value="addresses" className="text-xs sm:text-sm px-4 h-9 flex-shrink-0"><MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /><span>Addresses</span></TabsTrigger>
                  <TabsTrigger value="orders" className="text-xs sm:text-sm px-4 h-9 flex-shrink-0"><Package className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" /><span>Orders</span></TabsTrigger>
                </TabsList>
                <div className="mt-6">
                  {/* Account Tab */}
                  <TabsContent value="account">
                    {loading ? (
                      <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                    ) : profileData ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                          <div className="space-y-2"><Label htmlFor="firstname">First Name</Label><Input id="firstname" value={editedData?.firstname || ''} onChange={handleInputChange} disabled={!editMode} className="h-9 sm:h-10" /></div>
                          <div className="space-y-2"><Label htmlFor="lastname">Last Name</Label><Input id="lastname" value={editedData?.lastname || ''} onChange={handleInputChange} disabled={!editMode} className="h-9 sm:h-10" /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={editedData?.emailid || ''} onChange={handleInputChange} disabled={!editMode} className="h-9 sm:h-10" /></div>
                        <div className="space-y-2"><Label htmlFor="mobile">Mobile Number</Label><Input id="mobile" type="tel" value={editedData?.mobilenum || ''} onChange={handleInputChange} disabled={!editMode} className="h-9 sm:h-10" /></div>
                        {editMode ? (
                          <div className="flex justify-end space-x-2">
                            <Button variant="ghost" onClick={() => { setEditMode(false); setEditedData(profileData); setIsSaveButtonEnabled(false); }} disabled={loading}>Cancel</Button>
                            <Button onClick={handleSendOtp} disabled={loading || !isSaveButtonEnabled}>Save Changes</Button>
                          </div>
                        ) : (
                          <Button onClick={() => setEditMode(true)} disabled={loading}>Edit Profile</Button>
                        )}
                      </div>
                    ) : <div>No profile data available.</div>}
                  </TabsContent>

                  {/* Addresses Tab */}
                  <TabsContent value="addresses">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg sm:text-xl font-medium">Saved Addresses</h3>
                        <Button onClick={() => { setEditingAddress(null); resetAddressForm(); setAddressDialogOpen(true); }} disabled={userAddresses.length >= 3}><Plus className="w-4 h-4 mr-2" />Add New Address</Button>
                      </div>
                      {addressLoading ? (
                        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
                      ) : userAddresses.length > 0 ? (
                        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                          {userAddresses.map((address) => (
                            <Card key={address.id} className="relative">
                              <CardContent className="p-4">
                                <div className="absolute top-2 right-2 space-x-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEditAddress(address)}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></Button>
                                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(address.addressId)} disabled={userAddresses.length <= 1}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 00-1-1z" clipRule="evenodd" /></svg></Button>
                                </div>
                                <div className="space-y-2 pt-4">
                                  <p className="font-medium">{address.firstName} {address.lastName || address.lastname}</p>
                                  <p className="text-sm text-muted-foreground">{address.streetAddress}</p>
                                  <p className="text-sm text-muted-foreground">{address.city}, {address.state} {address.pinCode}</p>
                                  <p className="text-sm text-muted-foreground">Phone: {address.mobileNumber}</p>
                                  <p className="text-sm text-muted-foreground">Email: {address.email}</p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : <p className="text-muted-foreground text-sm sm:text-base">No addresses saved yet.</p>}
                    </div>
                  </TabsContent>

                  {/* Orders Tab */}
                  <TabsContent value="orders">
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-xl font-medium text-gray-900">Your Orders</h2>
                        <div className="flex flex-wrap gap-2">
                          <Select value={timeFilter} onValueChange={setTimeFilter}><SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Time period" /></SelectTrigger><SelectContent><SelectItem value="all">All Time</SelectItem><SelectItem value="last6months">Last 6 Months</SelectItem></SelectContent></Select>
                          <Select value={yearFilter} onValueChange={setYearFilter}><SelectTrigger className="w-[120px] h-8"><SelectValue placeholder="Select Year" /></SelectTrigger><SelectContent><SelectItem value="all">All Years</SelectItem>{getYearRange().map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}</SelectContent></Select>
                          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[140px] h-8"><SelectValue placeholder="Payment Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="SUCCESS">Successful</SelectItem><SelectItem value="FAILED">Failed</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="EXPIRED">Expired</SelectItem></SelectContent></Select>
                        </div>
                      </div>
                      {ordersLoading ? (
                        <div className="space-y-3">{[1, 2, 3].map((i) => (
                          <Card key={i} className="w-full animate-pulse"><CardContent className="p-3"><div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div><div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div><div className="h-4 bg-gray-200 rounded w-1/3"></div></CardContent></Card>
                        ))}</div>
                      ) : orders.length === 0 ? (
                        <Card><CardContent className="p-5 text-center"><ShoppingBag className="h-10 w-10 mx-auto mb-3 text-gray-400" /><p className="text-base font-medium">No orders yet</p><p className="text-sm text-gray-500 mt-1">When you place orders, they will appear here.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/products')}>Start Shopping</Button></CardContent></Card>
                      ) : (
                        <>
                          <div className="space-y-3">
                            {getPaginatedOrders(orders).orders.map((order) => (
                              <Card key={`order-${order.orderid}`} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-3">
                                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-2 border-b">
                                    <div className="flex items-center gap-6">
                                      <div><div className="text-[13px] text-gray-500">Order #</div><div className="text-sm font-medium">{order.orderid}</div></div>
                                      <div><div className="text-[13px] text-gray-500">Amount</div><div className="text-sm font-medium">{formatCurrency(order.total_amount_paid)}{order.discounted_amount > 0 && <span className="text-[11px] text-emerald-600 ml-2">(Save {formatCurrency(order.discounted_amount)})</span>}</div></div>
                                      <div><div className="text-[13px] text-gray-500">Created</div><div className="text-sm">{formatDate(order.createdTime)}</div></div>
                                    </div>
                                    <div className="ml-auto flex flex-col md:flex-row items-end md:items-center gap-2 md:gap-3">
                                      <div className="text-right order-2 md:order-1"><div className="text-[13px] font-medium"><span className={cn(order.payment_status === 'SUCCESS' ? 'text-emerald-600' : order.payment_status === 'FAILED' ? 'text-red-600' : order.payment_status === 'EXPIRED' ? 'text-gray-600' : 'text-amber-600')}>
                                        {order.payment_status === 'SUCCESS' ? 'Payment Successful' : order.payment_status === 'FAILED' ? 'Payment Failed' : order.payment_status === 'EXPIRED' ? 'Order Expired' : 'Payment Pending'}
                                      </span></div></div>
                                      <Button size="sm" variant="outline" className="h-7 px-3 order-1 md:order-2" onClick={() => handleViewOrderDetails(order)}>View Details</Button>
                                    </div>
                                  </div>

                                  {/* Product list - mobile */}
                                  {order.items && order.items.length > 0 && (
                                    <>
                                      <div className="mt-2 md:hidden">
                                        <Collapsible open={openOrders[order.orderid]} onOpenChange={(open) => setOpenOrders(prev => ({...prev, [order.orderid]: open}))}>
                                          <CollapsibleTrigger asChild><Button variant="ghost" className="w-full justify-between h-8 px-2"><span className="text-sm font-medium">{order.items.length} {order.items.length === 1 ? 'Product' : 'Products'}</span><ChevronDown className={cn("h-5 w-5 text-gray-500 transition-transform duration-200", openOrders[order.orderid] && "rotate-180")} /></Button></CollapsibleTrigger>
                                          <CollapsibleContent className="space-y-2 pt-2">
                                            {order.items.map((product, index) => (
                                              <div key={index} className="flex gap-3 py-2">
                                                <img src={product.image} alt={product.productName} className="w-16 h-16 object-cover rounded-md border" onError={(e) => e.target.src = '/placeholder.png'} />
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex justify-between items-start gap-2">
                                                    <div className="text-sm font-medium truncate">{product.productName ?? product.product_name}</div>
                                                    <div className="text-sm font-medium whitespace-nowrap">
                                                      {formatCurrency(product.totalPrice ?? product.total ?? (product.unitPrice ?? product.price ?? 0) * (product.quantity ?? 1))}
                                                    </div>
                                                  </div>
                                                  <div className="text-[13px] text-gray-500 mt-0.5">Qty: {product.quantity}, Weight: {product.weight}</div>
                                                  <div className="text-[13px] text-gray-500 mt-0.5">Unit Price: {formatCurrency(product.unitPrice ?? product.price ?? 0)}</div>
                                                </div>
                                              </div>
                                            ))}
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </div>

                                      {/* Product list - desktop */}
                                      <div className="hidden md:block mt-2">
                                        <div className="space-y-2">
                                          {order.items.map((product, index) => (
                                            <div key={index} className="flex gap-3 py-2">
                                              <img src={product.image} alt={product.productName ?? product.product_name} className="w-16 h-16 object-cover rounded-md border" onError={(e) => e.target.src = '/placeholder.png'} />
                                              <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                  <div className="text-sm font-medium truncate">{product.productName ?? product.product_name ?? 'Product'}</div>
                                                  <div className="text-sm font-medium whitespace-nowrap">{formatCurrency(product.unitPrice ?? product.price ?? 0)}</div>
                                                </div>
                                                <div className="text-[13px] text-gray-500 mt-0.5">Qty: {product.quantity}, Weight: {product.weight}g</div>
                                                <div className="text-[13px] text-gray-500 mt-0.5">Price: {formatCurrency(product.unitPrice ?? product.price ?? 0)}</div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          <div className="flex justify-center mt-6">
                            <div className="flex gap-1">
                              {Array.from({ length: getPaginatedOrders(orders).totalPages }, (_, i) => (
                                <Button key={i + 1} variant={currentPage === i + 1 ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(i + 1)} className="w-8 h-8 p-0">{i + 1}</Button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
        {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
      </div>
      <Footer />

      {/* Order Details Dialog */}
      <Dialog open={orderDetailsOpen} onOpenChange={setOrderDetailsOpen}>
        <DialogContent className="w-[95%] max-w-[1000px] h-[90vh] md:h-[500px] flex flex-col overflow-hidden">
          <DialogHeader><DialogTitle>Order Details</DialogTitle><DialogDescription>View details for your order</DialogDescription></DialogHeader>
          <div className={cn("shrink-0 border-b", selectedOrder?.payment_status === 'SUCCESS' ? 'bg-emerald-50' : selectedOrder?.payment_status === 'FAILED' ? 'bg-red-50' : selectedOrder?.payment_status === 'EXPIRED' ? 'bg-gray-50' : 'bg-amber-50')}>
            <div className="p-4"><h2 className="text-lg font-semibold">Order #{selectedOrder?.orderid}</h2><p className={cn("text-sm font-medium mt-1", selectedOrder?.payment_status === 'SUCCESS' ? 'text-emerald-600' : selectedOrder?.payment_status === 'FAILED' ? 'text-red-600' : selectedOrder?.payment_status === 'EXPIRED' ? 'text-gray-600' : 'text-amber-600')}>
              {selectedOrder?.payment_status === 'SUCCESS' ? 'Payment Successful' : selectedOrder?.payment_status === 'FAILED' ? 'Payment Failed' : selectedOrder?.payment_status === 'EXPIRED' ? 'Order Expired' : 'Payment Pending'}
            </p></div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400">
            <div ref={invoiceRef} className="p-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><h3 className="text-sm font-medium mb-3">Ordered By</h3><div className="bg-gray-50 p-4 rounded-lg border"><div className="space-y-2 text-sm"><p>{selectedOrder?.user?.firstname} {selectedOrder?.user?.lastname}</p><p className="text-gray-500">Email: {selectedOrder?.user?.emailid}</p><p className="text-gray-500">Mobile: {selectedOrder?.user?.mobilenum}</p></div></div></div>
                <div><h3 className="text-sm font-medium mb-3">Delivery Address</h3><div className="bg-gray-50 p-4 rounded-lg border">{orderAddress ? <div className="space-y-2 text-sm"><p>{orderAddress.firstName} {orderAddress.lastName}</p><p className="text-gray-500">{orderAddress.streetAddress}</p><p className="text-gray-500">{orderAddress.city}, {orderAddress.state} {orderAddress.pinCode}</p><p className="text-gray-500">Phone: {orderAddress.mobileNumber}</p></div> : <p className="text-sm text-gray-500">No address available</p>}</div></div>
                <div><h3 className="text-sm font-medium mb-3">Order Summary</h3><div className="bg-white p-4 rounded-lg shadow-md"><div className="space-y-2">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(selectedOrder?.originalSubtotal)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Discount:</span><span>-₹{((selectedOrder?.discounted_amount ?? 0) / 100).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>GST ({taxInfo.gstPercentage}%):</span><span>{formatCurrency(selectedOrder?.gst_amount ?? Math.round((Math.max(0, (selectedOrder?.originalSubtotal ?? selectedOrder?.subtotal ?? 0) - (selectedOrder?.discounted_amount ?? 0)) * (taxInfo.gstPercentage || 0)) / 100))}</span></div>
                  {(selectedOrder?.containerCharges || 0) > 0 && <div className="flex justify-between"><span>Container Charges:</span><span>₹{Number(selectedOrder.containerCharges).toFixed(2)}</span></div>}
                  <div className="flex justify-between"><span>Shipping:</span><span>₹{Number(selectedOrder?.shippingCharges || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-2"><span>Total:</span><span>₹{((selectedOrder?.total_amount_paid ?? 0) / 100).toFixed(2)}</span></div>
                </div></div></div>
              </div>
              <div><h3 className="text-sm font-medium mb-3">Products</h3><div className="bg-gray-50 rounded-lg border divide-y">
                {orderProducts.map((product, index) => (
                  <div key={index} className="flex items-center gap-4 p-4">
                    <img src={product.product_image} alt={product.product_name} className="w-16 h-16 object-cover rounded-md border" onError={(e) => e.target.src = '/placeholder.png'} />
                    <div className="flex-1 min-w-0"><h4 className="font-medium">{product.product_name}</h4><p className="text-sm text-gray-500">{product.quantity}x {product.weight}g</p><p className="text-sm text-gray-500">Unit Price: {formatCurrency(product.unitPrice ?? product.price ?? 0)}</p></div>
                    <div className="text-right"><p className="font-medium">{formatCurrency(product.totalPrice ?? product.total ?? (product.unitPrice ?? product.price ?? 0) * (product.quantity ?? 1))}</p></div>
                  </div>
                ))}
              </div></div>
              <div className="mt-6 space-y-4"><div className="space-y-2"><h3 className="font-medium">Order Timeline</h3><div className="text-sm text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Created:</span><span>{selectedOrder?.createdTime ? format(new Date(selectedOrder.createdTime), 'PPpp') : 'N/A'}</span></div>
                <div className="flex justify-between"><span>Last Updated:</span><span>{selectedOrder?.payment_status === 'SUCCESS' ? format(new Date(selectedOrder.createdTime), 'PPpp') : 'N/A'}</span></div>
              </div></div></div>
            </div>
          </div>
          {orderDetailsOpen && selectedOrder?.payment_status === 'SUCCESS' && (
            <div className="flex gap-2 mt-4 no-print">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
                onClick={() => handleDownloadInvoice(selectedOrder, orderAddress, orderProducts)}
                disabled={downloadingPdf}
              >
                <Download className="h-4 w-4" />
                {downloadingPdf ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* OTP Dialog */}
      <Dialog open={otpDialogOpen} onOpenChange={setOtpDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-6">
          <DialogHeader className="mb-6"><DialogTitle className="text-xl font-semibold text-center">Verify OTP</DialogTitle><DialogDescription className="text-center text-muted-foreground">Please enter the 6-digit code sent to your email.</DialogDescription></DialogHeader>
          <div className="flex flex-col space-y-6">
            <div className="space-y-4"><Label className="text-center block text-sm font-medium">Enter OTP</Label>
              <InputOTP maxLength={6} value={otp} onChange={setOtp} pattern="\d*" inputMode="numeric" render={({ slots }) => (
                <InputOTPGroup className="gap-3 justify-center">
                  {slots.map((slot, index) => (
                    <InputOTPSlot key={index} {...slot} className={cn("w-12 h-14 text-xl font-bold rounded-xl border-2", "transition-all duration-200", "focus:ring-2 focus:ring-offset-2 focus:ring-primary", "hover:border-primary/50", "disabled:opacity-50", "appearance-none")} onKeyPress={(e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }} />
                  ))}
                </InputOTPGroup>
              )} />
            </div>
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
              {resendTimer > 0 ? <p className="text-sm text-muted-foreground">Resend available in <span className="font-semibold text-primary">{resendTimer}s</span></p> : (
                <Button type="button" variant="link" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors" onClick={handleResendOTP} disabled={!canResend || loading}>Resend OTP</Button>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => { setOtpDialogOpen(false); setOtp(''); setResendTimer(0); setCanResend(false); }} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={handleUpdateProfile} disabled={otp.length !== 6 || loading} className={cn("w-full sm:w-auto", "bg-primary hover:bg-primary/90", "text-white font-medium", "transition-all duration-200", loading && "animate-pulse")}>
                {loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Verifying...</span> : "Verify and Update"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Address dialog */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="w-[95%] max-w-[1000px] h-[90vh] md:h-[500px] flex flex-col overflow-hidden">
          <DialogHeader className="space-y-3"><DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle><DialogDescription>{editingAddress ? 'Update your delivery address details below.' : 'Enter your delivery address details below.'}</DialogDescription></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-6 py-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName" className="text-sm">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    value={addressFormData.firstName}
                    onChange={handleAddressInputChange}
                    placeholder="First Name"
                    className={`mt-1 h-9 ${fieldErrors.firstName && touched.firstName ? 'border-red-500' : ''}`}
                    required
                  />
                  {fieldErrors.firstName && touched.firstName && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-sm">Last Name (Optional)</Label>
                  <Input
                    id="lastName"
                    value={addressFormData.lastName}
                    onChange={handleAddressInputChange}
                    placeholder="Last Name (Optional)"
                    className={`mt-1 h-9 ${fieldErrors.lastName && touched.lastName ? 'border-red-500' : ''}`}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email" className="text-sm">Email <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={addressFormData.email}
                  onChange={handleAddressInputChange}
                  placeholder="Email"
                  className={`mt-1 h-9 ${fieldErrors.email && touched.email ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.email && touched.email && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="mobileNumber" className="text-sm">Mobile Number <span className="text-red-500">*</span></Label>
                <Input
                  id="mobileNumber"
                  value={addressFormData.mobileNumber}
                  onChange={handleAddressInputChange}
                  placeholder="Mobile Number"
                  maxLength={10}
                  className={`mt-1 h-9 ${fieldErrors.mobileNumber && touched.mobileNumber ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.mobileNumber && touched.mobileNumber && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.mobileNumber}</p>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="streetAddress" className="text-sm">Street Address <span className="text-red-500">*</span></Label>
                <Textarea
                  id="streetAddress"
                  value={addressFormData.streetAddress}
                  onChange={handleAddressInputChange}
                  placeholder="Enter your street address"
                  className={`mt-1 resize-none h-20 ${fieldErrors.streetAddress && touched.streetAddress ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.streetAddress && touched.streetAddress && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.streetAddress}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pinCode" className="text-sm">PIN Code <span className="text-red-500">*</span></Label>
                  <Input
                    id="pinCode"
                    value={addressFormData.pinCode}
                    onChange={handleAddressInputChange}
                    placeholder="PIN Code"
                    maxLength={6}
                    className={`mt-1 h-9 ${fieldErrors.pinCode && touched.pinCode ? 'border-red-500' : ''}`}
                    required
                  />
                  {fieldErrors.pinCode && touched.pinCode && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.pinCode}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="city" className="text-sm">City <span className="text-red-500">*</span></Label>
                  <Input
                    id="city"
                    value={addressFormData.city}
                    onChange={handleAddressInputChange}
                    placeholder="City"
                    className={`mt-1 h-9 ${fieldErrors.city && touched.city ? 'border-red-500' : ''}`}
                    required
                  />
                  {fieldErrors.city && touched.city && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.city}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="state" className="text-sm">State <span className="text-red-500">*</span></Label>
                <Input
                  id="state"
                  value={addressFormData.state}
                  onChange={handleAddressInputChange}
                  placeholder="State"
                  className={`mt-1 h-9 ${fieldErrors.state && touched.state ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.state && touched.state && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.state}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end space-x-2 sticky bottom-0 bg-background pt-3 mt-3 border-t">
            <Button variant="ghost" onClick={() => { setAddressDialogOpen(false); setEditingAddress(null); resetAddressForm(); }}>Cancel</Button>
            <Button onClick={editingAddress ? handleUpdateAddress : handleAddAddress}>{editingAddress ? 'Update' : 'Add'} Address</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Address</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this address? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={() => { setDeleteDialogOpen(false); setAddressToDelete(null); }}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteAddress} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
};

export default Profile;
