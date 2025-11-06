import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';

const ProductCarousel = ({ products, loading }) => {
  return (
    <div className="relative w-full overflow-hidden">
      <motion.div 
        className="flex gap-6 py-4"
        animate={{ 
          x: [0, -1000],
          transition: {
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear"
            }
          }
        }}
        style={{
          width: "fit-content",
          willChange: "transform"
        }}
      >
        {/* First set of products */}
        <div className="flex gap-6">
          {loading ? (
            // Loading skeletons
            [...Array(8)].map((_, index) => (
              <div key={index} className="flex-shrink-0 w-[200px]">
                <Card className="w-full aspect-square overflow-hidden">
                  <div className="w-full h-full bg-muted animate-pulse"></div>
                </Card>
              </div>
            ))
          ) : (
            products.map((product) => (
              <Link 
                to={`/products/${product.slug}`} 
                key={product.id}
                className="flex-shrink-0 w-[200px] group"
              >
                <Card className="w-full overflow-hidden border-yellow-100 hover:border-yellow-300 transition-all duration-300">
                  <div className="aspect-square relative overflow-hidden bg-amber-50">
                    <img 
                      src={product.product_image || '/placeholder.png'} 
                      alt={product.product_name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3 text-center bg-white">
                    <h3 className="text-sm font-medium text-yellow-800 truncate">
                      {product.product_name}
                    </h3>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
        {/* Duplicate set for seamless loop */}
        <div className="flex gap-6">
          {!loading && products.map((product) => (
            <Link 
              to={`/products/${product.slug}`} 
              key={`${product.id}-dup`}
              className="flex-shrink-0 w-[200px] group"
            >
              <Card className="w-full overflow-hidden border-yellow-100 hover:border-yellow-300 transition-all duration-300">
                <div className="aspect-square relative overflow-hidden bg-amber-50">
                  <img 
                    src={product.product_image || '/placeholder.png'} 
                    alt={product.product_name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="p-3 text-center bg-white">
                  <h3 className="text-sm font-medium text-yellow-800 truncate">
                    {product.product_name}
                  </h3>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default ProductCarousel;