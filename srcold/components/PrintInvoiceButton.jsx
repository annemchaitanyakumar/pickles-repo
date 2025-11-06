import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useRef } from 'react';
import { OrderInvoice } from './OrderInvoice';

export const PrintInvoiceButton = ({ order }) => {
  const invoiceRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => invoiceRef.current,
    documentTitle: `Invoice-${order.orderId}`,
  });

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2"
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4" />
        Print Invoice
      </Button>
      
      <div className="hidden">
        <div ref={invoiceRef}>
          <OrderInvoice order={order} />
        </div>
      </div>
    </>
  );
};