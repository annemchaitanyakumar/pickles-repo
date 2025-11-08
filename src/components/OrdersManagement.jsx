import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Truck,
  SendHorizontal,
  Edit,
} from "lucide-react";
import { format } from "date-fns";
import axios, { Django_Promo_BASE } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import DownloadInvoiceButton from "./DownloadInvoiceButton";

function OrdersManagement({ allowTrackingActions = true }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewOrderDialog, setViewOrderDialog] = useState(false);
  const [trackingDialog, setTrackingDialog] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [statusSelect, setStatusSelect] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const pageSize = 10;
  const { toast } = useToast();
  const { user } = useAuth();

  // Robust admin check: handles strings like "ADMIN", "ROLE_ADMIN", arrays or authority objects
  const isAdminUser = (() => {
    if (!user) return false;
    const candidate = user.role ?? user.roles ?? user.authorities ?? "";

    if (Array.isArray(candidate)) {
      return candidate.some((r) => {
        if (!r) return false;
        if (typeof r === "string") return r.toUpperCase().includes("ADMIN");
        if (typeof r === "object") {
          const v = r.authority || r.role || r.name || r;
          return String(v).toUpperCase().includes("ADMIN");
        }
        return false;
      });
    }

    const s = String(candidate || "").trim();
    if (!s) return false;
    if (s.toUpperCase().startsWith("ROLE_")) return s.toUpperCase().includes("ADMIN");
    return s.toUpperCase() === "ADMIN" || s.toUpperCase().includes("ADMIN");
  })();

  useEffect(() => {
    fetchOrders(1);
  }, []);

  const fetchOrders = async (page) => {
    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/?page=${page}&page_size=${pageSize}`);
      setOrders(response.data.results);
      setTotalPages(response.data.pagination.total_pages);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch orders. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/${orderId}/view/`);
      setSelectedOrder(response.data);
      setViewOrderDialog(true);
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch order details.",
      });
    }
  };

  const handleUpdateTracking = async () => {
    if (!trackingId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a tracking ID",
      });
      return;
    }

    try {
      setUpdatingTracking(true);
      await axios.patch(`${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/${selectedOrder.orderid}/tracking/`, {
        tracking_id: trackingId,
      });
      toast({
        title: "Success",
        description: "Tracking ID updated and email sent to customer.",
      });
      setTrackingDialog(false);
      fetchOrders(currentPage); // Refresh list
    } catch (error) {
      console.error("Error updating tracking:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update tracking ID.",
      });
    } finally {
      setUpdatingTracking(false);
    }
  };

  const handleResendEmail = async (orderId) => {
    try {
      setResendingEmail(true);
      await axios.post(`${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/${orderId}/resend-tracking-email/`);
      toast({
        title: "Success",
        description: "Tracking email resent successfully.",
      });
    } catch (error) {
      console.error("Error resending email:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to resend tracking email.",
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleUpdatePaymentStatus = async () => {
    if (!editingOrderId) return;
    const newStatus = (statusSelect || "").trim();
    if (!newStatus) {
      toast({ variant: "destructive", title: "Error", description: "Please select a status" });
      return;
    }

    try {
      setUpdatingStatus(true);
      const resp = await axios.patch(
        `${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/${editingOrderId}/payment-status/`,
        { payment_status: newStatus }
      );

      // backend returns updated order at resp.data.order if available
      const updated = (resp && resp.data && resp.data.order) ? resp.data.order : null;

      // Update local orders list
      setOrders((prev) => prev.map((o) => (o.orderid === editingOrderId ? (updated || { ...o, payment_status: newStatus }) : o)));

      // If the selectedOrder is the one edited, update it too
      setSelectedOrder((prev) => (prev && prev.orderid === editingOrderId ? (updated || { ...prev, payment_status: newStatus }) : prev));

      toast({ title: "Success", description: "Payment status updated" });
      setStatusDialog(false);
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update payment status" });
    } finally {
      setUpdatingStatus(false);
      setEditingOrderId(null);
    }
  };

  const handleOrderSearch = async () => {
    const q = (orderSearch || '').trim();
    if (!q) {
      // if empty, restore paginated list
      fetchOrders(1);
      return;
    }

    // validate numeric id
    if (!/^[0-9]+$/.test(q)) {
      toast({ variant: 'destructive', title: 'Invalid ID', description: 'Please enter a numeric Order ID' });
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${import.meta.env.VITE_DJANGO_PROMO_URL}/orders/${q}/view/`);
      // Show single result
      setOrders([response.data]);
      setTotalPages(1);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error searching order:', error);
      toast({ variant: 'destructive', title: 'Not found', description: 'No order found with that ID' });
      // clear results
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-search: debounce orderSearch and trigger search for numeric IDs
  useEffect(() => {
    const q = (orderSearch || '').trim();
    const timer = setTimeout(() => {
      if (q === '') {
        // restore paginated list when input cleared
        fetchOrders(1);
      } else if (/^[0-9]+$/.test(q)) {
        // only trigger search for numeric order ids
        handleOrderSearch();
      }
      // ignore non-numeric input while typing to avoid repeated toasts
    }, 400);

    return () => clearTimeout(timer);
  }, [orderSearch]);

  const formatCurrency = (amount) => {
    if (!amount) return "₹0.00";
    const value = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value / 100);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return format(new Date(parseInt(timestamp)), "dd MMM yyyy HH:mm:ss");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4 sm:mb-0">Orders</h2>
            <div className="w-full sm:w-96">
              <Input
                placeholder="Search by Order ID"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleOrderSearch();
                  }
                }}
                className="w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="block sm:hidden">
                {/* Mobile view */}
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.orderid} className="bg-white rounded-lg shadow p-4 border">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">#{order.orderid}</div>
                          <div className="text-sm text-gray-500">{formatDate(order.created_time)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                              order.payment_status === "SUCCESS"
                                ? "bg-green-100 text-green-800"
                                : order.payment_status === "FAILED"
                                ? "bg-red-100 text-red-800"
                                : order.payment_status === "PROCESSING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {order.payment_status}
                          </span>
                          {isAdminUser && (
                            <button
                              onClick={() => {
                                setEditingOrderId(order.orderid);
                                setStatusSelect(order.payment_status || "");
                                setStatusDialog(true);
                              }}
                              aria-label={`Edit status for order ${order.orderid}`}
                              className="p-1 text-gray-600 hover:text-gray-900">
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="font-medium">{order.customer_name}</div>
                        {order.address && (
                          <div className="text-sm text-gray-500">
                            {order.address.city}, {order.address.state}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center mb-3">
                        <div className="text-sm">
                          <span className="text-gray-500">Amount:</span>{" "}
                          <span className="font-medium">{formatCurrency(order.total_amount_paid)}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Tracking:</span>{" "}
                          <span className="font-medium">{order.tracking_id || "Not set"}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrder(order.orderid)}
                          className="flex-1"
                        >
                          View Details
                        </Button>

                        {allowTrackingActions && order.payment_status === "SUCCESS" && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedOrder(order);
                                setTrackingId(order.tracking_id || "");
                                setTrackingDialog(true);
                              }}
                            >
                              <Truck className="h-4 w-4" />
                            </Button>

                            {order.tracking_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendEmail(order.orderid)}
                                disabled={resendingEmail}
                              >
                                <SendHorizontal className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}

                        {isAdminUser && order.payment_status === "SUCCESS" && (
                          <DownloadInvoiceButton order={order} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop view */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.orderid}>
                        <TableCell className="font-medium">#{order.orderid}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{order.customer_name}</span>
                            {order.address && (
                              <span className="text-xs text-gray-500">
                                {order.address.city}, {order.address.state}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(order.created_time)}</TableCell>
                        <TableCell>{formatCurrency(order.total_amount_paid)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                                order.payment_status === "SUCCESS"
                                  ? "bg-green-100 text-green-800"
                                  : order.payment_status === "FAILED"
                                  ? "bg-red-100 text-red-800"
                                  : order.payment_status === "PROCESSING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {order.payment_status}
                            </span>

                            {/* Pencil / edit status */}
                            {isAdminUser && (
                              <button
                                onClick={() => {
                                  setEditingOrderId(order.orderid);
                                  setStatusSelect(order.payment_status || "");
                                  setStatusDialog(true);
                                }}
                                aria-label={`Edit status for order ${order.orderid}`}
                                className="p-0 text-gray-600 hover:text-gray-900">
                                <Edit className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.tracking_id ? (
                            <span className="text-sm text-gray-600">
                              {order.tracking_id}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isAdminUser && order.payment_status === "SUCCESS" && (
                            <DownloadInvoiceButton order={order} />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order.orderid)}
                            >
                              View
                            </Button>

                            {/* Only show tracking actions for successful orders if allowed */}
                            {allowTrackingActions && order.payment_status === "SUCCESS" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setTrackingId(order.tracking_id || "");
                                    setTrackingDialog(true);
                                  }}
                                >
                                  <Truck className="h-4 w-4" />
                                </Button>

                                {order.tracking_id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResendEmail(order.orderid)}
                                    disabled={resendingEmail}
                                  >
                                    <SendHorizontal className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination - shown for both mobile and desktop */}
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
                <p className="text-sm text-muted-foreground order-2 sm:order-1">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center justify-center gap-2 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => currentPage > 1 && fetchOrders(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-24 sm:w-auto"
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span className="hidden sm:flex px-4 py-2 bg-gray-100 rounded-md text-sm min-w-[80px] items-center justify-center">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      currentPage < totalPages && fetchOrders(currentPage + 1)
                    }
                    disabled={currentPage === totalPages}
                    className="w-24 sm:w-auto"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={viewOrderDialog} onOpenChange={setViewOrderDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details #{selectedOrder?.orderid}</DialogTitle>
            <DialogDescription>
              {selectedOrder?.payment_status === "SUCCESS" ? (
                <span className="text-green-600">Payment Successful</span>
              ) : selectedOrder?.payment_status === "FAILED" ? (
                <span className="text-red-600">Payment Failed</span>
              ) : (
                <span className="text-yellow-600">Payment Pending</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Customer Details</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      {selectedOrder.customer_name}
                    </p>
                    <p className="text-gray-600">
                      {selectedOrder.customer_email}
                    </p>
                    {selectedOrder.address && (
                      <>
                        <p className="text-gray-600 pt-2">
                          <span className="font-medium text-gray-900">Address:</span>
                        </p>
                        <p className="text-gray-600">
                          {selectedOrder.address.street_address}
                        </p>
                        <p className="text-gray-600">
                          {selectedOrder.address.city}, {selectedOrder.address.state}
                        </p>
                        <p className="text-gray-600">
                          PIN: {selectedOrder.address.pin_code}
                        </p>
                        <p className="text-gray-600">
                          Mobile: {selectedOrder.address.mobile_number}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Order Information</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-600">Date:</span>{" "}
                      {formatDate(selectedOrder.created_time)}
                    </p>
                    <p>
                      <span className="text-gray-600">Status:</span>{" "}
                      {selectedOrder.payment_status}
                    </p>
                    <p>
                      <span className="text-gray-600">Tracking:</span>{" "}
                      {selectedOrder.tracking_id || "Not set"}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">Amount Details</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-600">Subtotal:</span>{" "}
                      {formatCurrency(JSON.parse(selectedOrder.product_list || "[]").reduce((sum, product) => 
                        sum + (product.productPrice || product.price) * product.quantity, 0
                      ))}
                    </p>
                    {selectedOrder.discounted_amount > 0 && (
                      <p className="text-green-600">
                        <span className="text-gray-600">Discount:</span>{" "}
                        -{formatCurrency(selectedOrder.discounted_amount)}
                      </p>
                    )}
                    <p>
                      <span className="text-gray-600">GST:</span>{" "}
                      {formatCurrency(selectedOrder.gst)}
                    </p>
                    {selectedOrder.container_charges > 0 && (
                      <p>
                        <span className="text-gray-600">Container Charges:</span>{" "}
                        {formatCurrency(selectedOrder.container_charges)}
                      </p>
                    )}
                    {selectedOrder.shipping_charges > 0 ? (
                      <p>
                        <span className="text-gray-600">Shipping:</span>{" "}
                        {formatCurrency(selectedOrder.shipping_charges)}
                      </p>
                    ) : (
                      <p>
                        <span className="text-gray-600">Shipping:</span>{" "}
                        Free
                      </p>
                    )}
                    <p className="font-medium">
                      <span className="text-gray-600">Total:</span>{" "}
                      {formatCurrency(selectedOrder.total_amount_paid)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Products</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-center">Weight</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {JSON.parse(selectedOrder.product_list || "[]").map(
                        (product, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              {product.productName || product.name}
                            </TableCell>
                            <TableCell className="text-center">
                              {product.quantity}
                            </TableCell>
                            <TableCell className="text-center">
                              {product.weight}g
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(
                                product.productPrice || product.price
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(
                                (product.productPrice || product.price) *
                                  product.quantity
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Status Update Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>
              Change payment status for order #{editingOrderId}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="payment_status" className="text-sm font-medium">
                Payment Status
              </label>
              <Select value={statusSelect} onValueChange={(v) => setStatusSelect(v)}>
                <SelectTrigger id="payment_status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUCCESS">SUCCESS</SelectItem>
                  <SelectItem value="FAILED">FAILED</SelectItem>
                  <SelectItem value="REFUNDED">REFUNDED</SelectItem>
                  <SelectItem value="EXPIRED">EXPIRED</SelectItem>
                  <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setStatusDialog(false); setEditingOrderId(null); }} disabled={updatingStatus}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePaymentStatus} disabled={updatingStatus} className="ml-2">
              {updatingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Update Dialog */}
      <Dialog open={trackingDialog} onOpenChange={setTrackingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Tracking</DialogTitle>
            <DialogDescription>
              Enter tracking details for order #{selectedOrder?.orderid}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="tracking" className="text-sm font-medium">
                Tracking ID
              </label>
              <Input
                id="tracking"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTrackingDialog(false)}
              disabled={updatingTracking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateTracking}
              disabled={updatingTracking}
              className="ml-2"
            >
              {updatingTracking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update & Send Email"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OrdersManagement;