import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from '@/lib/axios';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import OrdersManagement from '@/components/OrdersManagement';
import CustomerCareManagement from '@/components/CustomerCareManagement';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Users, ShoppingBag, Loader2 } from 'lucide-react';
import { tokenService } from '@/services/tokenService';
import { authService } from '@/services/authService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Customer Care Dashboard: a restricted view of AdminDashboard intended for users with role CUSTOMERCARE.
// Restrictions applied:
// - No Overview tab
// - No Products tab
// - Orders: tracking actions disabled (pass allowTrackingActions={false} to OrdersManagement)
// - No Promo management
// - No "Create" Customer Care button (Add Employee button removed) — editing existing employees still possible

const CustomerCareDashboard = () => {
  const { toast } = useToast();
  // Initialize to 'users' or 'orders', defaulting to 'users' if stored value is 'settings'
  const [activeTab, setActiveTab] = useState(() => {
    const stored = localStorage.getItem('customerCareTab');
    return (stored === 'users' || stored === 'orders') ? stored : 'users';
  });

  // Users tab state
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearching, setUserSearching] = useState(false);

  // Customer Care state (employees)
  const [employeeList, setEmployeeList] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({ firstname: '', lastname: '', emailid: '', mobilenum: '', role: '' });
  const [employeeDeletingId, setEmployeeDeletingId] = useState(null);
  const [employeeSaving, setEmployeeSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [showAddEmployee, setShowAddEmployee] = useState(false); // kept so edit-flow can reuse the dialog

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
      if (activeTab === 'settings') fetchEmployees();
    };

    init();
    return () => { mounted = false; };
  }, [activeTab, usersPage]);

  // Fetch users similar to AdminDashboard
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
          'Authorization': authHeader,
        },
        credentials: 'include'
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => null);
        throw new Error(txt || 'Failed to fetch users');
      }

      const data = await resp.json();
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

  // Debounced server-side search for users
  useEffect(() => {
    if (activeTab !== 'users') return;
    const q = (searchTerm || '').trim();
    if (!q) {
      const t = setTimeout(() => fetchUsers(0), 200);
      return () => clearTimeout(t);
    }

    let mounted = true;
    setUserSearching(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await axios.get(`${import.meta.env.VITE_API_URL}/user/search`, {
          params: { input: q },
          headers: { 'Authorization': `Bearer ${tokenService.getAccessToken()}` }
        });
        if (!mounted) return;
        setUsers(Array.isArray(resp.data) ? resp.data : [resp.data]);
        setUsersPage(0);
      } catch (err) {
        console.error('User search error', err);
        if (!mounted) return;
        setUsers([]);
      } finally {
        if (mounted) setUserSearching(false);
      }
    }, 400);

    return () => { mounted = false; clearTimeout(timer); };
  }, [searchTerm, activeTab]);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/getAllEmployees`, {
        headers: { 'Authorization': `Bearer ${tokenService.getAccessToken()}` }
      });
      setEmployeeList(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch employees' });
    }
  };

  const handleEmployeeFormChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    const { firstname, lastname, emailid, mobilenum, role } = employeeForm || {};
    if (!firstname || !lastname || !emailid || !mobilenum || !role) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill in all required fields.' });
      return;
    }
    setShowConfirm(true);
  };

  const performSaveOperation = async () => {
    // Note: creation is not reachable because Add button is removed; editing uses this flow
    setShowConfirm(false);
    setEmployeeSaving(true);
    try {
      if (editingEmployee) {
        const editId = editingEmployee?.userid ?? editingEmployee?.id;
        if (!editId) { toast({ variant: 'destructive', title: 'Error', description: 'Missing user id for update.' }); setEmployeeSaving(false); return; }
        await axios.patch(`${import.meta.env.VITE_API_URL}/editEmployee/${editId}`, employeeForm, { headers: { 'Authorization': `Bearer ${tokenService.getAccessToken()}` } });
        toast({ title: 'Success', description: 'Employee updated successfully' });
      } else {
        // creation blocked: do not call create endpoint
        toast({ variant: 'destructive', title: 'Not allowed', description: 'Creating new customer care users is not allowed from this dashboard.' });
      }
      setShowAddEmployee(false);
      setEditingEmployee(null);
      setEmployeeForm({ firstname: '', lastname: '', emailid: '', mobilenum: '', role: '' });
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.response?.data?.message || 'Failed to save employee' });
    } finally {
      setEmployeeSaving(false);
    }
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({ firstname: employee.firstname, lastname: employee.lastname, emailid: employee.emailid, mobilenum: employee.mobilenum, role: employee.role });
    setShowAddEmployee(true);
  };

  const openDeleteConfirm = (employee) => {
    setDeleteTarget(employee);
    setShowDeleteConfirm(true);
  };

  const performDeleteOperation = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.userid ?? deleteTarget.id;
    try {
      setEmployeeDeletingId(id);
      await axios.delete(`${import.meta.env.VITE_API_URL}/deleteEmployee/${id}`, { headers: { 'Authorization': `Bearer ${tokenService.getAccessToken()}` } });
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

  const filteredEmployees = (employeeList || []).filter((emp) => {
    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return true;
    const fullName = `${emp.firstname || ''} ${emp.lastname || ''}`.toLowerCase();
    return fullName.includes(q) || String(emp.emailid || '').toLowerCase().includes(q) || String(emp.mobilenum || '').toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pt-16">
        <div className="container mx-auto px-4 py-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <motion.h1 className="text-4xl font-bold" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>Customer Care Panel</motion.h1>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); localStorage.setItem('customerCareTab', value); }} className="space-y-8">
              <TabsList className="grid grid-cols-2 gap-4 bg-muted/50 p-1">
                <TabsTrigger value="users" className="data-[state=active]:bg-background flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="orders" className="data-[state=active]:bg-background flex flex-col sm:flex-row items-center gap-1 sm:gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="hidden sm:inline">Orders</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <h3 className="text-xl font-semibold">User Management</h3>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Input 
                          placeholder="Search by mobile or email" 
                          value={searchTerm} 
                          onChange={(e) => { setSearchTerm(e.target.value); setUsersPage(0); }} 
                          className="w-full sm:w-96" 
                        />
                        <Button 
                          onClick={() => { fetchUsers(usersPage); }} 
                          size="sm"
                          className="w-full sm:w-auto"
                        >
                          Refresh
                        </Button>
                      </div>
                    </div>

                    <div className="overflow-auto">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead>
                            <tr className="text-xs text-muted-foreground">
                              <th className="px-3 py-2 sm:px-4">ID</th>
                              <th className="px-3 py-2 sm:px-4">Name</th>
                              <th className="px-3 py-2 sm:px-4 hidden sm:table-cell">Email</th>
                              <th className="px-3 py-2 sm:px-4">Role</th>
                              <th className="px-3 py-2 sm:px-4 hidden sm:table-cell">Mobile</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {users.length === 0 && !isLoadingUsers ? (
                              <tr>
                                <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No users found</td>
                              </tr>
                            ) : (
                              users.map((u) => (
                                <tr key={u.userid} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                  <td className="px-3 py-3 sm:px-4 text-sm">{u.userid}</td>
                                  <td className="px-3 py-3 sm:px-4 text-sm">{u.firstname} {u.lastname}</td>
                                  <td className="px-3 py-3 sm:px-4 text-sm hidden sm:table-cell">{u.emailid}</td>
                                  <td className="px-3 py-3 sm:px-4 text-sm">{u.role}</td>
                                  <td className="px-3 py-3 sm:px-4 text-sm hidden sm:table-cell">{u.mobilenum}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
                      <div>
                        <p className="text-sm text-muted-foreground text-center sm:text-left">
                          Showing page {usersPage + 1}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 sm:flex-initial"
                          disabled={usersPage === 0 || isLoadingUsers} 
                          onClick={() => setUsersPage(p => Math.max(0, p - 1))}
                        >
                          Previous
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 sm:flex-initial"
                          disabled={isLoadingUsers || users.length < 1} 
                          onClick={() => setUsersPage(p => p + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>

                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="orders">
                {/* Pass allowTrackingActions=false to disable tracking buttons for CustomerCare */}
                <OrdersManagement allowTrackingActions={false} />
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default CustomerCareDashboard;
