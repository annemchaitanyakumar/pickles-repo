import { motion, useAnimationControls } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, Shield, Clock, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { productService } from '@/services/productService';
import { useToast } from '@/hooks/use-toast';
import { ProductCard } from '@/components/ProductCard';

const Index = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const controls = useAnimationControls();
  const containerRef = useRef(null);
  const BASE_SPEED = 190;
  const xRef = useRef(0);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const startScrollAnimation = (options = {}) => {
    const { resumeFromX = 0 } = options;
    const containerWidth = containerRef.current?.scrollWidth || 1920;
    const remainingDistance = containerWidth + Math.abs(resumeFromX);
    const duration = remainingDistance / BASE_SPEED;
    controls.start({
      x: `-${containerWidth}px`,
      transition: {
        duration: Math.max(duration, 1), // ensure minimum duration of 1 second
        repeat: Infinity,
        ease: "linear",
        repeatType: "loop"
      }
    });
  };

  useEffect(() => {
    if (!loading && containerRef.current) {
      // Wait a bit for the container to properly measure its width
      const timer = setTimeout(() => {
        startScrollAnimation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchFeaturedProducts = async () => {
    setLoading(true);
    try {
      const resp = await productService.getPaginatedProducts(1, null);
      const results = resp.results || [];
      
      // Add slugs to all products
      const withSlug = results.map(p => ({
        ...p,
        slug: p.slug || (p.product_name || `product-${p.id}`).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      }));

      setFeaturedProducts(withSlug);
    } catch (err) {
      console.error('Error loading featured products', err);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Failed to load featured products' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      <Hero />
      
      {/* Why Choose Us Section */}
      <section className="py-16 bg-amber-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Choose <span className="gradient-primary bg-clip-text text-transparent">Us?</span>
            </h2>
            <p className="text-xl text-amber-900 max-w-2xl mx-auto">
              Experience authentic flavors with every jar of our handcrafted pickles
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                Icon: Clock,
                title: 'Traditional Recipes',
                description: 'Time-tested recipes passed down through generations ensuring authentic taste'
              },
              {
                Icon: Shield,
                title: 'Premium Quality',
                description: 'Carefully selected ingredients and rigorous quality control for the finest pickles'
              },
              {
                Icon: Truck,
                title: 'Fast Delivery',
                description: 'Swift and secure delivery to your doorstep in premium packaging'
              },
              {
                Icon: Star,
                title: 'Customer Satisfaction',
                description: 'Loved by families across India for our authentic homemade taste'
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="h-full"
              >
                <div className="text-center p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-yellow-100 h-full w-full flex flex-col">
                  <motion.div 
                    className="w-24 h-24 mx-auto mb-4 bg-yellow-500 bg-opacity-10 rounded-full flex items-center justify-center"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: index * 0.1 
                    }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <feature.Icon className="h-12 w-12 text-yellow-600" />
                    </motion.div>
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-3 text-yellow-800">{feature.title}</h3>
                  <p className="text-amber-900 flex-grow">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-muted/30">
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Featured <span className="gradient-primary bg-clip-text text-transparent">Products</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Discover our most popular pickles, loved by customers across India
            </p>
          </motion.div>

          <div className="relative w-full overflow-hidden mb-8">
            <motion.div
              ref={containerRef}
              className="flex gap-8"
              animate={controls}
              initial={{ x: 0 }}
              style={{
                willChange: "transform"
              }}
              onUpdate={latest => {
                if (typeof latest.x === 'number') {
                  xRef.current = latest.x;
                } else if (typeof latest.x === 'string') {
                  xRef.current = parseFloat(latest.x);
                }
              }}
              onHoverStart={() => {
                // Decelerate smoothly to a stop (not instant)
                const currentX = xRef.current || 0;
                // Animate to the current position over 0.7s for a gentle stop
                controls.start({
                  x: currentX,
                  transition: {
                    duration: 0.7,
                    ease: [0.4, 0, 0.2, 1]
                  }
                });
              }}
              onHoverEnd={async () => {
                const currentX = xRef.current || 0;
                const containerWidth = containerRef.current?.scrollWidth || 1920;
                const remainingDistance = containerWidth + Math.abs(currentX);
                const duration = remainingDistance / BASE_SPEED;
                // Smoothly accelerate back to normal speed
                await controls.start({
                  x: `-${containerWidth}px`,
                  transition: {
                    duration: Math.max(duration, 1),
                    ease: [0.2, 0, 0.3, 1], // custom easing for smooth acceleration
                    repeat: Infinity,
                    repeatType: "loop"
                  }
                });
              }}
            >
              {/* Multiple sets of products for seamless loop */}
              {[...Array(20)].map((_, setIndex) => (
                <div key={`set-${setIndex}`} className="flex gap-8 shrink-0">
                  {loading ? (
                    // Loading skeletons
                    [...Array(8)].map((_, index) => (
                      <Card 
                        key={`skeleton-${setIndex}-${index}`} 
                        className="relative w-[240px] aspect-[3/4] overflow-hidden animate-pulse shrink-0"
                      >
                        <div className="w-full h-full bg-muted"></div>
                      </Card>
                    ))
                  ) : featuredProducts.map((product, index) => (
                    <div 
                      key={`product-${setIndex}-${product.id}`} 
                      className="w-[240px] shrink-0"
                    >
                      <ProductCard product={product} index={index} />
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/products">
              <Button 
                size="lg" 
                className="gradient-primary text-primary-foreground px-8 py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                View All Products
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6 ml-2" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M17 8l4 4m0 0l-4 4m4-4H3" 
                  />
                </svg>
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 parallax-bg" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 400"><defs><pattern id="spices" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="3" fill="%23f59e0b" opacity="0.3"/><circle cx="75" cy="75" r="2" fill="%23ef4444" opacity="0.3"/><circle cx="50" cy="10" r="1" fill="%23eab308" opacity="0.3"/></pattern></defs><rect width="100%" height="100%" fill="url(%23spices)"/></svg>')` }}>
        <div className="container mx-auto text-center text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Taste Tradition?
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who have made our pickles a part of their daily meals
            </p>
            <Link to="/products">
              <Button size="lg" className="gradient-primary text-primary-foreground shadow-warm">
                Start Shopping Now
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Index;