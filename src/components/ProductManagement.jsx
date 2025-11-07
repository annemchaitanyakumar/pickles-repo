import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { tokenService } from '@/services/tokenService';

export const ProductManagement = () => {
    const { toast } = useToast();
    const [activeProducts, setActiveProducts] = useState([]);
    const [inactiveProducts, setInactiveProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null, mode: 'soft' });
    
    // Orders management state
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [trackingDialog, setTrackingDialog] = useState(false);
    const [trackingId, setTrackingId] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            // Fetch active products
            const activeResponse = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            // Fetch inactive products
            const inactiveResponse = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/inactive/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!activeResponse.ok || !inactiveResponse.ok) {
                throw new Error('Failed to fetch products');
            }

            const activeData = await activeResponse.json();
            const inactiveData = await inactiveResponse.json();

            // Ensure image URLs are usable for both active and inactive lists
            const makePresignedForList = async (list) => {
                const items = list || [];
                // find those without fully qualified http(s) urls
                const need = items.filter(p => !(p.product_image1_url && typeof p.product_image1_url === 'string' && p.product_image1_url.startsWith('http')));
                if (!need.length) return items;

                const promises = need.map(p => fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${p.id}/presigned-urls/`).then(r => r.ok ? r.json() : null).catch(() => null));
                const results = await Promise.allSettled(promises);

                const idTo = {};
                results.forEach((res, i) => {
                    const pid = need[i]?.id;
                    idTo[pid] = res.status === 'fulfilled' && res.value ? res.value : null;
                });

                return items.map(p => {
                    const urls = idTo[p.id];
                    if (urls && (urls.product_image1_url || urls.image1_url)) {
                        return { ...p, product_image1_url: urls.product_image1_url || urls.image1_url };
                    }
                    // fallback: keep existing url if any, else placeholder
                    return { ...p, product_image1_url: p.product_image1_url || '/placeholder.png' };
                });
            };

            const activeList = await makePresignedForList(activeData.results || activeData || []);
            const inactiveList = await makePresignedForList(inactiveData.results || inactiveData || []);

            setActiveProducts(activeList);
            setInactiveProducts(inactiveList);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async (page = 1) => {
        setOrdersLoading(true);
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const statusQuery = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
            const response = await fetch(
                `${import.meta.env.VITE_DJANGO_URL}/orders/?page=${page}${statusQuery}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to fetch orders');

            const data = await response.json();
            setOrders(data.results || []);
            setTotalPages(Math.ceil((data.count || 0) / 10));
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleUpdateTracking = async () => {
        if (!selectedOrder || !trackingId.trim()) return;

        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(
                `${import.meta.env.VITE_DJANGO_URL}/orders/${selectedOrder.id}/tracking/`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ tracking_id: trackingId }),
                }
            );

            if (!response.ok) throw new Error('Failed to update tracking');

            toast({
                title: "Success",
                description: "Tracking ID updated successfully"
            });

            setTrackingDialog(false);
            fetchOrders(currentPage);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    const handleResendTrackingEmail = async (orderId) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(
                `${import.meta.env.VITE_DJANGO_URL}/orders/${orderId}/resend-tracking/`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) throw new Error('Failed to resend tracking email');

            toast({
                title: "Success",
                description: "Tracking email sent successfully"
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        fetchOrders(currentPage);
    }, [currentPage, statusFilter]);

    const handleDeactivate = async (product) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${product.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

                // Status 204 is a success response for DELETE
                if (response.status === 204 || response.ok) {
                    toast({
                        title: "Success",
                        description: "Product deactivated successfully"
                    });
                    await fetchProducts(); // Refresh the product lists
                } else {
                    throw new Error('Failed to deactivate product');
                }
        } catch (error) {
                console.error('Deactivation error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                    description: error.message || 'Failed to deactivate product'
            });
        }
    };

    const handleRestore = async (product) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${product.id}/restore/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to restore product');

            toast({
                title: "Success",
                description: "Product restored successfully"
            });

            fetchProducts();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    const handleHardDelete = async (product) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${product.id}/hard-delete/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to delete product');

            toast({
                title: "Success",
                description: "Product deleted permanently"
            });

            setDeleteDialog({ open: false, product: null, mode: 'soft' });
            fetchProducts();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    const ProductCard = ({ product, inactive = false }) => (
        <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">{product.product_title}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                </div>
                {product.product_image1_url && (
                    <img 
                        src={product.product_image1_url} 
                        alt={product.product_title}
                        className="w-16 h-16 object-cover rounded"
                    />
                )}
            </div>
            <div className="space-x-2">
                {inactive ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(product)}
                        >
                            Restore
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialog({ 
                                open: true, 
                                product, 
                                mode: 'hard'
                            })}
                        >
                            Delete Permanently
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ 
                            open: true, 
                            product, 
                            mode: 'soft'
                        })}
                    >
                        Deactivate
                    </Button>
                )}
            </div>
        </Card>
    );

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Tabs defaultValue="active">
                <TabsList className="mb-4">
                    <TabsTrigger value="active">Active Products</TabsTrigger>
                    <TabsTrigger value="inactive">Inactive Products</TabsTrigger>
                    <TabsTrigger value="orders">Orders</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    {loading ? (
                        <p>Loading active products...</p>
                    ) : activeProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product}
                                />
                            ))}
                        </div>
                    ) : (
                        <p>No active products found.</p>
                    )}
                </TabsContent>

                <TabsContent value="inactive" className="space-y-4">
                    {loading ? (
                        <p>Loading inactive products...</p>
                    ) : inactiveProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inactiveProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product}
                                    inactive
                                />
                            ))}
                        </div>
                    ) : (
                        <p>No inactive products found.</p>
                    )}
                </TabsContent>

                <TabsContent value="orders" className="space-y-4">
                    <Card className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Orders</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ordersLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center">
                                                Loading orders...
                                            </TableCell>
                                        </TableRow>
                                    ) : orders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center">
                                                No orders found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        orders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell>{order.order_number}</TableCell>
                                                <TableCell>{order.user_email}</TableCell>
                                                <TableCell>
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {order.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>${order.total_amount}</TableCell>
                                                <TableCell>
                                                    <div className="flex space-x-2">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => setSelectedOrder(order)}
                                                                >
                                                                    View
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-2xl">
                                                                <DialogHeader>
                                                                    <DialogTitle>Order Details</DialogTitle>
                                                                </DialogHeader>
                                                                <div className="grid gap-4 py-4">
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div>
                                                                            <h4 className="font-semibold mb-2">Order Information</h4>
                                                                            <p>Order Number: {selectedOrder?.order_number}</p>
                                                                            <p>Date: {new Date(selectedOrder?.created_at).toLocaleString()}</p>
                                                                            <p>Status: {selectedOrder?.status}</p>
                                                                            <p>Total Amount: ${selectedOrder?.total_amount}</p>
                                                                        </div>
                                                                        <div>
                                                                            <h4 className="font-semibold mb-2">Customer Information</h4>
                                                                            <p>Email: {selectedOrder?.user_email}</p>
                                                                            <p>Shipping Address: {selectedOrder?.shipping_address}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 className="font-semibold mb-2">Items</h4>
                                                                        <div className="space-y-2">
                                                                            {selectedOrder?.items?.map((item, index) => (
                                                                                <div key={index} className="flex justify-between">
                                                                                    <span>{item.product_title} x {item.quantity}</span>
                                                                                    <span>${item.price * item.quantity}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedOrder(order);
                                                                setTrackingId(order.tracking_id || '');
                                                                setTrackingDialog(true);
                                                            }}
                                                        >
                                                            {order.tracking_id ? 'Update Tracking' : 'Add Tracking'}
                                                        </Button>

                                                        {order.tracking_id && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleResendTrackingEmail(order.id)}
                                                            >
                                                                Resend Tracking
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

                        <div className="flex justify-between items-center mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <span>
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog 
                open={deleteDialog.open} 
                onOpenChange={(open) => !open && setDeleteDialog({ open: false, product: null, mode: 'soft' })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteDialog.mode === 'hard' 
                                ? 'Permanently Delete Product' 
                                : 'Deactivate Product'
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteDialog.mode === 'hard'
                                ? 'This action cannot be undone. This will permanently delete the product.'
                                : 'This will deactivate the product. You can restore it later.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteDialog.mode === 'hard') {
                                    handleHardDelete(deleteDialog.product);
                                } else {
                                    handleDeactivate(deleteDialog.product);
                                    setDeleteDialog({ open: false, product: null, mode: 'soft' });
                                }
                            }}
                            className={deleteDialog.mode === 'hard' ? 'bg-destructive' : ''}
                        >
                            {deleteDialog.mode === 'hard' ? 'Delete Permanently' : 'Deactivate'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={trackingDialog} onOpenChange={setTrackingDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {selectedOrder?.tracking_id ? 'Update Tracking ID' : 'Add Tracking ID'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Input
                                placeholder="Enter tracking ID"
                                value={trackingId}
                                onChange={(e) => setTrackingId(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end space-x-2">
                            <Button
                                variant="outline"
                                onClick={() => setTrackingDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateTracking}>
                                {selectedOrder?.tracking_id ? 'Update' : 'Add'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductManagement;
