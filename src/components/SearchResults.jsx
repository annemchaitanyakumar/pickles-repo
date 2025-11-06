import { forwardRef, memo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import PropTypes from 'prop-types';
import { cn } from '@/lib/utils';

const getProductPrices = (product) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const availableVariants = variants.filter(v => Number(v.stock) > 0);
  
  if (availableVariants.length === 0) return { inStock: false, minPrice: 0, maxPrice: 0, variants: [] };
  
  const prices = availableVariants.map(v => v.price);
  return {
    inStock: true,
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    variants: availableVariants,
    totalStock: availableVariants.reduce((a, v) => a + v.stock, 0)
  };
};

export const SearchResults = memo(
  forwardRef(({ results, onClose }, ref) => {
    const { addItem } = useCartStore();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [selectedVariants, setSelectedVariants] = useState({});
    const [addToCartLoading, setAddToCartLoading] = useState({});

    const handleVariantSelect = (e, productId, variant) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedVariants(prev => {
        if (prev[productId]?.variant_id === variant.variant_id) return { ...prev, [productId]: undefined };
        return { ...prev, [productId]: variant };
      });
    };

    const handleAddToCart = async (e, product) => {
      e.stopPropagation();
      e.preventDefault();
      
      const selectedVariant = selectedVariants[product.id] || 
        (product.variants && product.variants.find(v => Number(v.stock) > 0));
        
      if (!selectedVariant) {
        toast({ 
          variant: 'destructive', 
          title: 'Error', 
          description: 'Please select a variant or product is out of stock' 
        });
        return;
      }

      setAddToCartLoading(prev => ({ ...prev, [product.id]: true }));
      try {
        await addItem({
          id: product.id,
          name: product.product_name,
          price: selectedVariant.price,
          product_image1_url: product.product_image1_url,
          selectedVariant
        });
        toast({ title: 'Success', description: `${product.product_name} (${selectedVariant.weight}g) added to cart.` });
      } catch (err) {
        console.error('Add to cart error', err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add to cart' });
      } finally {
        setAddToCartLoading(prev => ({ ...prev, [product.id]: false }));
      }
    };

    const handleProductClick = (e, product) => {
      e.preventDefault();
      onClose();
      const slug = product.product_name.toLowerCase().replace(/\s+/g, '-');
      navigate(`/products/${slug}`);
    };

    if (!results.length) return null;

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute left-0 right-0 mt-2 py-2 bg-background rounded-lg border shadow-lg max-h-[70vh] overflow-y-auto z-50 w-[450px]"
      >
        <div className="space-y-2">
          {results.map((product) => {
            const priceInfo = getProductPrices(product);
            return (
              <div
                key={product.id}
                className="flex flex-col p-3 hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex items-center gap-4 cursor-pointer group"
                  onClick={(e) => handleProductClick(e, product)}
                >
                  <img
                    src={product.product_image1_url || '/placeholder.png'}
                    alt={product.product_name}
                    className="w-16 h-16 object-cover rounded-md hover:opacity-75 transition-opacity"
                    onError={(e) => {
                      e.target.src = '/placeholder.png';
                      e.target.onerror = null;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm group-hover:text-primary transition-colors">{product.product_name}</h4>
                    {priceInfo.inStock ? (
                      <div className="mt-1">
                        <p className="text-primary text-sm font-semibold">
                          From ₹{priceInfo.minPrice} — ₹{priceInfo.maxPrice}
                        </p>
                        <p className="text-xs text-green-600">In Stock ({priceInfo.totalStock} available)</p>
                      </div>
                    ) : (
                      <p className="text-red-600 text-sm font-semibold mt-1">Sold Out</p>
                    )}
                  </div>
                </div>

                {priceInfo.inStock && (
                  <div className="mt-2 pl-20">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {priceInfo.variants.map(variant => (
                        <Button
                          key={variant.variant_id}
                          variant={selectedVariants[product.id]?.variant_id === variant.variant_id ? 'default' : 'outline'}
                          size="sm"
                          className="text-xs h-6 px-2"
                          onClick={(e) => handleVariantSelect(e, product.id, variant)}
                        >
                          {variant.weight}g - ₹{variant.price}
                        </Button>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="hover:bg-secondary/90 transition-colors h-7 text-xs w-full"
                      onClick={(e) => handleAddToCart(e, product)}
                      disabled={addToCartLoading[product.id]}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      {addToCartLoading[product.id] ? 'Adding...' : 'Add to Cart'}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  })
);

SearchResults.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      product_name: PropTypes.string.isRequired,
      product_image1_url: PropTypes.string,
      variants: PropTypes.arrayOf(
        PropTypes.shape({
          variant_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
          weight: PropTypes.number.isRequired,
          price: PropTypes.number.isRequired,
          stock: PropTypes.number.isRequired
        })
      )
    })
  ).isRequired,
  onClose: PropTypes.func.isRequired
};