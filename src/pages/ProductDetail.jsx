import { useEffect, useState, useRef, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as HoverCard from '@radix-ui/react-hover-card';
import { cn } from "@/lib/utils";
import { tokenService } from '@/services/tokenService';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cartStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import axios from '@/lib/axios';
import { FREE_SHIPPING_THRESHOLD } from '@/lib/shipping';
import { Truck } from 'lucide-react';
import { PromoCodeBanner } from '@/components/PromoCodeBanner';

import { API_ENDPOINTS, getApiUrl } from '@/config/constants';

export default function ProductDetail() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams(); // expects numeric id or slug with id
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const { addItem } = useCartStore();
  const { toast } = useToast();
  const imageRef = useRef(null);
  const relatedRef = useRef(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [[x, y], setMousePosition] = useState([0, 0]);
  const [[imgWidth, imgHeight], setImageSize] = useState([0, 0]);
  const ZOOM_INTENSITY = 2;

  // reviews
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  // use the shared tokenService (singleton) instead of creating a new instance per component
  // tokenService is imported above

  const extractIdFromSlug = (s) => {
    if (!s) return null;
    if (/^\d+$/.test(s)) return Number(s);
    const m = s.match(/(\d+)$/); // try trailing digits
    if (m) return Number(m[1]);
    return null;
  };

  const normalizeVariant = (v) => ({
    variant_id: v.variantId ?? v.variant_id ?? v.id ?? null,
    weight: Number(v.weight ?? v.w ?? 0),
    unit: v.unit ?? 'g',
    price: Number(v.price ?? 0),
    stock: Number(v.stock ?? 0),
    raw: v
  });

  const fetchPresignedUrls = async (productId) => {
    try {
      const r = await fetch(`${import.meta.env.VITE_DJANGO_URL}/${productId}/presigned-urls`);
      const data = await r.json();
      return {
        product_image1_url: data.product_image1_url ?? data.image1_url ?? data[0] ?? null,
        product_image2_url: data.product_image2_url ?? data.image2_url ?? data[1] ?? null,
        product_image3_url: data.product_image3_url ?? data.image3_url ?? data[2] ?? null,
      };
    } catch (err) {
      console.debug('presign fetch failed', err?.message ?? err);
      return { product_image1_url: null, product_image2_url: null, product_image3_url: null };
    }
  };

  const fetchProductById = async (id) => {
    try {
      const resp = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${id}`, { headers: { Accept: 'application/json' }});
      if (!resp.ok) throw new Error(`product fetch failed status=${resp.status}`);
      return await resp.json();
    } catch (err) {
      console.error('Failed to fetch product by id', err);
      throw err;
    }
  };

  const getInitialVariant = (prod) => {
    const variants = Array.isArray(prod.variants) ? prod.variants.map(normalizeVariant) : [];
    const avail = variants.filter(v => Number(v.stock) > 0);
    if (!avail.length) return null;
    avail.sort((a, b) => Number(b.weight) - Number(a.weight));
    return avail[0];
  };

  const fetchAndNormalizeProduct = async (id) => {
    // Try to fetch product from Django (recommended) else try Spring
    try {
      // First try your Spring endpoint at 4040 (if exists), because your products listing is from 4040.
      // But most reliable for images is Django presign endpoint.
      let productData = null;

      // Try Spring product detail first
      try {
        const resp = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${id}`);
        if (resp.ok) productData = await resp.json();
      } catch (e) { /* ignore */ }

      // If Spring didn't respond, try Django product endpoint
      if (!productData) {
        productData = await fetchProductById(id);
      }

      if (!productData) throw new Error('No product data');

      // Normalize fields
      const idNorm = productData.productId ?? productData.id ?? productData.product_id ?? null;
      const name = productData.productName ?? productData.product_name ?? productData.product_title ?? productData.productTitle ?? '';
      const desc = productData.productDescription ?? productData.product_description ?? productData.productDescription ?? '';
      const category = productData.category ?? 'VEG';
      // images might be keys or full urls
      let image1 = productData.product_image1_url ?? productData.productImage1 ?? productData.productImage1Url ?? productData.product_image1 ?? null;
      let image2 = productData.product_image2_url ?? productData.productImage2 ?? productData.product_image2 ?? null;
      let image3 = productData.product_image3_url ?? productData.productImage3 ?? productData.product_image3 ?? null;

      // If images are not full URLs (don't start with http), try presign
      if (!(typeof image1 === 'string' && image1.startsWith('http'))) {
        const presigns = await fetchPresignedUrls(idNorm);
        image1 = presigns.product_image1_url ?? (image1 ? `/${image1}` : '/placeholder.png');
        image2 = presigns.product_image2_url ?? (image2 ? `/${image2}` : '/placeholder.png');
        image3 = presigns.product_image3_url ?? (image3 ? `/${image3}` : '/placeholder.png');
      }

      const variantsRaw = Array.isArray(productData.variants) ? productData.variants : (productData.variants ?? productData.variant ?? []);
      const variants = variantsRaw.map(normalizeVariant);

      return {
        id: idNorm,
        product_name: name,
        product_description: desc,
        category,
        product_image1_url: image1 ?? '/placeholder.png',
        product_image2_url: image2 ?? '/placeholder.png',
        product_image3_url: image3 ?? '/placeholder.png',
        variants
      };
    } catch (err) {
      console.error('fetchAndNormalizeProduct error', err);
      throw err;
    }
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      let id = extractIdFromSlug(slug);
      // if slug is not numeric, try search endpoint to get id
      if (!id && slug) {
        try {
          const query = slug.replace(/-/g, ' ');
          const params = new URLSearchParams({ name: query, page: '0', size: '1' });
          const resp = await fetch(`${import.meta.env.VITE_API_URL}/search-by-name?${params.toString()}`);
          if (resp.ok) {
            const d = await resp.json().catch(() => null);
            const items = Array.isArray(d.content) ? d.content : Array.isArray(d) ? d : (d?.content ?? []);
            if (items && items.length) id = items[0].productId ?? items[0].id ?? items[0].product_id ?? items[0].productId;
          }
        } catch (e) { /* ignore */ }
      }

      if (!id) {
        toast({ variant: 'destructive', title: 'Product not found', description: 'Could not resolve product ID' });
        setProduct(null);
        setLoading(false);
        return;
      }

      const composed = await fetchAndNormalizeProduct(id);
      setProduct(composed);
      const initial = getInitialVariant(composed);
      setSelectedVariant(initial);
    } catch (err) {
      console.error('Error in fetchProduct:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch product details' });
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProduct(); /* eslint-disable-line */ }, [slug]);

  // Reviews state management
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  // Check if user has already reviewed
  useEffect(() => {
    if (user && reviews.length > 0) {
      const userReview = reviews.find(review => 
        (review.user_id === user.userid || review.user_id === user.id) ||
        (review.user_email === user.emailid || review.user_email === user.email)
      );
      setHasUserReviewed(Boolean(userReview));
    }
  }, [user, reviews]);

  const fetchReviews = async () => {
    if (!product?.id) return;
    const pId = product.id;

    try {
        const url = `${import.meta.env.VITE_API_URL}/reviews-by-id/${pId}`;
        console.log('Fetching reviews from:', url);
        const resp = await fetch(url, { 
          headers: { 
            'Accept': 'application/json'
          }
        });
      
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }
      
      const data = await resp.json();
      let parsed;
      try {
        // Try parsing the string response if it's stringified JSON
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        parsed = jsonData.results || jsonData.items || [];
      } catch (e) {
        console.error('Error parsing review data:', e);
        parsed = [];
      }
      
      console.log('Reviews data:', parsed);
      setReviews(parsed);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setReviews([]);
    }
  };

  const fetchAverageRating = async () => {
    if (!product?.id) return;
    const pId = product.id;
    
    try {
      const url = `${import.meta.env.VITE_API_URL}/reviews-average/${pId}`;
      const resp = await fetch(url, { 
        headers: { 
          'Accept': 'application/json' 
        }
      });
      
      if (!resp.ok) {
        throw new Error(`HTTP error! status: ${resp.status}`);
      }

      const rawData = await resp.json();
      let data;
      try {
        // Handle string response from Spring Boot
        data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      } catch (e) {
        console.error('Error parsing average rating data:', e);
        data = {};
      }

      const avg = data?.average_rating ?? data?.average ?? data?.avg ?? 0;
      const cnt = data?.total_reviews ?? data?.count ?? data?.total ?? 0;
      
      setAverageRating(Number(avg) || 0);
      setRatingCount(Number(cnt) || 0);
    } catch (err) {
      console.error('Failed to fetch average rating:', err);
      setAverageRating(0);
      setRatingCount(0);
    }
  };

  const fetchRelatedProducts = async () => {
    if (!product?.category) return;
    try {
      const resp = await axios.get(`${import.meta.env.VITE_API_URL}/by-category`, {
        params: {
          category: product.category,
          page: 0,
          size: 10
        }
      });
      
      // Handle different response structures
      const data = resp.data || {};
      const rawItems = data.content || data.results || data.items || [];
      
      // Process each product
      const processedItems = await Promise.all(rawItems.map(async (p) => {
        const productId = p.productId || p.id || p.product_id;
        let image1 = p.product_image1_url || p.productImage1 || p.product_image1 || null;
        
        // If image is not a full URL, fetch presigned URL
        if (productId && (!image1 || !image1.startsWith('http'))) {
          try {
            const presignResp = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${productId}/presigned-urls`);
            if (presignResp.ok) {
              const presignData = await presignResp.json();
              image1 = presignData.product_image1_url || presignData.image1_url || presignData[0] || null;
            }
          } catch (error) {
            console.error('Error fetching presigned URL:', error);
          }
        }

        return {
          id: productId,
          productName: p.productName || p.product_name || p.name,
          category: p.category || 'VEG',
          productImage1: image1 || '/placeholder.png',
          variants: Array.isArray(p.variants) ? p.variants.map(v => ({
            ...v,
            price: Number(v.price) || 0
          })) : [],
          slug: (p.productName || p.product_name || `product-${productId}`).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        };
      }));
      
      setFeaturedProducts(processedItems);
    } catch (err) {
      console.error('Error fetching related products:', err);
    }
  };

  useEffect(() => {
    if (product) {
      fetchReviews();
      fetchAverageRating();
      fetchRelatedProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  // submit review (keeps previous robust approach)
  const handleSubmitReview = async () => {
    if (!product?.id) return toast({ variant: 'destructive', title: 'Product missing' });
    if (!newRating || !newComment.trim()) return toast({ variant: 'destructive', title: 'Invalid review', description: 'Select rating and add comment' });
    setSubmittingReview(true);
    try {
      const token = tokenService.getAccessToken();
      if (!token) {
        throw new Error('Please login to submit a review');
      }
      
      if (!user) {
        throw new Error('Please login to submit a review');
      }

      // Check for either user_id or user_email
      if (!user?.userid && !user?.id && !user?.emailid && !user?.email) {
        throw new Error('User ID or email is required to submit a review');
      }
      
      // Log user data to debug
      console.log('Current user data:', user);
      
      const payload = { 
        product: product.id,
        user_id: user?.userid || user?.id,
        user_email: user?.emailid || user?.email,
        rating: newRating, 
        comment: newComment.trim()
      };

      const url = `${import.meta.env.VITE_API_URL}/create-review`;
      
      console.log('Submitting review to:', url);
      console.log('Review payload:', payload);
      
      const resp = await fetch(url, { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}`
        },
        body: JSON.stringify({ 
          product: Number(payload.product),
          user_id: Number(payload.user_id),
          user_email: payload.user_email,
          rating: Number(payload.rating),
          comment: payload.comment.trim()
        }) 
      });

      if (!resp.ok) {
        const textResponse = await resp.text();
        console.log('Error response text:', textResponse);

        // Try to parse as JSON, but don't fail if it's plain text
        let errorData;
        try {
          errorData = JSON.parse(textResponse);
        } catch (e) {
          errorData = { message: textResponse };
        }

        console.log('Review submission failed:', {
          status: resp.status,
          errorData,
          payload,
          userInfo: {
            hasUserid: Boolean(user?.userid || user?.id),
            hasEmail: Boolean(user?.emailid || user?.email)
          },
          requestUrl: url
        });

        // Handle specific error cases
        switch (resp.status) {
          case 400:
            throw new Error(errorData.message || 'Please check your review details and try again');
          case 401:
            throw new Error('Please login again to submit your review');
          case 403:
            throw new Error('You can only review products after purchase');
          case 404:
            throw new Error('Product not found');
          case 409:
            toast({
              title: "Already Reviewed",
              description: "You have already reviewed this product",
              variant: "default"
            });
            setHasUserReviewed(true);
            setShowReviewForm(false);
            return;
          case 500:
            throw new Error(errorData.message || 'Server error. Please try again later');
          default:
            throw new Error(errorData.message || 'Failed to submit review');
        }
        
      }

      await resp.json();
      toast({ title: 'Review submitted successfully' });
      setNewRating(0);
      setNewComment('');
      await fetchReviews();
      await fetchAverageRating();
    } catch (err) {
      console.error('submit review error', err);
      toast({ 
        variant: 'destructive', 
        title: 'Failed to submit review', 
        description: err.message === 'Please login to submit a review' 
          ? 'You need to be logged in to submit a review'
          : err.message === 'User information is missing'
          ? 'Please log out and log in again'
          : err.message
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  // cart and variants helpers
  const getVariants = () => Array.isArray(product?.variants) ? product.variants.map(normalizeVariant) : [];
  const getTotalStock = () => getVariants().reduce((a, v) => a + (Number(v.stock) || 0), 0);
  const getCurrentStock = () => (selectedVariant ? Number(selectedVariant.stock || 0) : 0);
  const isOutOfStockOverall = getVariants().length ? getVariants().every(v => Number(v.stock) <= 0) : true;

  const handleVariantSelect = (variant) => {
    if (Number(variant.stock) > 0) setSelectedVariant(variant);
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "Please login",
        description: "You need to be logged in to add items to cart",
        variant: "destructive"
      });
      return;
    }

    if (!selectedVariant) {
      toast({
        title: "Select a size",
        description: "Please select a size before adding to cart",
        variant: "destructive"
      });
      return;
    }

    const currentStock = getCurrentStock();
    if (currentStock <= 0) {
      toast({ variant: 'destructive', title: 'Out of stock' });
      return;
    }

    setAddingToCart(true);
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
        window.dispatchEvent(new CustomEvent('cart-count-updated', { detail: count }));
      } catch (error) {
        console.error('Failed to fetch cart count:', error);
      }

      toast({
        title: "Added to cart",
        description: `${product.product_name} (${selectedVariant.weight}g) added to cart`,
      });
    } catch (error) {
      console.error('Add to cart failed:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setAddingToCart(false);
    }
  };

  // image rotation
  const images = product ? [product.product_image1_url, product.product_image2_url, product.product_image3_url].filter(Boolean) : [];
  useEffect(() => {
    // Don't rotate when hovering (for zoom) or when there's only one image
    if (images.length <= 1 || isHovered) return;
    
    const timer = setInterval(() => setCurrentImageIndex(prev => (prev + 1) % images.length), 3000);
    return () => clearInterval(timer);
  }, [isHovered, images.length]);

  // Arrow positions for related products
  const [leftPos, setLeftPos] = useState(12);
  const [rightPos, setRightPos] = useState(12);

  const updateArrowPositions = () => {
    const rel = relatedRef.current;
    if (!rel) return;
    const parent = rel.closest('.relative');
    if (!parent) return;
    const parentRect = parent.getBoundingClientRect();
    const relRect = rel.getBoundingClientRect();

    // place left arrow slightly inset from the left edge of the scroll container
    const left = Math.max(8, relRect.left - parentRect.left + 8);
    // place right arrow slightly inset from the right edge of the scroll container
    const right = Math.max(8, parentRect.right - relRect.right + 8);

    setLeftPos(left);
    setRightPos(right);
  };

  useEffect(() => {
    updateArrowPositions();
    window.addEventListener('resize', updateArrowPositions);
    // also update after images/layout settle
    const t = setTimeout(updateArrowPositions, 250);
    return () => {
      window.removeEventListener('resize', updateArrowPositions);
      clearTimeout(t);
    };
  }, [featuredProducts]);

  if (loading) return <div className="container mx-auto p-4">Loading...</div>;
  if (!product) return (
    <div className="container mx-auto p-4 text-center">
      <h2 className="text-2xl font-bold">Product Not Found</h2>
      <Link to="/products" className="text-primary mt-4 inline-block">Back to products</Link>
    </div>
  );

  const variants = getVariants();
  const availableVariants = variants.filter(v => Number(v.stock) > 0);
  const displayedPrice = selectedVariant?.price ?? (availableVariants.length ? Math.min(...availableVariants.map(v => Number(v.price))) : 0);
  const displayedWeight = selectedVariant?.weight ?? null;
  const totalStock = getTotalStock();
  const currentStock = getCurrentStock();

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/products" className="inline-flex items-center text-primary hover:text-primary/80">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Products
          </Link>
        </div>

        <div className="mb-6">
          <PromoCodeBanner />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* images */}
        <div className="space-y-4">
          <div 
            className="relative aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-xl bg-gray-100 group cursor-zoom-in" 
            onMouseEnter={(e) => {
              setIsHovered(true);
              const rect = e.currentTarget.getBoundingClientRect();
              setImageSize([rect.width, rect.height]);
            }} 
            onMouseLeave={() => {
              setIsHovered(false);
              setCurrentImageIndex(0);
              setMousePosition([0, 0]);
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - rect.left) / rect.width;
              const y = (e.clientY - rect.top) / rect.height;
              setMousePosition([x, y]);
            }}
          >
            <AnimatePresence mode="wait">
              <motion.img 
                key={currentImageIndex} 
                src={images[currentImageIndex] ?? '/placeholder.png'} 
                alt={`${product.product_name} view ${currentImageIndex + 1}`} 
                className="w-full h-full object-contain bg-white transition-transform duration-100"
                style={{
                  transform: isHovered 
                    ? `scale(${ZOOM_INTENSITY}) translate(${((0.5 - x) * 100) / ZOOM_INTENSITY}%, ${((0.5 - y) * 100) / ZOOM_INTENSITY}%)`
                    : 'none'
                }}
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                transition={{ duration: 0.4 }} 
                ref={imageRef} 
                onError={(e) => { e.target.src = '/placeholder.png'; e.target.onerror = null; }} 
              />
            </AnimatePresence>
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-3 gap-2 max-w-[400px] mx-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => setCurrentImageIndex(i)} className={cn("group relative aspect-square overflow-hidden rounded-lg transition-all duration-200 bg-white", currentImageIndex === i ? "ring-2 ring-primary scale-105" : "opacity-70 hover:opacity-100 hover:scale-105")}>
                  <img src={img} alt={`thumb ${i+1}`} className="w-full h-full object-contain" onError={(e) => e.currentTarget.src = '/placeholder.png'} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* details */}
        <div>
          <span className="text-sm uppercase tracking-wider text-gray-500 font-medium mb-2 block">Homely Taste Pickles</span>
          <h1 className="text-3xl font-bold mb-4">{product.product_name}</h1>
          <p className="text-gray-600 mb-4">{product.product_description}</p>

          <div className="flex items-center gap-2 mb-6">
              <div className="flex text-yellow-500">
                {[...Array(5)].map((_, i) => {
                  const full = i + 1 <= Math.floor(averageRating);
                  const partial = !full && i < averageRating;
                  const percent = partial ? Math.round((averageRating - i) * 100) : 0;
                  return (
                    <span key={i} className="relative w-5 h-5 inline-block">
                      <svg className="absolute top-0 left-0 w-5 h-5" fill={full ? "#eab308" : "#d1d5db"} stroke="#eab308" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {partial && (
                        <svg className="absolute top-0 left-0 w-5 h-5" style={{ clipPath: `inset(0 ${100 - percent}% 0 0)` }} fill="#eab308" stroke="#eab308" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </span>
                  );
                })}
              </div>
            <span className="text-gray-600 text-md font-bold"> {ratingCount} Reviews</span>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">₹{displayedPrice}</span>
              {displayedWeight && <span className="text-gray-500">/ {displayedWeight}g</span>}
            </div>

            <div className="flex items-center gap-2">
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, ease: "easeInOut", repeat: currentStock > 0 && currentStock < 10 ? Infinity : 0 }} className={cn("w-2 h-2 rounded-full", currentStock > 10 && "bg-green-500", currentStock > 0 && currentStock <= 10 && "bg-red-500", currentStock <= 0 && "bg-gray-500")} />
              <span className={cn("text-sm font-medium", currentStock > 10 && "text-green-600", currentStock > 0 && currentStock <= 10 && "text-red-600", currentStock <= 0 && "text-gray-600")}>
                {currentStock > 10 ? `In Stock (${currentStock} available)` : currentStock > 0 ? `Low Stock (${currentStock} left)` : 'Out of Stock'}
              </span>
            </div>
          </div>
          
          <div className="max-w-xs">
            <div className="flex items-center gap-2 text-sm text-primary border border-primary/20 rounded-md p-2 bg-primary/5">
              <Truck className="h-4 w-4 flex-shrink-0" />
              <span>FREE delivery on orders above ₹{FREE_SHIPPING_THRESHOLD}!</span>
            </div>
          </div>

          <div className="relative space-y-4 mb-6 max-w-xs">
            <label className="text-sm font-medium text-gray-700">Select Weight:</label>
            <div className="grid grid-cols-2 gap-2">
              {variants.map(variant => {
                const stock = Number(variant.stock || 0);
                return (
                  <Button key={variant.variant_id ?? `${variant.weight}-${variant.price}`} variant={selectedVariant?.variant_id === variant.variant_id ? 'default' : 'outline'} className={cn("text-sm py-1 px-2 h-auto relative", selectedVariant?.variant_id === variant.variant_id && "ring-2 ring-primary", stock <= 0 && "opacity-50 cursor-not-allowed")} onClick={() => handleVariantSelect(variant)} disabled={stock <= 0}>
                    {variant.weight}g - ₹{variant.price}
                  </Button>
                );
              })}
            </div>

            {isOutOfStockOverall && (
              <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none" initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <div className="transform rotate-[-20deg]"><span className="text-3xl font-bold text-red-500/30 border-4 border-red-500/30 px-4 py-2 uppercase">Sold Out</span></div>
              </motion.div>
            )}
          </div>

          <div className="max-w-xs">
            <Button onClick={handleAddToCart} disabled={!selectedVariant || currentStock <= 0 || addingToCart} className={cn("w-full gradient-primary text-primary-foreground relative", (!selectedVariant || currentStock <= 0 || addingToCart) && "opacity-50 cursor-not-allowed pointer-events-none")}>
              {addingToCart ? 'Adding...' : currentStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
            </Button>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16 bg-white rounded-2xl shadow-sm border p-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left side - Rating Summary */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-6">Reviews</h2>
            
            {/* Overall Rating */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-4xl font-bold">{averageRating.toFixed(1)}</div>
              <div className="flex flex-col">
                <div className="flex text-primary">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5" fill={i < Math.round(averageRating) ? "currentColor" : "none"} 
                      stroke="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">{ratingCount} reviews</span>
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-3 max-w-[300px]"> {/* Added max-w-[300px] to constrain width */}
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = reviews.filter(r => Math.round(r.rating) === rating).length;
                const percentage = ratingCount ? (count / ratingCount) * 100 : 0;
                
                return (
                  <div key={rating} className="flex items-center gap-2">
                    <span className="text-sm w-3">{rating}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-primary/80 rounded-full"
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-16">{count} {count === 1 ? 'review' : 'reviews'}</span>
                  </div>
                );
              })}
            </div>

            {/* Write Review Button */}
            {user && !hasUserReviewed && (
              <Button
                onClick={() => {
                  setShowReviewForm(v => !v);
                  setTimeout(() => {
                    const el = document.getElementById('write-review');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className="mt-6 w-full bg-primary hover:bg-primary/90"
              >
                Write a Review
              </Button>
            )}
            {user && hasUserReviewed && (
              <div className="mt-6 text-sm text-muted-foreground text-center p-3 bg-muted rounded-md">
                You've already reviewed this product
              </div>
            )}
          </div>

          {/* Right side - Reviews List */}
          <div className="flex-1">
            {reviews.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-12 bg-muted rounded-lg"
              >
                <h3 className="text-lg font-medium">No reviews yet</h3>
                <p className="text-sm text-muted-foreground mt-1">Be the first to review this product!</p>
              </motion.div>
            ) : (
              <div className="space-y-6">
                <AnimatePresence>
                  {reviews.slice(0, showAllReviews ? reviews.length : 3).map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary font-medium">
                            {(review.user_firstname?.[0] || 'A').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">{review.user_firstname || 'Anonymous'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex text-primary">
                                  {[...Array(5)].map((_, i) => (
                                    <svg 
                                      key={i}
                                      className="w-4 h-4"
                                      fill={i < (review.rating ?? 0) ? "currentColor" : "none"}
                                      stroke="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <time className="text-sm text-muted-foreground">
                              {review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              }) : ''}
                            </time>
                          </div>
                          <p className="mt-2 text-sm text-card-foreground">{review.comment}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {reviews.length > 3 && (
                  <Button
                    variant="outline"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                    className="w-full mt-4"
                  >
                    {showAllReviews ? 'Show Less' : `Show All ${reviews.length} Reviews`}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Write Review Section - hidden if user has already reviewed or pen icon not clicked */}
        {user && !hasUserReviewed && showReviewForm && (
          <div id="write-review" className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Write a Review</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map(r => (
                    <button
                      key={r}
                      onClick={() => setNewRating(r)}
                      className="p-1 hover:scale-110 transition"
                      type="button"
                    >
                      <svg 
                        className="w-8 h-8" 
                        fill={r <= newRating ? "#eab308" : "#d1d5db"}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label htmlFor="review-text" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review
                </label>
                <textarea
                  id="review-text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary transition"
                  rows="4"
                  placeholder="Share your experience with this product..."
                />
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white"
              >
                {submittingReview ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </div>
                ) : 'Submit Review'}
              </Button>
            </div>
          </div>
        )}
        {/* If not logged in, show login prompt */}
        {!user && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Login Required</h3>
            <p className="mt-1 text-sm text-gray-500">Please log in to write a review</p>
            <div className="mt-6">
              <Button variant="outline" onClick={() => navigate('/login')}>
                Log In
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Related Products Section */}
      <div className="mt-16 pb-16">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-8">
            Related <span className="gradient-primary bg-clip-text text-transparent">Products</span>
          </h2>

          <div className="relative">
            <div className="overflow-hidden">
              <div ref={relatedRef} className="flex gap-4 snap-x snap-mandatory overflow-x-auto no-scrollbar py-3">
                {loading ? (
                  // Loading skeletons
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="w-[220px] shrink-0 snap-start">
                      <div className="bg-gray-100 rounded-lg aspect-[3/4] animate-pulse"></div>
                    </div>
                  ))
                ) : (
                  // Filtered products by category
                  featuredProducts
                    .filter(p => p.category === product.category && p.id !== product.id)
                    .map((relatedProduct) => {
                      const variants = Array.isArray(relatedProduct.variants) ? relatedProduct.variants : [];
                      const minPrice = variants.length ? Math.min(...variants.map(v => Number(v.price) || 0)) : 0;
                      const productName = relatedProduct.productName || relatedProduct.product_name;
                      const imageUrl = relatedProduct.productImage1 || relatedProduct.product_image1_url || '/placeholder.png';
                      const slug = relatedProduct.slug || productName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                      
                      return (
                        <div key={relatedProduct.id} className="w-[220px] shrink-0 snap-start">
                          <Link 
                            to={`/products/${slug}`}
                            className="block bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
                          >
                            <div className="aspect-[3/4] relative overflow-hidden">
                              <img 
                                src={imageUrl} 
                                alt={productName}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                onError={(e) => { e.target.src = '/placeholder.png' }}
                              />
                              <div className="absolute top-2 right-2">
                                <span className={cn(
                                  "px-2 py-1 rounded-full text-xs font-medium",
                                  relatedProduct.category === 'VEG' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                )}>
                                  {relatedProduct.category}
                                </span>
                              </div>
                            </div>
                            <div className="p-4">
                              <h3 className="font-semibold text-gray-800 mb-2 truncate">
                                {productName}
                              </h3>
                              <div className="text-primary font-bold">
                                From ₹{minPrice}
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Optional: Add navigation buttons if needed */}
            <button 
              className="absolute top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 z-20"
              aria-label="Scroll related products left"
              style={{ left: leftPos }}
              onClick={() => {
                const container = relatedRef?.current;
                if (container) container.scrollBy({ left: -240, behavior: 'smooth' });
                // update positions after scroll
                setTimeout(updateArrowPositions, 300);
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              className="absolute top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-gray-50 z-20"
              aria-label="Scroll related products right"
              style={{ left: `calc(100% - ${rightPos + 40}px)` }}
              onClick={() => {
                const container = relatedRef?.current;
                if (container) container.scrollBy({ left: 240, behavior: 'smooth' });
                setTimeout(updateArrowPositions, 300);
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}