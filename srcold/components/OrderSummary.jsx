import { Truck } from 'lucide-react';

export const OrderSummary = ({ 
  subtotal, 
  containerCharges, 
  shipping, 
  taxInfo, 
  total 
}) => {
  if (!taxInfo) {
    return (
      <div className="text-center p-4">
        Loading tax information...
      </div>
    );
  }
  const tax = (subtotal * taxInfo.gstPercentage) / 100;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span>Subtotal (excl. container fees)</span>
        <span>₹{subtotal.toFixed(2)}</span>
      </div>
      
      {containerCharges > 0 && (
        <div className="flex justify-between text-sm">
          <span>Container Charges</span>
          <span>₹{containerCharges.toFixed(2)}</span>
        </div>
      )}

      {shipping === 0 ? (
        <div className="flex items-center gap-2 text-sm text-green-600 border border-green-200 rounded-md p-2 bg-green-50">
          <Truck className="h-4 w-4 flex-shrink-0" />
          <span>Your order qualifies for FREE delivery!</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-primary border border-primary/20 rounded-md p-2 bg-primary/5">
          <Truck className="h-4 w-4 flex-shrink-0" />
          <span>Add ₹{(500 - subtotal).toFixed(2)} more for FREE delivery!</span>
        </div>
      )}

      <div className="flex justify-between text-sm">
        <span>Shipping</span>
        <span>₹{shipping.toFixed(2)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span>GST ({taxInfo?.gstPercentage}%)</span>
        <span>₹{tax.toFixed(2)}</span>
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};