import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const Carousel = ({ images, className, autoPlayInterval = 3000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  React.useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        paginate(1);
      }, autoPlayInterval);

      return () => clearInterval(interval);
    }
  }, [currentIndex, isPaused]);

  const fadeVariants = {
    enter: {
      opacity: 0,
      scale: 1.05
    },
    center: {
      zIndex: 1,
      opacity: 1,
      scale: 1
    },
    exit: {
      zIndex: 0,
      opacity: 0,
      scale: 0.95
    }
  };

  const paginate = (newDirection) => {
    if (newDirection === 1) {
      if (currentIndex === images.length - 1) {
        setCurrentIndex(0);
        return;
      }
      setCurrentIndex(currentIndex + 1);
    } else {
      if (currentIndex === 0) {
        setCurrentIndex(images.length - 1);
        return;
      }
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div 
      className={cn("relative w-full h-[500px] overflow-hidden bg-gradient-to-b from-gray-900/10 to-gray-900/30", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <AnimatePresence initial={false} custom={1}>
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          custom={1}
          variants={fadeVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{
            opacity: { duration: 0.5, ease: "easeInOut" },
            scale: { duration: 0.5, ease: "easeInOut" }
          }}
          className="absolute w-full h-full object-contain z-0 brightness-[0.85] contrast-[1.1]"
        />
      </AnimatePresence>
      
      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
              index === currentIndex 
                ? 'bg-white w-8 shadow-lg'
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <div
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 transition-transform duration-200 hover:scale-125 cursor-pointer focus:outline-none group"
        onClick={() => paginate(-1)}
      >
        <ChevronLeft className="h-12 w-12 text-white/75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-colors group-hover:text-white" />
      </div>
      
      <div
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 transition-transform duration-200 hover:scale-125 cursor-pointer focus:outline-none group"
        onClick={() => paginate(1)}
      >
        <ChevronRight className="h-12 w-12 text-white/75 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-colors group-hover:text-white" />
      </div>
    </div>
  );
};

export { Carousel };