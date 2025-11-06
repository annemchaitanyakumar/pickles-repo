import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export const ProductCard = ({ product, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.6 }}
      className="group"
    >
      <Link to={`/products/${product.slug}`}>
        <Card className="overflow-hidden shadow-warm">
          <div className="relative overflow-hidden">
            <motion.img
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              src={product.product_image1_url || product.image}
              alt={product.product_name || product.name}
              className="w-full h-64 object-cover"
            />
          </div>

          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-center">
              {product.product_name || product.name}
            </h3>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.number.isRequired,
    slug: PropTypes.string.isRequired,
    product_name: PropTypes.string,
    product_image1_url: PropTypes.string,
    // Legacy support
    name: PropTypes.string,
    image: PropTypes.string,
  }).isRequired,
  index: PropTypes.number
};
