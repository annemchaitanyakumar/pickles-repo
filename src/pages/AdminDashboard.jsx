import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils.js';
import '../styles/animations.css';
// Navbar and Footer are provided by MainLayout
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Package,
  ShoppingBag,
  Settings,
  Activity,
  TrendingUp,
  DollarSign,
  Calendar,
  Bell,
  Plus,
  X
} from 'lucide-react';
import { AddProductForm } from '@/components/AddProductForm';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { tokenService } from '@/services/tokenService';
import { djangoService } from '@/services/djangoService';

const AdminDashboard = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("orders");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(12);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

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
        const errorData = (await activeResp.json().catch(()=>null)) || (await inactiveResp.json().catch(()=>null));
        throw new Error(errorData?.detail || 'Failed to fetch products');
      }

      const activeData = await activeResp.json();
      const inactiveData = await inactiveResp.json();

      const activeList = (activeData.results || activeData || []).map(p => ({...p, is_active: true}));
      const inactiveList = (inactiveData.results || inactiveData || []).map(p => ({...p, is_active: false}));

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

  // Effect to fetch products when the tab changes to products
  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    }
  }, [activeTab]);

  const filteredProducts = products.filter(p => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return (p.product_title || '').toLowerCase().includes(q) || (p.product_name || '').toLowerCase().includes(q);
  });

  const pagedProducts = filteredProducts.slice((page - 1) * perPage, page * perPage);

  // Placeholder data - you'll need to replace these with actual API calls
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    revenue: 0,
    recentOrders: [
      { id: 1, customer: 'John Doe', amount: 150, status: 'Completed' },
      { id: 2, customer: 'Jane Smith', amount: 89, status: 'Processing' },
      { id: 3, customer: 'Bob Johnson', amount: 245, status: 'Pending' }
    ]
  });

  useEffect(() => {
    // TODO: Fetch actual statistics from your backend
    const fetchStats = async () => {
      try {
        // Placeholder data - replace with actual API calls
        setStats({
          totalUsers: 150,
          totalOrders: 1250,
          totalProducts: 75,
          revenue: 45231,
          recentOrders: [
            { id: 1, customer: 'John Doe', amount: 150, status: 'Completed' },
            { id: 2, customer: 'Jane Smith', amount: 89, status: 'Processing' },
            { id: 3, customer: 'Bob Johnson', amount: 245, status: 'Pending' }
          ]
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch dashboard statistics",
          variant: "destructive"
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pt-16"> {/* Add padding top to prevent navbar overlap */}
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <motion.h1 
                className="text-4xl font-bold"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                Product Management
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex space-x-2"
              >
                <Button size="sm" variant="outline">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </Button>
                <Button size="sm" variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Today
                </Button>
              </motion.div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="grid grid-cols-5 gap-4 bg-muted/50 p-1">
                <TabsTrigger value="overview" className="data-[state=active]:bg-background">
                  <Activity className="w-4 h-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-background">
                  <Users className="w-4 h-4 mr-2" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="orders" className="data-[state=active]:bg-background">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="products" className="data-[state=active]:bg-background">
                  <Package className="w-4 h-4 mr-2" />
                  Products
                </TabsTrigger>
                <TabsTrigger value="settings" className="data-[state=active]:bg-background">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Total Users</p>
                        <h3 className="text-2xl font-bold">{stats.totalUsers}</h3>
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
                        <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
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
                        <h3 className="text-2xl font-bold">{stats.totalProducts}</h3>
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
                        <h3 className="text-2xl font-bold">$45,231</h3>
                      </div>
                      <Activity className="w-8 h-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">User Management</h3>
                  {/* Add user management UI here */}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="orders">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-4">Order Management</h3>
                  {/* Add order management UI here */}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="products">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div className="w-full sm:w-2/3 flex items-center gap-3">
                        <h3 className="text-xl font-semibold">Product Management</h3>
                        <Input
                          placeholder="Search products by title or name"
                          value={searchTerm}
                          onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                          className="ml-4 w-full sm:w-1/2"
                        />
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button onClick={() => { setEditProduct(null); setShowAddProduct(true); }} className="bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Product
                        </Button>
                      </div>
                    </div>

                    <>
                      <Dialog open={showAddProduct} onOpenChange={(open) => { if (!open) setEditProduct(null); setShowAddProduct(open); }}>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>{editProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                          </DialogHeader>
                          <div className="pt-2">
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
                          <DialogFooter />
                        </DialogContent>
                      </Dialog>
                      {!showAddProduct && (
                      <div className="staggered-animation">
                        <ScrollArea className="h-[700px]">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
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
                                    {(product.variants || []).slice(0,2).map((v, idx) => (
                                      <span key={idx} className="px-2 py-1 bg-white/80 text-xs rounded-md font-medium">
                                        {v.weight}{v.unit ?? 'g'} • ₹{v.price}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                
                                <div className="p-4 space-y-4">
                                  <div>
                                    <h3 className="text-lg font-semibold tracking-tight mb-1">
                                      {product.product_title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {product.product_description}
                                    </p>
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
                                      onClick={async () => {
                                        if (!confirm('Permanently delete this product? This action cannot be undone.')) return;
                                        setDeletingId(product.id);
                                        try {
                                          // Hard delete (permanent)
                                          await djangoService.hardDeleteProduct(product.id);

                                          toast({
                                            title: 'Deleted',
                                            description: 'Product permanently deleted',
                                          });

                                          // Refresh product list / invalidate cache
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

                                          // If item already removed on server, refresh the list to sync UI
                                          if (isNotFound) {
                                            if (typeof mutate === 'function') mutate();
                                            else fetchProducts && fetchProducts();
                                          }
                                        } finally {
                                          setDeletingId(null);
                                        }
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
                  <h3 className="text-xl font-semibold mb-4">Admin Settings</h3>
                  {/* Add settings UI here */}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
        </div>
      </main>
      
      <Toaster />
    </div>
  );
};

export default AdminDashboard;
