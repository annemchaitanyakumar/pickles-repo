import React, { useState, useEffect, useMemo, forwardRef } from "react";
import { format } from "date-fns";
import * as Separator from "@radix-ui/react-separator";

const OrderInvoice = forwardRef(({ order, products, address }, ref) => {

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Validate data
  useEffect(() => {
    if (!order || !products || !address) {
      setError("Missing required data");
      return;
    }
    setIsLoading(false);
  }, [order, products, address]);

  // ✅ Memoized calculation (prevents render crashes)
  const values = useMemo(() => {
    if (!order) return null;
    try {
      // Calculate subtotal from products list
      const subtotal = products.reduce((sum, product) => 
        sum + ((parseFloat(product.unitPrice || product.productPrice || product.price || 0)) * product.quantity), 0) / 100;

      const gstPercentage = 9;
      const discountAmount =
        parseFloat(order?.discounted_amount ?? 0) / 100;

      const postDiscountAmount = subtotal - discountAmount;
      const gstAmount = (postDiscountAmount * gstPercentage) / 100;

      const containerCharges =
        parseFloat(order?.container_charges ?? 0) / 100;

      const shippingCharges =
        parseFloat(order?.shipping_charges ?? 0) / 100;

      const orderValueBeforeShipping =
        subtotal - discountAmount + gstAmount + containerCharges;

      const total = parseFloat(order?.total_amount_paid ?? 0) / 100;

      return {
        subtotal,
        discountAmount,
        gstPercentage,
        gstAmount,
        containerCharges,
        shippingCharges,
        orderValueBeforeShipping,
        total,
      };
    } catch (err) {
      console.error("Error calculating invoice values:", err);
      return null;
    }
  }, [order]);

  // ✅ Always attach ref no matter what
  if (error) {
    return (
      <div ref={ref} className="p-4 text-red-500">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div ref={ref} className="p-4">
        Loading invoice...
      </div>
    );
  }

  if (!values) {
    return (
      <div ref={ref} className="p-4 text-red-500">
        Error calculating invoice values
      </div>
    );
  }

  return (
    <div ref={ref} className="bg-[#FBF6EE] min-h-screen">
      <div className="bg-[#FBF6EE] w-full max-w-[800px] mx-auto px-8 py-6 relative">

        {/* Logo */}
        <div className="flex justify-center items-center">
          <img
            src="/HT_Pickles.Logo.png"
            alt="Homely Taste Logo"
            className="w-24 h-24 object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/logo.png";
            }}
          />
        </div>

        <div className="text-center mt-2">
          <h1 className="text-[#955A1A] text-2xl font-bold tracking-wide">
            Homely Taste
          </h1>
          <p className="text-xs text-gray-600">Premium Pickles</p>
        </div>

        {/* Address + Invoice Info */}
        <div className="flex justify-between mt-6">
          <div>
            <p className="text-[#002C59] font-bold text-sm">ADDRESS:</p>
            <p className="text-[#955A1A] font-bold text-lg">
              {address.firstName} {address.lastName}
            </p>
            <p className="text-[#955A1A] text-xs">{address.streetAddress}</p>
            <p className="text-[#955A1A] text-xs">
              {address.city}, {address.state} {address.pinCode}
            </p>
            <div className="mt-2 text-xs text-[#955A1A]">
              <p>Mobile : {address.mobileNumber}</p>
              <p>Email : {order.email}</p>
            </div>
          </div>

          <div className="text-right text-xs">
            <p>
              <span className="font-bold text-black">INVOICE NO:</span> #
              {order.orderid}
            </p>
            <p>
              <span className="font-bold text-black">DATE:</span>{" "}
              {format(new Date(order.createdTime), "dd/MM/yyyy")}
            </p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-center text-[#955A1A] text-2xl font-extrabold mt-6">
          INVOICE
        </h2>

        {/* Product Table */}
        <table className="w-full mt-4 border-t border-gray-300 text-[#955A1A]">
          <thead>
            <tr className="text-left font-bold">
              <th className="py-2 w-1/6">SL NO</th>
              <th className="py-2 w-2/6">ITEM DESCRIPTION</th>
              <th className="py-2 w-1/6">QUANTITY</th>
              <th className="py-2 w-1/6 text-right">PRICE</th>
            </tr>
          </thead>

          <tbody className="text-gray-700">
            {products.map((product, index) => (
              <tr key={index} className="border-t border-gray-300">
                <td className="py-2">{index + 1}</td>
                <td className="py-2">
                  {product.product_name}
                  <br />
                  <span className="text-sm text-gray-500">
                    {product.weight}g
                  </span>
                </td>
                <td className="py-2">{product.quantity}pcs</td>
                <td className="py-2 text-right">
                  ₹{(parseFloat(product.unitPrice || 0) / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Separator */}
        <div className="my-6">
          <Separator.Root className="bg-gray-300 h-px w-full" decorative />
        </div>

        {/* Summary */}
        <div className="mt-4 flex justify-end">
          <table className="text-right text-gray-700 w-64">
            <tbody>
              <tr>
                <td className="py-1">SUB TOTAL</td>
                <td className="py-1">₹{values.subtotal.toFixed(2)}</td>
              </tr>

              <tr>
                <td className="py-1">DISCOUNT</td>
                <td className="py-1 text-green-600">
                  -₹{values.discountAmount.toFixed(2)}
                </td>
              </tr>

              <tr>
                <td className="py-1">GST ({values.gstPercentage}%)</td>
                <td className="py-1">₹{values.gstAmount.toFixed(2)}</td>
              </tr>

              {values.containerCharges > 0 && (
                <tr>
                  <td className="py-1">CONTAINER CHARGES</td>
                  <td className="py-1">
                    ₹{values.containerCharges.toFixed(2)}
                  </td>
                </tr>
              )}

              <tr>
                <td className="py-1">
                  SHIPPING{values.shippingCharges === 0 ? " (Free)" : ""}
                </td>
                <td className="py-1">
                  ₹{values.shippingCharges.toFixed(2)}
                </td>
              </tr>

              <tr className="font-bold border-t border-gray-300">
                <td className="py-2">TOTAL</td>
                <td className="py-2">₹{values.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <p className="text-[#955A1A] italic font-semibold text-base text-center">
            Thank you for your purchase!
          </p>
        </div>

        {/* Contact */}
        <div className="mt-6 text-xs text-gray-700 space-y-1">
          <p>📞 +91 123-456-7890</p>
          <p>🌐 www.homelytaste.com</p>
          <p>✉️ contact@homelytaste.com</p>
          <p>📍 Your Business Address Here</p>
        </div>
      </div>
    </div>
  );
});

OrderInvoice.displayName = "OrderInvoice";

export default OrderInvoice;
