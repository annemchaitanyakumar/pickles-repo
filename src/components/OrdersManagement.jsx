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
} from "lucide-react";
import { format } from "date-fns";
import axios, { Django_Promo_BASE } from "@/lib/axios";

function OrdersManagement() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewOrderDialog, setViewOrderDialog] = useState(false);
  const [trackingDialog, setTrackingDialog] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const pageSize = 10;
  const { toast } = useToast();

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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Orders</h2>
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => currentPage > 1 && fetchOrders(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 bg-gray-100 rounded-md text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    currentPage < totalPages && fetchOrders(currentPage + 1)
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
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
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                            order.payment_status === "SUCCESS"
                              ? "bg-green-100 text-green-800"
                              : order.payment_status === "FAILED"
                              ? "bg-red-100 text-red-800"
                              : order.payment_status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {order.payment_status}
                        </span>
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
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewOrder(order.orderid)}
                          >
                            View
                          </Button>

                          {/* Only show tracking actions for successful orders */}
                          {order.payment_status === "SUCCESS" && (
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
                    {/* <p>
                      <span className="text-gray-600">Subtotal:</span>{" "}
                      {formatCurrency(selectedOrder.subtotal)}
                    </p> */}
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