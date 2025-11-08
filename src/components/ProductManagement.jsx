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
import { Eye, Package, RefreshCw } from 'lucide-react';

export const ProductManagement = () => {
    const { toast } = useToast();
    const [activeProducts, setActiveProducts] = useState([]);
    const [inactiveProducts, setInactiveProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null, mode: 'soft' });
    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [trackingDialog, setTrackingDialog] = useState(false);
    const [trackingId, setTrackingId] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Keep all the fetch functions and handlers from the original file...

    const ProductCard = ({ product, inactive = false }) => (
        <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
                {product.product_image1_url && (
                    <img 
                        src={product.product_image1_url} 
                        alt={product.product_title}
                        className="w-full sm:w-32 h-32 sm:h-32 object-cover rounded-lg"
                    />
                )}
                <div className="flex-1 space-y-3">
                    <div>
                        <h3 className="font-semibold text-lg mb-1">{product.product_title}</h3>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                        <p className="text-sm font-medium mt-1">${product.price}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                        {inactive ? (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRestore(product)}
                                    className="w-full sm:w-auto"
                                >
                                    Restore
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDeleteDialog({ open: true, product, mode: 'hard' })}
                                    className="w-full sm:w-auto"
                                >
                                    Delete Permanently
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setDeleteDialog({ open: true, product, mode: 'soft' })}
                                    className="w-full sm:w-auto"
                                >
                                    Deactivate
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );

    const OrderCard = ({ order }) => (
        <Card className="p-4 space-y-4">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold">#{order.order_number}</p>
                    <p className="text-sm text-muted-foreground">{order.user_email}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                }`}>
                    {order.status}
                </span>
            </div>
            <div className="text-sm space-y-1">
                <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                <p>Amount: ${order.total_amount}</p>
                {order.tracking_id && <p>Tracking: {order.tracking_id}</p>}
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(order)}
                    className="w-full sm:w-auto"
                >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setSelectedOrder(order);
                        setTrackingId(order.tracking_id || '');
                        setTrackingDialog(true);
                    }}
                    className="w-full sm:w-auto"
                >
                    <Package className="w-4 h-4 mr-2" />
                    {order.tracking_id ? 'Update Tracking' : 'Add Tracking'}
                </Button>
                {order.tracking_id && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendTrackingEmail(order.id)}
                        className="w-full sm:w-auto col-span-2 sm:col-span-1"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend Tracking
                    </Button>
                )}
            </div>
        </Card>
    );

    return (
        <div className="container mx-auto p-4 space-y-6">
            <Tabs defaultValue="active" className="w-full">
                <TabsList className="w-full justify-start overflow-auto">
                    <TabsTrigger value="active" className="flex items-center gap-2">
                        <span className="hidden sm:inline">Active Products</span>
                        <span className="sm:hidden">Active</span>
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="flex items-center gap-2">
                        <span className="hidden sm:inline">Inactive Products</span>
                        <span className="sm:hidden">Inactive</span>
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="flex items-center gap-2">
                        <span className="hidden sm:inline">Orders Management</span>
                        <span className="sm:hidden">Orders</span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-6">
                    <h2 className="text-2xl font-bold">Active Products</h2>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex-1">
                            <Input
                                type="search"
                                placeholder="Search products..."
                                className="w-full"
                                onChange={(e) => {
                                    // Add your search logic here
                                }}
                            />
                        </div>
                        <Button className="w-full sm:w-auto shrink-0">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Product
                        </Button>
                    </div>
                    {loading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[1, 2, 3].map(i => (
                                <Card key={i} className="p-4">
                                    <div className="animate-pulse space-y-4">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : activeProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {activeProducts.map(product => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 text-center">
                            <p className="text-muted-foreground">No active products found.</p>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="inactive" className="space-y-6">
                    <h2 className="text-2xl font-bold">Inactive Products</h2>
                    {loading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[1, 2].map(i => (
                                <Card key={i} className="p-4">
                                    <div className="animate-pulse space-y-4">
                                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : inactiveProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {inactiveProducts.map(product => (
                                <ProductCard key={product.id} product={product} inactive />
                            ))}
                        </div>
                    ) : (
                        <Card className="p-8 text-center">
                            <p className="text-muted-foreground">No inactive products found.</p>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="orders" className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h2 className="text-2xl font-bold">Orders Management</h2>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full sm:w-[200px]">
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

                    {/* Mobile/Tablet View for Orders */}
                    <div className="block lg:hidden">
                        {ordersLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => (
                                    <Card key={i} className="p-4">
                                        <div className="animate-pulse space-y-4">
                                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : orders.length === 0 ? (
                            <Card className="p-8 text-center">
                                <p className="text-muted-foreground">No orders found.</p>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {orders.map(order => (
                                    <OrderCard key={order.id} order={order} />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Desktop View for Orders */}
                    <div className="hidden lg:block">
                        <Card className="p-4">
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
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    <div className="flex justify-center">
                                                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : orders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-8">
                                                    No orders found
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
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setSelectedOrder(order)}
                                                            >
                                                                View
                                                            </Button>
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
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                        <p className="text-sm text-muted-foreground order-2 sm:order-1">
                            Page {currentPage} of {totalPages}
                        </p>
                        <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="flex-1 sm:flex-initial"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="flex-1 sm:flex-initial"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Keep all the existing dialogs */}
            <AlertDialog 
                open={deleteDialog.open} 
                onOpenChange={(open) => !open && setDeleteDialog({ open: false, product: null, mode: 'soft' })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteDialog.mode === 'hard' ? 'Permanently Delete Product' : 'Deactivate Product'}
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
                <DialogContent className="sm:max-w-md">
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
                        <div className="flex justify-end gap-2">
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

            {selectedOrder && (
                <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Order Details</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Order Information</h4>
                                    <p>Order Number: {selectedOrder.order_number}</p>
                                    <p>Date: {new Date(selectedOrder.created_at).toLocaleString()}</p>
                                    <p>Status: {selectedOrder.status}</p>
                                    <p>Total Amount: ${selectedOrder.total_amount}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Customer Information</h4>
                                    <p>Email: {selectedOrder.user_email}</p>
                                    <p>Shipping Address: {selectedOrder.shipping_address}</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Items</h4>
                                <div className="space-y-2">
                                    {selectedOrder.items?.map((item, index) => (
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
            )}
        </div>
    );
};

export default ProductManagement;