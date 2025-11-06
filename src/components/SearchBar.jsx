import React, { useState, useEffect, useRef } from 'react';
import { Mic, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/store/searchStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const DEFAULT_PLACEHOLDER = 'Search products...';
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 10;
const BACKEND_SEARCH_URL = `${import.meta.env.VITE_API_URL}/search-by-name`;

// helpers
const normalizeName = (p) => {
  return (
    p?.product_name ??
    p?.name ??
    p?.title ??
    p?.productName ??
    p?.pickle_name ??
    p?.productTitle ??
    ''
  );
};

export const SearchBar = ({ className = '', placeholder = DEFAULT_PLACEHOLDER, showOnMobile = true, forceExpanded = false }) => {
  const { searchQuery, setSearchQuery } = useSearchStore();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(forceExpanded ? true : false);
  const [isExpanded, setIsExpanded] = useState(forceExpanded ? true : false); // Toggle only on laptop (md:)
  const [listening, setListening] = useState(false);
  const [angle, setAngle] = useState(0);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const recognitionRef = useRef(null);
  const wrapperRef = useRef(null);
  const resultsRef = useRef(null);
  const inputRef = useRef(null);
  const pendingAbortRef = useRef(null);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
        if (!forceExpanded) setIsExpanded(false);
        inputRef.current?.blur();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((prev) => {
          const next = Math.min(prev + 1, results.length - 1);
          scrollHighlightIntoView(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          scrollHighlightIntoView(next);
          return next;
        });
      } else if (e.key === 'Enter') {
        if (highlightIndex >= 0 && highlightIndex < results.length) {
          navigateToProduct(results[highlightIndex]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, highlightIndex, results]);

  // close when clicking outside (only on laptop screens)
  useEffect(() => {
    const onClick = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target) && !resultsRef.current?.contains(e.target)) {
        setIsOpen(false);
        setIsExpanded(false);
      }
    };
    if (window.innerWidth >= 768 && !forceExpanded) { // md: breakpoint
      document.addEventListener('mousedown', onClick);
    }
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // when forceExpanded is true, treat the expanded state as always-on for rendering
  const effectiveExpanded = forceExpanded || isExpanded;
  // Only show dropdown when there is something to show: loading, results, or a non-empty query
  const showDropdown = isOpen && (loading || results.length > 0 || (searchQuery && String(searchQuery).trim() !== ''));

  // debounce searchQuery -> debouncedQuery
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery || ''), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => setHighlightIndex(-1), [debouncedQuery]);

  // animate conic while listening
  useEffect(() => {
    let frame;
    if (listening) {
      const animate = () => {
        setAngle((a) => (a + 2) % 360);
        frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frame);
  }, [listening]);

  // voice recognition
  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setSearchQuery(transcript);
      setIsOpen(true);
      setIsExpanded(true); // Expand on laptop screens
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.warn('speech recognition start failed', err);
    }
  };

  const scrollHighlightIntoView = (index) => {
    const container = resultsRef.current;
    if (!container || index < 0) return;
    const item = container.querySelector(`[data-index='${index}']`);
    if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const navigateToProduct = (product) => {
    setIsOpen(false);
    setIsExpanded(false);
    setSearchQuery('');
    const slug =
      product.slug ||
      ((product.product_name ||
        product.name ||
        product.title ||
        product.productName ||
        `product-${product.id}`).toString().toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'));
    navigate(`/products/${slug}`);
  };

  const handleInputChange = (e) => {
    const v = e.target.value;
    setSearchQuery(v);
    if (v.trim() === '') {
      setIsOpen(false);
      setResults([]);
    } else {
      setIsOpen(true);
    }
    setIsExpanded(true); // Ensure expanded on input (laptop only)
  };

  const handleToggle = () => {
    if (forceExpanded) return;
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100); // Focus after animation
    } else {
      setIsOpen(false);
      setSearchQuery('');
      setDebouncedQuery('');
      setHighlightIndex(-1);
      inputRef.current?.blur();
      if (pendingAbortRef.current) {
        pendingAbortRef.current.abort();
        pendingAbortRef.current = null;
      }
      setResults([]);
    }
  };

  const thumbnailFor = (p) => p.product_image1_url || p.image1_url || p.productImage || '/placeholder.png';
  const borderColors = ['#7C3AED', '#06B6D4', '#F59E42', '#F43F5E', '#7C3AED'];

  // Fetch presigned URLs from Django (single product)
  const fetchPresignedUrls = async (productId) => {
    const presignedUrlsUrl = `${import.meta.env.VITE_DJANGO_URL}/products/${productId}/presigned-urls`;
    try {
      const resp = await fetch(presignedUrlsUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const transformed = {
        product_image1_url: data?.product_image1_url ?? data?.image1_url ?? data?.[0] ?? '/placeholder.png',
        product_image2_url: data?.product_image2_url ?? data?.image2_url ?? data?.[1] ?? '/placeholder.png',
        product_image3_url: data?.product_image3_url ?? data?.image3_url ?? data?.[2] ?? '/placeholder.png',
        product_image4_url: data?.product_image4_url ?? data?.image4_url ?? data?.[3] ?? '/placeholder.png',
        product_image5_url: data?.product_image5_url ?? data?.image5_url ?? data?.[4] ?? '/placeholder.png',
      };

      Object.keys(transformed).forEach((k) => {
        if (!transformed[k]) transformed[k] = '/placeholder.png';
      });

      return transformed;
    } catch (err) {
      return {
        product_image1_url: '/placeholder.png',
        product_image2_url: '/placeholder.png',
        product_image3_url: '/placeholder.png',
        product_image4_url: '/placeholder.png',
        product_image5_url: '/placeholder.png',
      };
    }
  };

  // Backend search effect using fetch
  useEffect(() => {
    // Don't search if the dropdown isn't open
    if (!isOpen) {
      return;
    }

    const q = (debouncedQuery || '').trim();

    if (pendingAbortRef.current) {
      pendingAbortRef.current.abort();
      pendingAbortRef.current = null;
    }

    // Always clear results if there's no query
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    pendingAbortRef.current = controller;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ name: q, page: '0', size: String(MAX_RESULTS) });
        const resp = await fetch(`${BACKEND_SEARCH_URL}?${params.toString()}`, {
          method: 'GET',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!resp.ok) {
          console.error('Search endpoint returned non-OK status', resp.status);
          setResults([]);
          setIsOpen(false);
          return;
        }

        const data = await resp.json().catch(() => null);
        if (!data) {
          setResults([]);
          setIsOpen(false);
          return;
        }

        let items = [];
        if (Array.isArray(data.content)) {
          items = data.content;
        } else if (Array.isArray(data)) {
          items = data;
        } else if (Array.isArray(data.results)) {
          items = data.results;
        } else if (Array.isArray(data.items)) {
          items = data.items;
        } else if (Array.isArray(data.products)) {
          items = data.products;
        } else {
          items = [];
        }

        const presignPromises = items.map((p) => fetchPresignedUrls(p.id));
        const presigns = await Promise.allSettled(presignPromises);

        const withUrls = items.map((p, i) => {
          const presignResult = presigns[i];
          const urls =
            presignResult?.status === 'fulfilled'
              ? presignResult.value
              : {
                  product_image1_url: '/placeholder.png',
                  product_image2_url: '/placeholder.png',
                  product_image3_url: '/placeholder.png',
                  product_image4_url: '/placeholder.png',
                  product_image5_url: '/placeholder.png',
                };

          const displayName = normalizeName(p) || (p.product_name || p.name || p.title || `product-${p.id}`);

          return {
            ...p,
            ...urls,
            displayName,
          };
        });

        setResults(withUrls.slice(0, MAX_RESULTS));
        setIsOpen(withUrls && withUrls.length > 0);
      } catch (err) {
        if (err.name === 'AbortError') {
        } else {
          console.error('Search request failed', err);
          setResults([]);
          setIsOpen(false);
        }
      } finally {
        setLoading(false);
        pendingAbortRef.current = null;
      }
    };

    fetchResults();

    return () => {
      if (pendingAbortRef.current) {
        pendingAbortRef.current.abort();
        pendingAbortRef.current = null;
      }
    };
  }, [debouncedQuery]);

  return (
    <div ref={wrapperRef} className={cn('relative', className)} style={{ minWidth: 0 }}>
      <div
        className={cn(
          'flex items-center transition-all duration-300 ease-in-out',
          'w-full max-w-md', // Always full width on mobile
          'md:w-10 md:max-w-none', // Collapsed on laptop (md:)
          effectiveExpanded && 'md:w-full md:max-w-md' // Expanded on laptop
        )}
      >
        {showOnMobile && (
        <div
          className={cn(
            'w-full',
            'md:hidden' // Full search bar on mobile
          )}
        >
          <div
            className="relative w-full"
            style={{
              padding: listening ? '4.5px' : '0',
              borderRadius: '1.5rem',
              background: listening ? `conic-gradient(from ${angle}deg, ${borderColors.join(',')})` : 'transparent',
              transition: 'padding 0.2s, background 0.2s',
            }}
          >
            <div
              className="relative bg-white flex items-center"
              style={{
                borderRadius: '1.2rem',
                overflow: 'hidden',
                boxShadow: listening ? '0 0 0 1.5px #e5e7eb' : 'none',
              }}
            >
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-20 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>

              <Input
                ref={inputRef}
                type="text"
                placeholder={placeholder}
                value={searchQuery}
                onChange={handleInputChange}
                onFocus={() => {
                  const query = (searchQuery || '').trim();
                  if (query === '') {
                    setIsOpen(false);
                    setResults([]);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setIsOpen(true);
                    setDebouncedQuery(searchQuery);
                  }
                }}
                className="pl-10 pr-12 w-full h-10 text-base bg-white rounded-lg relative z-10"
                aria-label="Search products"
                style={{ background: 'white', borderRadius: '1.2rem', boxShadow: 'none' }}
              />

              <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
                {!listening ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-transparent"
                    onClick={handleMicClick}
                    aria-label="Voice search"
                    title="Voice search"
                  >
                    <Mic className="w-5 h-5 text-gray-500" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-transparent" aria-label="Listening" tabIndex={-1}>
                    <Mic className="w-5 h-5 text-purple-500" />
                  </Button>
                )}
              </span>
            </div>
          </div>
  </div>
  )}

        <div
          className={cn(
            'hidden md:block', // Only show toggle button on laptop
            effectiveExpanded && 'w-full'
          )}
        >
          {!effectiveExpanded ? (
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-full border-gray-300 hover:bg-gray-100"
              onClick={handleToggle}
              aria-label="Open search"
            >
              <Search className="w-5 h-5 text-gray-500" />
            </Button>
          ) : (
            <div
              className="relative w-full"
              style={{
                padding: listening ? '4.5px' : '0',
                borderRadius: '1.5rem',
                background: listening ? `conic-gradient(from ${angle}deg, ${borderColors.join(',')})` : 'transparent',
                transition: 'padding 0.2s, background 0.2s',
              }}
            >
              <div
                className="relative bg-white flex items-center"
                style={{
                  borderRadius: '1.2rem',
                  overflow: 'hidden',
                  boxShadow: listening ? '0 0 0 1.5px #e5e7eb' : 'none',
                }}
              >
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-20 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>

                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholder}
                  value={searchQuery}
                  onChange={handleInputChange}
                  className="pl-10 pr-12 w-full h-10 text-base bg-white rounded-lg relative z-10"
                  aria-label="Search products"
                  style={{ background: 'white', borderRadius: '1.2rem', boxShadow: 'none' }}
                />

                <span className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center z-20">
                  {!listening ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-transparent"
                      onClick={handleMicClick}
                      aria-label="Voice search"
                      title="Voice search"
                    >
                      <Mic className="w-5 h-5 text-gray-500" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-transparent" aria-label="Listening" tabIndex={-1}>
                      <Mic className="w-5 h-5 text-purple-500" />
                    </Button>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDropdown && (
        <div
          ref={resultsRef}
          role="listbox"
          tabIndex={-1}
          className={cn(
            'absolute z-50 mt-2 w-full max-w-md max-h-72 overflow-auto bg-white rounded-lg shadow-lg border border-gray-100',
            'md:w-full md:max-w-md' // Match laptop expanded width
          )}
        >
          {loading ? (
            <div className="p-3 text-sm text-gray-500">Searching...</div>
          ) : results.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">No results</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((p, i) => {
                const highlighted = i === highlightIndex;
                const displayName = p.displayName ?? normalizeName(p) ?? p.product_name ?? p.name ?? `product-${p.id}`;
                return (
                  <li
                    key={p.id ?? `${displayName}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={highlighted}
                    className={cn('flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50', highlighted ? 'bg-gray-50' : '')}
                    onMouseEnter={() => setHighlightIndex(i)}
                    onMouseLeave={() => setHighlightIndex(-1)}
                    onClick={() => navigateToProduct(p)}
                  >
                    <img
                      src={thumbnailFor(p)}
                      alt={displayName}
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.png';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
                        <span className="text-sm text-gray-500">₹{getMinPrice(p)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{p.product_description ?? p.description ?? ''}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// helper to derive min price from price_by_weight (handles string/json)
function getMinPrice(p) {
  try {
    let pbw = (p.price_by_weight ?? p.priceByWeight ?? p.price) || {};
    if (typeof pbw === 'string') pbw = JSON.parse(pbw || '{}');
    if (!pbw || typeof pbw !== 'object') return '';
    const vals = Object.values(pbw).map((v) => Number(v)).filter((n) => !Number.isNaN(n) && n > 0);
    if (!vals.length) return '';
    return Math.min(...vals);
  } catch {
    return '';
  }
}

export default SearchBar;