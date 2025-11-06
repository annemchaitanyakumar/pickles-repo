import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

export function OrdersList({ orders }) {
  const [openStates, setOpenStates] = useState({});

  const getStatusColor = (status) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-green-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'PENDING':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleAccordion = (orderId) => {
    setOpenStates((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isOpen = openStates[order.orderId] || false;
        return (
          <div key={order.orderId} className="border rounded-lg mb-2">
            <button
              className={`w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 focus:outline-none ${isOpen ? 'border-b' : ''}`}
              onClick={() => toggleAccordion(order.orderId)}
              aria-expanded={isOpen}
            >
              <span className="font-medium">Order #{order.orderId}</span>
              <span>₹{order.totalAmountPaid}</span>
              <span>{formatDate(order.createdTime)}</span>
              <Badge className={getStatusColor(order.paymentStatus)}>
                {order.paymentStatus}
              </Badge>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-2 bg-gray-50 animate-fade-in">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {JSON.parse(order.productList).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{item.weight}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>₹{item.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}