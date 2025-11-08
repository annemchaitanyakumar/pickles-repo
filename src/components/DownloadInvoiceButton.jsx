import React, { useRef, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import OrderInvoice from './OrderInvoice';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const DownloadInvoiceButton = ({ order }) => {
  const componentRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Process order data
  const getInvoiceData = useMemo(() => {
    if (!order) return null;

    const address = {
      firstName: order.customer_name?.split(' ')[0] || '',
      lastName: order.customer_name?.split(' ').slice(1).join(' ') || '',
      streetAddress: order.address?.street_address || '',
      city: order.address?.city || '',
      state: order.address?.state || '',
      pinCode: order.address?.pin_code || '',
      mobileNumber: order.address?.mobile_number || '',
    };

    const products = JSON.parse(order.product_list || '[]').map(product => ({
      product_name: product.productName || product.name,
      weight: product.weight,
      quantity: product.quantity,
      unitPrice: product.productPrice || product.price
    }));

    const orderData = {
      ...order,
      email: order.customer_email,
      createdTime: order.created_time
    };

    return { address, products, orderData };
  }, [order]);

  const handleDownload = async () => {
    const node = componentRef.current;
    if (!node) {
      console.error('Reference not found');
      return;
    }
    
    if (isDownloading) return; // Prevent multiple clicks
    setIsDownloading(true);

    try {
      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        setIsDownloading(false);
      }, 30000); // 30 second timeout
      // Set container styles similar to user profile view
      node.style.width = '727px';
      node.style.height = '1600px';
      node.style.background = '#FBF6EE';

      const PRINT_DPI = 300;
      const SCREEN_DPI = 72;
      const dpiScale = PRINT_DPI / SCREEN_DPI;

      // Capture the invoice DOM as an image with same settings as profile view
      const canvas = await html2canvas(node, {
        scale: dpiScale,
        useCORS: true,
        logging: true,
        backgroundColor: '#FBF6EE',
        width: 727,
        height: 1600,
        windowWidth: 727,
        windowHeight: 1600,
        imageTimeout: 5000,
        onclone: (clonedDoc) => {
          const clonedContainer = clonedDoc.querySelector('div');
          if (clonedContainer) {
            clonedContainer.style.width = '727px';
            clonedContainer.style.height = '1600px';
            clonedContainer.style.background = '#FBF6EE';
          }
        }
      });

      // Calculate PDF dimensions based on the same logic as profile view
      const pdfWidth = Math.round((727 / PRINT_DPI) * 72);
      const pdfHeight = Math.round((1600 / PRINT_DPI) * 72);

      // Create PDF with matched dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [pdfWidth, pdfHeight]
      });

      // Convert canvas to image data
      const imgData = canvas.toDataURL('image/png');

      // Add image to PDF using exact same parameters
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, '', 'FAST');

      // Use same filename format as profile view
      const orderDate = order.created_time ? new Date(order.created_time).toLocaleDateString('en-GB').replace(/\//g, '-') : new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      pdf.save(`HT-Pickles_#${order?.orderid}_${orderDate}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
      clearTimeout(timeout);
    }
  };

  if (!getInvoiceData) return null;

  const { address, products, orderData } = getInvoiceData;

  return (
    <>
      <Button 
        variant="outline"
        size="sm"
        onClick={handleDownload}
        title="Download Invoice"
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>

      <div style={{ position: 'absolute', left: -9999, top: 0 }} aria-hidden>
        <OrderInvoice
          ref={componentRef}
          order={orderData}
          products={products}
          address={address}
        />
      </div>
    </>
  );
};

export default DownloadInvoiceButton;
