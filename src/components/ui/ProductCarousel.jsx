import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation } from 'swiper/modules';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

export function ProductCarousel({ products }) {
  if (!products?.length) {
    return <div className="text-center">No products available</div>;
  }

  return (
    <div className="relative w-full">
      <Swiper
        modules={[Autoplay, Navigation]}
        spaceBetween={20}
        slidesPerView={1}
        navigation={true}
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          reverseDirection: true
        }}
        breakpoints={{
          640: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 }
        }}
        className="product-swiper"
      >
        {products.map((product) => (
          <SwiperSlide key={product.productid || product.id}>
            <Link to={`/product/${product.productid || product.id}`}>
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square relative">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="object-cover w-full h-full"
                    onError={(e) => {
                      e.target.src = '/placeholder.png';
                      console.log('Image load error for:', product.name);
                    }}
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="text-lg font-semibold text-center truncate">
                    {product.name}
                  </h3>
                  <p className="text-center text-muted-foreground">
                    ₹{product.price}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}