import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import axios from '@/lib/axios';
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
import '../styles/animations.css';
// Navbar and Footer are provided by MainLayout
import OrdersManagement from '@/components/OrdersManagement';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu-simple";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Package,
  ShoppingBag,
  Settings,
  Activity,
  Calendar,
  Bell,
  Plus,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { AddProductForm } from '@/components/AddProductForm';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { tokenService } from '@/services/tokenService';
import { djangoService } from '@/services/djangoService';
import { notificationService } from '@/services/notificationService';
import { authService } from '@/services/authService';
import NotificationDialog from '@/components/NotificationDialog';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    // Try to get the saved tab from localStorage, default to "overview" if not found
    return localStorage.getItem('adminDashboardTab') || "overview";
  });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Get current date for default year
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Generate array of years from 2020 to current year
  const years = Array.from(
    { length: currentDate.getFullYear() - 2024 + 1 },
    (_, i) => 2024 + i
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // Users tab state
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearching, setUserSearching] = useState(false);

  // Customer Care state
  const [employeeList, setEmployeeList] = useState([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    firstname: '',
    lastname: '',
    emailid: '',
    mobilenum: '',
    role: ''
  });
  const [employeeDeletingId, setEmployeeDeletingId] = useState(null);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Helper function to count admin users
  const countAdminUsers = (employees) => {
    return employees.filter(emp => emp.role === "ADMIN").length;
  };

  // Fetch notifications on mount
  useEffect(() => {
    let mounted = true;

    const fetchNotifications = async () => {
      try {
        // Check and restore session first
        await authService.restoreSession();
        
        // Now try to fetch notifications
        const data = await notificationService.fetchNotifications();
        
        // Only update state if component is still mounted
        if (mounted) {
          // Ensure all notifications have required fields
          const processedNotifications = data.map(n => ({
            ...n,
            id: n.id || Date.now().toString(),
            read: !!n.read,
            timestamp: n.timestamp || new Date().toISOString()
          }));
          
          setNotifications(processedNotifications);
          setUnreadCount(processedNotifications.filter(n => !n.read).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
        if (mounted) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Please log in again to view notifications"
          });
        }
      }
    };

    fetchNotifications();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Connect to WebSocket for real-time notifications
  useEffect(() => {
    notificationService.connect();
    
    const unsubscribe = notificationService.subscribe((notification) => {
      // Ensure notification has required fields
      const newNotification = {
        ...notification,
        id: notification.id || Date.now().toString(),
        read: false,
        timestamp: notification.timestamp || new Date().toISOString()
      };
      
      setNotifications(prev => {
        // Avoid duplicate notifications
        const exists = prev.some(n => n.id === newNotification.id);
        if (exists) return prev;
        return [newNotification, ...prev];
      });
      
      setUnreadCount(prev => prev + 1);
      
      // Show toast for new notification
      toast({
        title: "New Notification",
        description: notification.message,
        duration: 5000
      });
    });

    return () => {
      unsubscribe();
      notificationService.disconnect();
    };
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // build Authorization header robustly: accept full 'Bearer ...' or raw token
      const rawToken = tokenService.getAccessToken();
      let authHeader = null;
      if (rawToken) {
        authHeader = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
      } else {
        const ui = tokenService.getUserInfo && tokenService.getUserInfo();
        const maybe = ui && (ui.accessToken || ui.access_token || ui.token);
        if (maybe) authHeader = maybe.startsWith('Bearer ') ? maybe : `Bearer ${maybe}`;
      }

      if (!authHeader) {
        console.warn('[AdminDashboard] No access token available when fetching products');
      }

      // Fetch active and inactive products, then merge so admin sees all
      const [activeResp, inactiveResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_DJANGO_URL}/products/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader || '',
            'Origin': window.location.origin
          },
          mode: 'cors'
        }),
        fetch(`${import.meta.env.VITE_DJANGO_URL}/products/inactive/`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': authHeader || '',
            'Origin': window.location.origin
          },
          mode: 'cors'
        })
      ]);

      if (!activeResp.ok || !inactiveResp.ok) {
        const errorData = (await activeResp.json().catch(() => null)) || (await inactiveResp.json().catch(() => null));
        throw new Error(errorData?.detail || 'Failed to fetch products');
      }

      const activeData = await activeResp.json();
      const inactiveData = await inactiveResp.json();

      const activeList = (activeData.results || activeData || []).map(p => ({ ...p, is_active: true }));
      const inactiveList = (inactiveData.results || inactiveData || []).map(p => ({ ...p, is_active: false }));

      // Merge, prefer activeList when duplicates exist
      const merged = [...activeList];
      inactiveList.forEach(ip => {
        if (!merged.find(ap => ap.id === ip.id)) merged.push(ip);
      });

      setProducts(merged);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fetch products"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users for Users tab
  const fetchUsers = async (pageIdx = 0) => {
    setIsLoadingUsers(true);
    try {
      // Attempt to restore session first if needed
      await authService.restoreSession();
      
      // Get the latest token after session restore
      const rawToken = tokenService.getAccessToken();
      if (!rawToken) {
        throw new Error('No valid auth token available');
      }

      const authHeader = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
      
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/get-all-users?page=${pageIdx}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        credentials: 'include'
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => null);
        throw new Error(txt || 'Failed to fetch users');
      }

      const data = await resp.json();
      // backend returns a list of UserDTO objects
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
      // If the error is auth-related, attempt to refresh the token
      if (err.message.includes('auth') || err.message.includes('token')) {
        try {
          await tokenService.refreshToken();
          // Retry the fetch after refresh
          await fetchUsers(pageIdx);
          return;
        } catch (refreshErr) {
          console.error('Token refresh failed:', refreshErr);
        }
      }
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users' });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (activeTab === 'users') {
        try {
          // Ensure session/token is restored before making the initial request
          if (authService && typeof authService.restoreSession === 'function') {
            await authService.restoreSession();
          }
        } catch (err) {
          console.warn('restoreSession failed (continuing):', err);
        }
        if (!mounted) return;
        fetchUsers(usersPage);
      }
    };

    init();
    return () => { mounted = false; };
  }, [activeTab, usersPage]);

  // Debounced server-side search for users by email or phone
  useEffect(() => {
    if (activeTab !== 'users') return;
    const q = (searchTerm || '').trim();
    // if empty, restore paginated list
    if (!q) {
      // small delay to avoid race with other effects
      const t = setTimeout(() => fetchUsers(0), 200);
      return () => clearTimeout(t);
    }

    // Trigger server search for any non-empty input (backend handles lookup)

    let mounted = true;
    setUserSearching(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await axios.get(`${import.meta.env.VITE_API_URL}/user/search`, {
          params: { input: q },
          headers: { 'Authorization': `Bearer ${tokenService.getAccessToken()}` }
        });
        if (!mounted) return;
  // server returns a single UserDTO (or possibly an array)
  setUsers(Array.isArray(resp.data) ? resp.data : [resp.data]);
        setUsersPage(0);
      } catch (err) {
        console.error('User search error', err);
        if (!mounted) return;
        // If not found, show empty list (do not toast repeatedly)
        setUsers([]);
      } finally {
        if (mounted) setUserSearching(false);
      }
    }, 400);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [searchTerm, activeTab]);

  // Define fetchStats function before using it in useEffect
  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      // build Authorization header robustly: accept full 'Bearer ...' or raw token
      const rawToken = tokenService.getAccessToken();
      let authHeader = null;
      if (rawToken) {
        authHeader = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
      } else {
        const ui = tokenService.getUserInfo && tokenService.getUserInfo();
        const maybe = ui && (ui.accessToken || ui.access_token || ui.token);
        if (maybe) authHeader = maybe.startsWith('Bearer ') ? maybe : `Bearer ${maybe}`;
      }

      if (!authHeader) {
        console.warn('[AdminDashboard] No access token available when fetching stats');
      }

      // Get stats data with year parameter
      const countsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/counts`, {
        params: {
          year: selectedYear
        },
        headers: {
          'Authorization': authHeader || ''
        },
        withCredentials: true
      });

      // Get revenue data with year parameter
      const revenueResponse = await axios.get(`${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/monthly-revenue/`, {
        params: {
          year: selectedYear
        },
        headers: {
          'Authorization': authHeader || ''
        },
        withCredentials: true
      });

      console.log('Stats response:', countsResponse.data);
      console.log('Revenue response:', revenueResponse.data);

      setStats(prev => ({
        ...prev,
        totalUsers: countsResponse.data?.totalUsers ?? 0,
        totalOrders: countsResponse.data?.totalOrders ?? 0,
        totalProducts: countsResponse.data?.totalProducts ?? 0,
        revenue: revenueResponse.data?.total_revenue ?? 0,
        monthlyRevenue: revenueResponse.data?.per_month ?? []
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Effect to fetch products when the tab changes to products
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab]);

  // Effect to fetch stats when year changes or when overview tab is active
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    }
  }, [activeTab, selectedYear]);

  const filteredProducts = products.filter(p => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (p.product_name || '').toLowerCase().includes(q) ||
      (p.product_title || '').toLowerCase().includes(q) ||
      (p.product_description || '').toLowerCase().includes(q);
  });

  const pagedProducts = filteredProducts.slice((page - 1) * perPage, page * perPage);

  // Placeholder data - you'll need to replace these with actual API calls
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    revenue: 0,
    recentOrders: [],
    monthlyRevenue: []
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        // build Authorization header robustly: accept full 'Bearer ...' or raw token
        const rawToken = tokenService.getAccessToken();
        let authHeader = null;
        if (rawToken) {
          authHeader = rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
        } else {
          const ui = tokenService.getUserInfo && tokenService.getUserInfo();
          const maybe = ui && (ui.accessToken || ui.access_token || ui.token);
          if (maybe) authHeader = maybe.startsWith('Bearer ') ? maybe : `Bearer ${maybe}`;
        }

        if (!authHeader) {
          console.warn('[AdminDashboard] No access token available when fetching stats');
        }

        // Fetch both counts and revenue data in parallel
        const [countsResponse, revenueResponse] = await Promise.all([
          axios.get(`${import.meta.env.VITE_API_URL}/counts`, {
            headers: {
              'Authorization': authHeader || '',
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            },
            credentials: 'include'
          }),
          axios.get(`${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/monthly-revenue/`, {
            headers: {
              'Authorization': authHeader || '',
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            },
            credentials: 'include'
          })
        ]);

        console.log('Stats response:', countsResponse.data); // For debugging
        console.log('Revenue response:', revenueResponse.data); // For debugging

        // Update stats with the data from the response
        setStats(prev => ({
          ...prev,
          totalUsers: countsResponse.data?.totalUsers ?? 0,
          totalOrders: countsResponse.data?.totalOrders ?? 0,
          totalProducts: countsResponse.data?.totalProducts ?? 0,
          revenue: revenueResponse.data?.total_revenue ?? 0,
          monthlyRevenue: revenueResponse.data?.per_month ?? []
        }));
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast({
          title: "Error",
          description: "Failed to fetch dashboard statistics",
          variant: "destructive"
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Fetch employees whenever active tab changes to settings
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchEmployees();
    }
  }, [activeTab]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/getAllEmployees`, {
        headers: {
          'Authorization': `Bearer ${tokenService.getAccessToken()}`
        }
      });
      setEmployeeList(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch employees"
      });
    }
  };

  const handleEmployeeFormChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate and show confirmation modal before performing save
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const { firstname, lastname, emailid, mobilenum, role } = employeeForm || {};
    if (!firstname || !lastname || !emailid || !mobilenum || !role) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields.'
      });
      return;
    }
    // Open confirmation dialog
    setShowConfirm(true);
  };

  // Perform the actual API call to create/update
  const performSaveOperation = async () => {
    setShowConfirm(false);
    setEmployeeSaving(true);
    try {
      if (editingEmployee) {
        // Update existing employee - be defensive about id field (backend uses userid)
        const editId = editingEmployee?.userid ?? editingEmployee?.id;
        if (!editId) {
          toast({ variant: 'destructive', title: 'Error', description: 'Missing user id for update.' });
          setEmployeeSaving(false);
          return;
        }

        // Update existing employee
        await axios.patch(
          `${import.meta.env.VITE_API_URL}/editEmployee/${editId}`,
          employeeForm,
          {
            headers: {
              'Authorization': `Bearer ${tokenService.getAccessToken()}`
            }
          }
        );
        toast({
          title: "Success",
          description: "Employee updated successfully"
        });
      } else {
        // Create new employee
        await axios.post(
          `${import.meta.env.VITE_API_URL}/create-customercare`,
          employeeForm,
          {
            headers: {
              'Authorization': `Bearer ${tokenService.getAccessToken()}`
            }
          }
        );
        toast({
          title: "Success",
          description: "Employee added successfully"
        });
      }
      setShowAddEmployee(false);
      setEditingEmployee(null);
      setEmployeeForm({
        firstname: '',
        lastname: '',
        emailid: '',
        mobilenum: '',
        role: ''
      });
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.response?.data?.message || "Failed to save employee"
      });
    } finally {
      setEmployeeSaving(false);
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      firstname: employee.firstname,
      lastname: employee.lastname,
      emailid: employee.emailid,
      mobilenum: employee.mobilenum,
      role: employee.role
    });
    setShowAddEmployee(true);
  };

  const handleDeleteEmployee = async (id) => {
    // Open delete confirmation modal for compatibility if called directly
    const employee = employeeList.find(emp => emp.userid === id);
    if (employee) {
      setDeleteTarget(employee);
      setShowDeleteConfirm(true);
    }
  };

  const openDeleteConfirm = (employee) => {
    setDeleteTarget(employee);
    setShowDeleteConfirm(true);
  };

  const performDeleteOperation = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.userid ?? deleteTarget.id;
    // Check last-admin again
    if (deleteTarget?.role === 'ADMIN' && countAdminUsers(employeeList) === 1) {
      toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete the last admin user' });
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
      return;
    }

    try {
      setEmployeeDeletingId(id);
      await axios.delete(`${import.meta.env.VITE_API_URL}/deleteEmployee/${id}`, {
        headers: { 'Authorization': `Bearer ${tokenService.getAccessToken()}` }
      });
      toast({ title: 'Success', description: 'Employee deleted successfully' });
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete employee' });
    } finally {
      setEmployeeDeletingId(null);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  // Filter employees by search term for Customer Care table
  const filteredEmployees = (employeeList || []).filter((emp) => {
    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return true;
    const fullName = `${emp.firstname || ''} ${emp.lastname || ''}`.toLowerCase();
    return (
      fullName.includes(q) ||
      String(emp.emailid || '').toLowerCase().includes(q) ||
      String(emp.mobilenum || '').toLowerCase().includes(q)
    );
  });

  return (
  <div className="min-h-screen max-h-screen bg-background flex flex-col w-full max-w-full overflow-x-hidden">
      <main className="flex-1 pt-16 overflow-y-auto w-full max-w-full">
        <div className="w-full max-w-full px-2 sm:px-4 py-4 sm:py-8 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between w-full max-w-full">
              <motion.h1
                className="font-bold text-2xl md:text-4xl"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Admin Control Panel
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => setShowNotifications(true)}
                  className="relative"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </motion.div>

              <NotificationDialog 
                open={showNotifications}
                onOpenChange={(open) => {
                  setShowNotifications(open);
                  // Only update counts when closing if there were unread notifications
                  if (!open && unreadCount > 0) {
                    const updatedNotifications = notifications.map(n => ({
                      ...n,
                      read: true
                    }));
                    setNotifications(updatedNotifications);
                    setUnreadCount(0);
                  }
                }}
                onNotificationRead={(notificationId) => {
                  // Update single notification read state
                  setNotifications(prev => prev.map(n => 
                    n.id === notificationId ? { ...n, read: true } : n
                  ));
                  setUnreadCount(prev => Math.max(0, prev - 1));
                }}
                notifications={notifications}
              />
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value);
                localStorage.setItem('adminDashboardTab', value);
              }}
              className="space-y-8 w-full max-w-full"
            >
              <TabsList className="flex flex-wrap justify-around bg-muted/50 p-1 w-full">
                <TabsTrigger value="overview" className="data-[state=active]:bg-background flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <Activity className="w-4 h-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-background flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="data-[state=active]:bg-background flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden sm:inline">Orders</span>
                </TabsTrigger>
                <TabsTrigger value="products" className="data-[state=active]:bg-background flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Products</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-background flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Customer Care</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 sm:gap-4 w-full max-w-full flex-wrap">
                  <DropdownMenu 
                    trigger={
                      <Button variant="outline" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Year {selectedYear}
                      </Button>
                    }
                  >
                    <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700">
                      <DropdownMenuLabel>Select Year</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        {years.map((year) => (
                          <DropdownMenuItem
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={cn(
                              "transition-colors cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                              selectedYear === year && "bg-primary/10 font-semibold text-primary"
                            )}
                          >
                            {year}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8 w-full max-w-full">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Total Users</p>
                          <h3 className="text-2xl font-bold">
                            {isLoadingStats ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              stats.totalUsers
                            )}
                          </h3>
                        </div>
                        <Users className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Total Orders</p>
                          <h3 className="text-2xl font-bold">
                            {isLoadingStats ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              stats.totalOrders
                            )}
                          </h3>
                        </div>
                        <ShoppingBag className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Total Products</p>
                          <h3 className="text-2xl font-bold">
                            {isLoadingStats ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              stats.totalProducts
                            )}
                          </h3>
                        </div>
                        <Package className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Revenue</p>
                          <h3 className="text-2xl font-bold">
                            {isLoadingStats ? (
                              <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                              `₹${(stats.revenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            )}
                          </h3>
                        </div>
                        <Activity className="w-8 h-8 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 w-full max-w-full">
                  {/* Distribution Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Distribution Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-80">
                        {isLoadingStats ? (
                          <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : (
                          <Doughnut
                            data={{
                              labels: ['Users', 'Orders', 'Products'],
                              datasets: [{
                                data: [
                                  stats.totalUsers || 0,
                                  stats.totalOrders || 0,
                                  stats.totalProducts || 0
                                ],
                                backgroundColor: [
                                  'rgba(75, 192, 192, 0.6)',
                                  'rgba(54, 162, 235, 0.6)',
                                  'rgba(255, 99, 132, 0.6)'
                                ],
                                borderColor: [
                                  'rgba(75, 192, 192, 1)',
                                  'rgba(54, 162, 235, 1)',
                                  'rgba(255, 99, 132, 1)'
                                ],
                                borderWidth: 1
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom'
                                }
                              }
                            }}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Revenue Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Revenue</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-80">
                        {isLoadingStats ? (
                          <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin" />
                          </div>
                        ) : (
                          <Bar
                            data={{
                              labels: stats.monthlyRevenue.map(item => {
                                const [year, month] = item.month.split('-');
                                return new Date(year, month - 1).toLocaleString('default', { month: 'short' });
                              }),
                              datasets: [{
                                label: 'Monthly Revenue (₹)',
                                data: stats.monthlyRevenue.map(item => Number((item.revenue / 100).toFixed(2))),
                                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                                borderColor: 'rgba(75, 192, 192, 1)',
                                borderWidth: 1
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    callback: function (value) {
                                      return '₹' + value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    }
                                  }
                                }
                              },
                              plugins: {
                                legend: {
                                  position: 'bottom'
                                },
                                tooltip: {
                                  callbacks: {
                                    label: function (context) {
                                      return '₹' + context.parsed.y.toLocaleString();
                                    }
                                  }
                                }
                              }
                            }}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users">
                <Card>
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2 w-full max-w-full flex-wrap">
                        <h3 className="text-xl font-semibold mb-4 sm:mb-0">User Management</h3>
                        <div className="flex items-center gap-2 w-full sm:w-96">
                          <div className="flex-1">
                            <Input
                              placeholder="Search users"
                              value={searchTerm}
                              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                              className="w-full"
                            />
                          </div>
                          <Button onClick={() => { fetchUsers(usersPage); }} size="sm">Refresh</Button>
                        </div>
                      </div>
                      <div className="space-y-4">

                      <div>
                        {/** Users list */}
                        <div className="overflow-x-auto w-full">
                          <table className="min-w-[600px] w-full text-left text-sm">
                            <thead>
                              <tr className="text-xs text-muted-foreground">
                                <th className="px-3 py-2">User ID</th>
                                <th className="px-3 py-2">Name</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Role</th>
                                <th className="px-3 py-2">Mobile</th>
                              </tr>
                            </thead>
                            <tbody>
                              {users.length === 0 && !isLoadingUsers ? (
                                <tr>
                                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No users found</td>
                                </tr>
                              ) : (
                                users.map((u) => (
                                  <tr key={u.userid} className="border-t">
                                    <td className="px-3 py-3">{u.userid}</td>
                                    <td className="px-3 py-3">{u.firstname} {u.lastname}</td>
                                    <td className="px-3 py-3">{u.emailid}</td>
                                    <td className="px-3 py-3">{u.role}</td>
                                    <td className="px-3 py-3">{u.mobilenum}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Showing page {usersPage + 1}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" disabled={usersPage === 0 || isLoadingUsers} onClick={() => setUsersPage(p => Math.max(0, p - 1))}>Previous</Button>
                          <Button size="sm" variant="outline" disabled={isLoadingUsers || users.length < 1} onClick={() => setUsersPage(p => p + 1)}>Next</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                <OrdersManagement />
              </TabsContent>

              <TabsContent value="products">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <h3 className="text-xl font-semibold">Product Management</h3>
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                          <Input
                            placeholder="Search by name, title or description"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                            className="w-full"
                          />
                        </div>
                        <Button 
                          onClick={() => { setEditProduct(null); setShowAddProduct(true); }} 
                          className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90"
                        >
                          Add Product
                        </Button>
                      </div>

                      <>
                        <Dialog open={showAddProduct} onOpenChange={(open) => { if (!open) setEditProduct(null); setShowAddProduct(open); }}>
                          <DialogContent className="max-w-full sm:max-w-2xl md:max-w-3xl w-full p-2 sm:p-6 overflow-y-auto max-h-[90vh]">
                            <DialogHeader className="pb-4 border-b">
                              <DialogTitle className="text-xl font-bold">
                                {editProduct ? 'Edit Product' : 'Add New Product'}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="py-4 px-1">
                              <AddProductForm
                                product={editProduct}
                                onSuccess={() => {
                                  setShowAddProduct(false);
                                  setEditProduct(null);
                                  // Refresh products list
                                  fetchProducts();
                                }}
                              />
                            </div>
                            <DialogFooter className="py-4 border-t" />
                          </DialogContent>
                        </Dialog>
                        {!showAddProduct && (
                          <div className="staggered-animation">
                            <ScrollArea className="h-[700px]">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 p-2 sm:p-4 w-full max-w-full">
                                {pagedProducts.map((product) => (
                                  <motion.div
                                    key={product.id}
                                    className="product-card rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-lg relative"
                                    whileHover={{ y: -5 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <div className="relative h-44 overflow-hidden bg-gray-50">
                                      <img
                                        src={product.product_image1_url}
                                        alt={product.product_title}
                                        className="product-image w-full h-full object-cover"
                                      />
                                      <div className="absolute top-2 right-2">
                                        <Badge className="bg-primary/90 hover:bg-primary/100">
                                          {product.category}
                                        </Badge>
                                      </div>
                                      <div className="absolute left-2 bottom-2 flex gap-2">
                                        {(product.variants || []).slice(0, 2).map((v, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-white/80 text-xs rounded-md font-medium">
                                            {v.weight}{v.unit ?? 'g'} • ₹{v.price}
                                          </span>
                                        ))}
                                      </div>
                                    </div>

                                    <div className="p-4 space-y-4">
                                      <div className="space-y-2">
                                        <div>
                                          <h3 className="text-lg font-semibold tracking-tight mb-1">
                                            {product.product_name}
                                          </h3>
                                          <p className="text-sm text-muted-foreground">
                                            {product.product_title}
                                          </p>
                                        </div>
                                        <div className="pt-1">
                                          <p className="text-sm text-muted-foreground line-clamp-2">
                                            {product.product_description}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Active toggle */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm text-muted-foreground">Active</span>
                                          <Switch
                                            checked={!!product.is_active}
                                            disabled={togglingId === product.id}
                                            onCheckedChange={async (checked) => {
                                              setTogglingId(product.id);
                                              try {
                                                if (checked) {
                                                  // restore
                                                  await djangoService.restoreProduct(product.id);
                                                  toast({ title: 'Activated', description: `${product.product_title} is now active.` });
                                                } else {
                                                  // soft delete / deactivate
                                                  await djangoService.deleteProduct(product.id);
                                                  toast({ title: 'Deactivated', description: `${product.product_title} is now inactive.` });
                                                }
                                                // Refresh list
                                                fetchProducts();
                                              } catch (err) {
                                                console.error('Toggle active error', err);
                                                toast({ variant: 'destructive', title: 'Error', description: err.message || 'Failed to update product state' });
                                              } finally {
                                                setTogglingId(null);
                                              }
                                            }}
                                          />
                                        </div>
                                        <div />
                                      </div>

                                      <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-muted-foreground">
                                          Variants
                                        </h4>
                                        <div className="grid gap-2">
                                          {product.variants.map((variant) => (
                                            <div
                                              key={variant.variant_id}
                                              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg text-sm"
                                            >
                                              <span>{variant.weight}g</span>
                                              <span className="font-medium">₹{variant.price}</span>
                                              <span className={cn(
                                                "px-2 py-1 rounded text-xs",
                                                parseInt(variant.stock) > 10
                                                  ? "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400"
                                                  : "bg-red-100 text-red-700 dark:bg-red-700/20 dark:text-red-400"
                                              )}>
                                                Stock: {variant.stock}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="pt-4 flex justify-end space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex items-center gap-2"
                                        onClick={() => { setEditProduct(product); setShowAddProduct(true); }}
                                        title="Edit product"
                                      >
                                        <Edit className="w-4 h-4 text-yellow-600" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="flex items-center gap-2"
                                        disabled={deletingId === product.id}
                                        onClick={() => {
                                          setProductToDelete(product);
                                          setShowDeleteDialog(true);
                                        }}
                                        title="Delete product"
                                      >
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                      </Button>
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <Card>
                  <CardContent className="p-6">
                    <div className="space-y-4 sm:space-y-6 w-full max-w-full">
                      <h3 className="text-xl font-semibold">Customer Care Management</h3>
                      <div className="flex items-center gap-2 w-full">
                        <div className="flex-1">
                          <Input
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => {setSearchTerm(e.target.value); setPage(1);}}
                            className="w-full"
                          />
                        </div>
                        <Button
                          onClick={() => { setEditingEmployee(null); setEmployeeForm({ firstname: '', lastname: '', emailid: '', mobilenum: '', role: '' }); setShowAddEmployee(true); }}
                          className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90"
                          disabled={employeeSaving || showAddEmployee}
                        >
                          Add Employee
                        </Button>
                      </div>

                      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                        <DialogContent className="max-w-full sm:max-w-md w-full p-2 sm:p-6 overflow-y-auto max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleFormSubmit} className="space-y-4">
                            <div className="grid w-full items-center gap-4">
                              <div className="flex flex-col space-y-1.5">
                                <Input
                                  name="firstname"
                                  placeholder="First Name"
                                  value={employeeForm.firstname}
                                  onChange={handleEmployeeFormChange}
                                  required
                                />
                              </div>
                              <div className="flex flex-col space-y-1.5">
                                <Input
                                  name="lastname"
                                  placeholder="Last Name"
                                  value={employeeForm.lastname}
                                  onChange={handleEmployeeFormChange}
                                  required
                                />
                              </div>
                              <div className="flex flex-col space-y-1.5">
                                <Input
                                  name="emailid"
                                  type="email"
                                  placeholder="Email Address"
                                  value={employeeForm.emailid}
                                  onChange={handleEmployeeFormChange}
                                  required
                                  disabled={!!editingEmployee}
                                />
                              </div>
                              <div className="flex flex-col space-y-1.5">
                                <Input
                                  name="mobilenum"
                                  type="tel"
                                  placeholder="Mobile Number"
                                  value={employeeForm.mobilenum}
                                  onChange={handleEmployeeFormChange}
                                  required
                                />
                              </div>
                              <div className="flex flex-col space-y-1.5">
                                <Select
                                  name="role"
                                  value={employeeForm.role}
                                  onValueChange={(value) => 
                                    setEmployeeForm(prev => ({
                                      ...prev,
                                      role: value
                                    }))
                                  }
                                  required
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="CUSTOMERCARE">CUSTOMERCARE</SelectItem>
                                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" type="button" onClick={() => setShowAddEmployee(false)} disabled={employeeSaving}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={employeeSaving}>
                                {employeeSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                {editingEmployee ? 'Update' : 'Add'} Employee
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      {/* Confirmation dialog: show filled details and ask admin to confirm */}
                      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
                        <DialogContent className="max-w-full sm:max-w-md w-full p-2 sm:p-6 overflow-y-auto max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>Confirm Employee Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div>
                              <p className="text-sm font-medium">Name</p>
                              <p>{employeeForm.firstname} {employeeForm.lastname}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Email</p>
                              <p>{employeeForm.emailid}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Mobile</p>
                              <p>{employeeForm.mobilenum}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Role</p>
                              <p>{employeeForm.role}</p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={employeeSaving}>Cancel</Button>
                            <Button onClick={performSaveOperation} disabled={employeeSaving}>
                              {employeeSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                              Confirm
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Delete confirmation dialog */}
                      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                        <DialogContent className="max-w-full sm:max-w-md w-full p-2 sm:p-6 overflow-y-auto max-h-[90vh]">
                          <DialogHeader>
                            <DialogTitle>Confirm Delete</DialogTitle>
                          </DialogHeader>
                          <div className="py-2">
                            <p>Are you sure you want to delete the following employee?</p>
                            <div className="mt-3">
                              <p className="text-sm font-medium">Name</p>
                              <p>{deleteTarget ? `${deleteTarget.firstname} ${deleteTarget.lastname}` : ''}</p>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm font-medium">Email</p>
                              <p>{deleteTarget?.emailid || ''}</p>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm font-medium">Role</p>
                              <p>{deleteTarget?.role || ''}</p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }} disabled={employeeDeletingId !== null}>Cancel</Button>
                            <Button onClick={performDeleteOperation} disabled={employeeDeletingId !== null}>
                              {employeeDeletingId !== null && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                              Delete
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <div className="rounded-md border w-full max-w-full overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEmployees.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center">
                                  No employees found.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredEmployees.map((employee) => (
                                <TableRow key={employee.userid}>
                                  <TableCell>{employee.firstname} {employee.lastname}</TableCell>
                                  <TableCell>{employee.emailid}</TableCell>
                                  <TableCell>{employee.mobilenum}</TableCell>
                                  <TableCell>{employee.role}</TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditEmployee(employee)}
                                        disabled={employeeSaving || employeeDeletingId === employee.userid}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      {/* Only show delete button if this isn't the last admin */}
                                      {!(employee.role === "ADMIN" && countAdminUsers(employeeList) === 1) && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => openDeleteConfirm(employee)}
                                          disabled={employeeDeletingId === employee.userid}
                                        >
                                          {employeeDeletingId === employee.userid ? (
                                            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                                          ) : (
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                          )}
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 w-full max-w-full flex-wrap">
                        <p className="text-sm text-muted-foreground">
                          Showing {filteredEmployees.length} employees
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={employeeList.length < perPage}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <Toaster />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {productToDelete && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="font-medium">{productToDelete.product_title}</div>
              <div className="text-sm text-muted-foreground mt-1">{productToDelete.product_description}</div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setProductToDelete(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              disabled={deletingId === (productToDelete?.id)}
              onClick={async () => {
                if (!productToDelete) return;
                setDeletingId(productToDelete.id);
                try {
                  await djangoService.hardDeleteProduct(productToDelete.id);
                  toast({
                    title: 'Deleted',
                    description: 'Product permanently deleted',
                  });
                  if (typeof mutate === 'function') mutate();
                  else fetchProducts && fetchProducts();
                } catch (err) {
                  console.error('Hard delete error', err);
                  const isNotFound = (err.message || '').toLowerCase().includes('not found') || (err.response && err.response.status === 404);
                  toast({
                    variant: 'destructive',
                    title: isNotFound ? 'Product Not Found' : 'Error',
                    description: err.message || 'Failed to delete',
                  });
                  if (isNotFound) {
                    if (typeof mutate === 'function') mutate();
                    else fetchProducts && fetchProducts();
                  }
                } finally {
                  setDeletingId(null);
                  setShowDeleteDialog(false);
                  setProductToDelete(null);
                }
              }}
            >
              {deletingId === (productToDelete?.id) ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDashboard;