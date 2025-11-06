// src/pages/Products.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Eye, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/Navbar';
import { useCartStore } from '@/store/cartStore';
import { useProductStore } from '@/store/productStore';
import axios from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { SlidersHorizontal, Search } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SearchBar } from '@/components/SearchBar';
import { PromoCodeBanner } from '@/components/PromoCodeBanner';

const DJANGO_PRESIGN_ENDPOINT = `${import.meta.env.VITE_DJANGO_URL}/products`; // /{id}/presigned-urls

const slugify = (name = '') =>
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function Products() {
  const PAGE_SIZE = 12;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'VEG' | 'NONVEG' | 'price'
  const [currentPage, setCurrentPage] = useState(1); // 1-based for UI
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const { addItem } = useCartStore();
  const { user } = useAuth ? useAuth() : { user: null };
  const setGlobalProducts = useProductStore(state => state.setProducts);
  const [isHovered, setIsHovered] = useState({});
  const [currentImageIndices, setCurrentImageIndices] = useState({});
  const [addToCartLoading, setAddToCartLoading] = useState({});
  const [minPriceInput, setMinPriceInput] = useState('0');
  const [maxPriceInput, setMaxPriceInput] = useState('5000');
  const [appliedPriceRange, setAppliedPriceRange] = useState(null);
  const [selectedWeights, setSelectedWeights] = useState({});


  // Price filter handlers
  const handlePriceChange = (value) => {
    // Sort the values to ensure min is always less than max
    const [min, max] = value.sort((a, b) => a - b);
    setMinPriceInput(min.toString());
    setMaxPriceInput(max.toString());
  };

  const handlePriceFilter = () => {
    const min = Number(minPriceInput);
    const max = Number(maxPriceInput);
    if (isNaN(min) || isNaN(max)) {
      toast({
        variant: 'destructive',
        title: 'Invalid price range',
        description: 'Please enter valid numbers for the price range'
      });
      return;
    }
    setAppliedPriceRange({ min, max });
    setFilter('price');
  };

  useEffect(() => { setCurrentPage(1); }, [filter, appliedPriceRange]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, appliedPriceRange, currentPage]);

  // --- Normalizers ---
  const normalizeVariant = (v) => ({
    variant_id: v.variantId ?? v.variant_id ?? v.id ?? null,
    weight: Number(v.weight ?? 0),
    unit: v.unit ?? 'g',
    price: Number(v.price ?? 0),
    stock: Number(v.stock ?? 0),
    raw: v
  });

  const normalizeProductShape = (raw) => {
    // accept multiple shapes returned by different endpoints
    const id = raw.productId ?? raw.id ?? raw.product_id ?? raw.product_id ?? null;
    const name = raw.productName ?? raw.product_name ?? raw.product_title ?? raw.productTitle ?? raw.product_name ?? '';
    const desc = raw.productDescription ?? raw.product_description ?? raw.productDescription ?? '';
    const category = raw.category ?? raw.product_category ?? 'VEG';

    // prefer full presigned url fields if backend provided them,
    // else prefer productImage1 (relative key) that we may presign later
    const image1 = raw.product_image1_url ?? raw.productImage1 ?? raw.product_image1 ?? raw.productImage1Url ?? null;
    const image2 = raw.product_image2_url ?? raw.productImage2 ?? raw.product_image2 ?? raw.productImage2Url ?? null;
    const image3 = raw.product_image3_url ?? raw.productImage3 ?? raw.product_image3 ?? raw.productImage3Url ?? null;

    const variantsRaw = Array.isArray(raw.variants) ? raw.variants : (raw.variants ?? []);
    const variants = variantsRaw.map(normalizeVariant);

    return {
      raw,
      id,
      product_name: name,
      product_description: desc,
      category,
      // these may be full HTTP URLs or relative keys (S3 object keys) depending on endpoint
      product_image1_url: image1,
      product_image2_url: image2,
      product_image3_url: image3,
      variants
    };
  };

  // fetch presigned urls from Django for a single product ID
  const fetchPresignedUrls = async (productId) => {
    const url = `${DJANGO_PRESIGN_ENDPOINT}/${productId}/presigned-urls`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        product_image1_url: data.product_image1_url ?? data.image1_url ?? data[0] ?? null,
        product_image2_url: data.product_image2_url ?? data.image2_url ?? data[1] ?? null,
        product_image3_url: data.product_image3_url ?? data.image3_url ?? data[2] ?? null,
      };
    } catch (err) {
      // don't fail whole UI if presign fails
      console.debug('presign fetch failed for', productId, err?.message ?? err);
      return { product_image1_url: null, product_image2_url: null, product_image3_url: null };
    }
  };

  // Ensure each product has usable full URLs for images. If backend returned full URLs keep them,
  // otherwise call presign endpoint which should return full s3 presigned urls (or fallback placeholder).
  const ensureImageUrlsForList = async (normalizedList) => {
    // find only those that do not have an http url for image1
    const needPresign = normalizedList.filter(p => !(typeof p.product_image1_url === 'string' && p.product_image1_url.startsWith('http')));

    if (!needPresign.length) return normalizedList;

    const presignPromises = needPresign.map(p => fetchPresignedUrls(p.id));
    const settled = await Promise.allSettled(presignPromises);

    const idToUrls = {};
    settled.forEach((res, idx) => {
      const pid = needPresign[idx].id;
      idToUrls[pid] = res.status === 'fulfilled' ? res.value : { product_image1_url: null, product_image2_url: null, product_image3_url: null };
    });

    return normalizedList.map(p => {
      // if backend already returned full http url, leave as is
      if (typeof p.product_image1_url === 'string' && p.product_image1_url.startsWith('http')) return p;
      const urls = idToUrls[p.id] || {};
      return {
        ...p,
        product_image1_url: urls.product_image1_url ?? (p.product_image1_url ? `/${p.product_image1_url}` : '/placeholder.png'),
        product_image2_url: urls.product_image2_url ?? (p.product_image2_url ? `/${p.product_image2_url}` : '/placeholder.png'),
        product_image3_url: urls.product_image3_url ?? (p.product_image3_url ? `/${p.product_image3_url}` : '/placeholder.png'),
      };
    });
  };

  // --- Fetch products (supports get-all, by-category, filter-by-price) ---
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL}/get-all-products`;
      let params = { page: currentPage, size: PAGE_SIZE }; // 1-based for get-all-products

      if (filter === 'price' && appliedPriceRange) {
        url = `${import.meta.env.VITE_API_URL}/filter-by-price`;
        params = { minPrice: appliedPriceRange.min, maxPrice: appliedPriceRange.max, page: currentPage - 1, size: PAGE_SIZE };
      } else if (filter !== 'all') {
        url = `${import.meta.env.VITE_API_URL}/by-category`;
        params = { category: filter, page: currentPage - 1, size: PAGE_SIZE };
      }

      const resp = await axios.get(url, { params });
      const data = resp.data || {};

      // backend might respond with different shapes: content, results, content.content, or array
      const rawItems = data.results ?? data.content ?? data.items ?? data.content ?? data ?? [];
      const arr = Array.isArray(rawItems) ? rawItems : (Array.isArray(rawItems.content) ? rawItems.content : []);

      const normalized = arr.map(normalizeProductShape);

      // Ensure images: if product_image1_url is relative or missing, call presign
      const withUrls = await ensureImageUrlsForList(normalized);

      const finalList = withUrls.map(p => ({
        ...p,
        product_image1_url: p.product_image1_url ?? '/placeholder.png',
        product_image2_url: p.product_image2_url ?? '/placeholder.png',
        product_image3_url: p.product_image3_url ?? '/placeholder.png',
      }));

      setProducts(finalList);
      setGlobalProducts(finalList);
      setTotalCount(data.count ?? data.totalElements ?? data.total ?? (finalList.length));

      setCurrentImageIndices(prev => {
        const copy = { ...prev };
        finalList.forEach(prod => { if (copy[prod.id] === undefined) copy[prod.id] = 0; });
        return copy;
      });
    } catch (err) {
      console.error('Error loading products', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load products' });
    } finally {
      setLoading(false);
    }
  };

  const handleWeightSelect = (productId, variant) => {
    setSelectedWeights(prev => {
      if (prev[productId]?.variant_id === variant.variant_id) return { ...prev, [productId]: undefined };
      return { ...prev, [productId]: { ...variant } };
    });
  };

  const handleAddToCart = async (product) => {
    if (!user) {
      toast({
        title: "Please login",
        description: "You need to be logged in to add items to cart",
        variant: "destructive"
      });
      return;
    }

    const selectedVariant = selectedWeights[product.id];
    if (!selectedVariant) {
      toast({
        title: "Select a size",
        description: "Please select a size before adding to cart",
        variant: "destructive"
      });
      return;
    }

    setAddToCartLoading(prev => ({ ...prev, [product.id]: true }));

    try {
      const cartItem = {
        id: product.id,
        name: product.product_name,
        price: Number(selectedVariant.price),
        product_image1_url: product.product_image1_url || '/placeholder.png',
        weight: Number(selectedVariant.weight),
        quantity: 1
      };

      await addItem(cartItem);

      // Fetch updated cart count from backend
      try {
        const response = await axios.get('/cart-count');
        const count = response?.data ?? 0;
        // Dispatch event to update cart badge
        window.dispatchEvent(new CustomEvent('cart-count-updated', { detail: count }));
      } catch (error) {
        console.error('Failed to fetch cart count:', error);
      }
    } catch (error) {
      console.error('Add to cart failed:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAddToCartLoading(prev => ({ ...prev, [product.id]: false }));
    }
  };

  const applyPriceFilter = () => {
    const min = Number(minPriceInput);
    const max = Number(maxPriceInput);
    if (isNaN(min) || isNaN(max) || min < 0 || max < 0 || min > max) {
      toast({ variant: 'destructive', title: 'Invalid price', description: 'Please enter a valid min and max price (min ≤ max).' });
      return;
    }
    setAppliedPriceRange({ min, max });
    setFilter('price');
    setCurrentPage(1);
  };

  const clearPriceFilter = () => {
    setAppliedPriceRange(null);
    setMinPriceInput('0');
    setMaxPriceInput('5000');
    setFilter('all');
    setCurrentPage(1);
  };

  // rotate image when hovered
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentImageIndices(prev => {
        const copy = { ...prev };
        products.forEach(product => {
          if (isHovered[product.id]) {
            const images = [product.product_image1_url, product.product_image2_url, product.product_image3_url].filter(Boolean);
            if (images.length) copy[product.id] = ((prev[product.id] || 0) + 1) % images.length;
          }
        });
        return copy;
      });
    }, 3000);
    return () => clearInterval(id);
  }, [products, isHovered]);

  const totalPages = Math.max(1, Math.ceil((totalCount || 0) / PAGE_SIZE));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Navbar />
      <section className="pt-4 pb-16 px-3 sm:px-4">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-6">
            <PromoCodeBanner />
          </div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 sm:mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Our <span className="gradient-primary bg-clip-text text-transparent">Products</span></h1>
            <p className="text-xl font-bold max-w-2xl mx-auto">Discover our handcrafted collection of traditional Indian pickles, made with authentic recipes and premium ingredients.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-4 items-center mb-8">
            <div className="flex gap-2 flex-wrap justify-center">
              <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => { setFilter('all'); setAppliedPriceRange(null); }} className="text-sm sm:text-base"><span className="sm:hidden">All</span><span className="hidden sm:inline">All Products</span></Button>
              <Button variant={filter === 'VEG' ? 'default' : 'outline'} onClick={() => setFilter('VEG')} className="text-sm sm:text-base"><span className="sm:hidden">Veg</span><span className="hidden sm:inline">Vegetarian</span></Button>
              <Button variant={filter === 'NONVEG' ? 'default' : 'outline'} onClick={() => setFilter('NONVEG')} className="text-sm sm:text-base"><span className="sm:hidden">Non-Veg</span><span className="hidden sm:inline">Non-Vegetarian</span></Button>
              
              

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={filter === 'price' ? 'default' : 'outline'} className="gap-2 text-sm sm:text-base">
                    <SlidersHorizontal className="h-4 w-4" />
                    {filter === 'price' ? `₹${appliedPriceRange?.min || minPriceInput}` : <><span className="sm:hidden">Filter</span><span className="hidden sm:inline">Price Filter</span></>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="p-4 space-y-4">
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-base font-medium">Price Range</label>
                        <span className="text-sm">₹{minPriceInput} - ₹{maxPriceInput}</span>
                      </div>
                      <div className="my-6">
                        <Slider
                          min={0}
                          max={5000}
                          step={100}
                          value={[Number(minPriceInput), Number(maxPriceInput)]}
                          onValueChange={(values) => {
                            setMinPriceInput(values[0].toString());
                            setMaxPriceInput(values[1].toString());
                          }}
                          className="mb-2"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>₹0</span>
                          <span>₹5000</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between">
                      <Button variant="outline" size="sm" className="w-[80px]" onClick={clearPriceFilter}>
                        Reset
                      </Button>
                      <Button variant="default" size="sm" className="w-[80px]" onClick={() => { handlePriceFilter(); document.body.click(); }}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Mobile Search */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="sm:hidden gap-2 text-sm">
                    <Search className="h-4 w-4" />
                    {/* <span>Search</span> */}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 sm:hidden">
                  <div className="p-2">
                    <SearchBar className="w-full" placeholder="Search products..." />
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {filter === 'price' && appliedPriceRange && (
              <div className="text-sm text-muted-foreground">Filtering by price: ₹{appliedPriceRange.min} — ₹{appliedPriceRange.max}</div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
            {products.map((product, idx) => {
              const images = [product.product_image1_url, product.product_image2_url, product.product_image3_url].filter(Boolean);
              const imagesArr = images.length ? images : ['/placeholder.png'];
              const currentImageIndex = currentImageIndices[product.id] || 0;
              const variants = Array.isArray(product.variants) ? product.variants : [];
              const availableVariants = variants.filter(v => Number(v.stock) > 0);
              const selected = selectedWeights[product.id];
              const inStock = availableVariants.length > 0;
              const slug = slugify(product.product_name);

              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: idx * 0.05 }} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 max-w-md mx-auto w-full" onMouseEnter={() => setIsHovered(prev => ({ ...prev, [product.id]: true }))} onMouseLeave={() => setIsHovered(prev => ({ ...prev, [product.id]: false }))}>
                  <div className="relative w-full h-52 sm:h-48">
                    <Link to={`/products/${slug}`}>
                      <img src={imagesArr[currentImageIndex % imagesArr.length]} alt={product.product_name} className="w-full h-full object-cover rounded" onError={(e) => { e.target.src = '/placeholder.png'; }} />
                    </Link>
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${product.category === 'VEG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{product.category}</span>
                    </div>
                  </div>

                  <div className="p-3">
                    <Link to={`/products/${slug}`}><h3 className="text-sm sm:text-base font-semibold mb-1 text-gray-800 hover:text-primary">{product.product_name}</h3></Link>

                    {inStock ? (
                      <>
                        <div className="flex flex-col mb-2">
                          <span className="text-base font-bold text-primary truncate">
                            From ₹{Math.min(...availableVariants.map(v => v.price))} — ₹{Math.max(...availableVariants.map(v => v.price))}
                          </span>
                          <span className="text-xs text-green-600 font-medium">
                            In Stock ({availableVariants.reduce((a, v) => a + v.stock, 0)} available)
                          </span>
                        </div>

                        {/* Mobile: Horizontal scrolling weights */}
                        <div className="relative block sm:hidden">
                          <div className="flex overflow-x-auto gap-2 mt-2 pb-2 no-scrollbar scrollbar-hide">
                            {variants.map(variant => (
                              <Button 
                                key={variant.variant_id} 
                                variant={selected?.variant_id === variant.variant_id ? 'default' : 'outline'} 
                                onClick={() => handleWeightSelect(product.id, variant)} 
                                disabled={variant.stock <= 0} 
                                className={cn(
                                  'text-sm py-1 px-2 h-auto shrink-0 whitespace-nowrap', 
                                  variant.stock <= 0 && 'opacity-50'
                                )}
                              >
                                {variant.weight}g - ₹{variant.price}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Desktop: Grid layout weights */}
                        <div className="hidden sm:flex sm:flex-wrap gap-2 mt-2">
                            {variants.map(variant => (
                              <Button 
                                key={variant.variant_id} 
                                variant={selected?.variant_id === variant.variant_id ? 'default' : 'outline'} 
                                onClick={() => handleWeightSelect(product.id, variant)} 
                                disabled={variant.stock <= 0} 
                                className={cn(
                                  'text-sm py-1 px-2 h-auto flex-1 min-w-[100px] truncate', 
                                  variant.stock <= 0 && 'opacity-50'
                                )}
                              >
                                {variant.weight}g - ₹{variant.price}
                              </Button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <Link to={`/products/${slug}`} className="w-full">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="w-full h-8 flex items-center justify-center gap-2"
                            >
                              <Eye className="h-4 w-4 sm:h-[14px] sm:w-[14px]" />
                              <span className="sr-only sm:not-sr-only sm:inline-block">View Details</span>
                            </Button>
                          </Link>
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="gradient-primary text-primary-foreground w-full h-8 flex items-center justify-center gap-2" 
                            onClick={() => handleAddToCart(product)} 
                            disabled={addToCartLoading[product.id]}
                          >
                            {addToCartLoading[product.id] ? 
                              'Adding...' : 
                              <>
                                <ShoppingCart className="h-4 w-4" />
                                <span className="sr-only">Add to Cart</span>
                              </>
                            }
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-base sm:text-lg font-bold text-red-600">Sold Out</span>
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <Link to={`/products/${slug}`} className="w-full">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="w-full h-8 flex items-center justify-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View Details</span>
                            </Button>
                          </Link>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full h-8 flex items-center justify-center gap-2" 
                            disabled
                          >
                            <ShoppingCart className="h-4 w-4" />
                            <span className="sr-only">Sold Out</span>
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Pagination */}
          <div className="flex justify-center items-center mt-8 gap-4">
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>Previous</Button>
            <span className="text-sm font-medium text-gray-700">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
          </div>
        </div>
      </section>
    </div>
  );
}