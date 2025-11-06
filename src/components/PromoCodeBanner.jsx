import { useState, useEffect } from 'react';
import { getAllPromoCodes } from '../services/promoService';
import { Card } from './ui/card';

export const PromoCodeBanner = () => {
    const [promoCodes, setPromoCodes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextPromo = () => {
        if (promoCodes.length) {
            setCurrentIndex((prev) => (prev + 1) % promoCodes.length);
        }
    };

    useEffect(() => {
        const fetchPromoCodes = async () => {
            try {
                const codes = await getAllPromoCodes();
                setPromoCodes(codes);
            } catch (error) {
                console.error('Error fetching promo codes:', error);
            }
        };

        fetchPromoCodes();
    }, []);

    useEffect(() => {
        if (promoCodes.length) {
            const timer = setInterval(nextPromo, 5000); // Change promo every 5 seconds
            return () => clearInterval(timer);
        }
    }, [promoCodes.length]);

    if (!promoCodes.length) return null;

    const prevPromo = () => {
        if (promoCodes.length) {
            setCurrentIndex((prev) => (prev - 1 + promoCodes.length) % promoCodes.length);
        }
    };

    return (
        <Card className="w-full bg-primary/10 p-4">
            <div className="flex items-center justify-between">
                <button 
                    onClick={prevPromo}
                    className="text-2xl px-2 text-primary hover:text-primary/80 transition-colors"
                    aria-label="Previous promotion"
                >
                    ←
                </button>
                <div className="text-center flex-1">
                    {promoCodes[currentIndex] && (
                        <p className="text-sm font-medium">
                            Use the promocode "{promoCodes[currentIndex].code}" to get {promoCodes[currentIndex].discount}% off on the total cart value
                        </p>
                    )}
                </div>
                <button 
                    onClick={nextPromo}
                    className="text-2xl px-2 text-primary hover:text-primary/80 transition-colors"
                    aria-label="Next promotion"
                >
                    →
                </button>
            </div>
        </Card>
    );
};
