import { useState } from 'react';
import { applyPromoCode } from '../services/promoService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Alert, AlertDescription } from './ui/alert';

export const PromoCodeInput = ({ onApplyPromo, appliedPromo, onRemovePromo }) => {
    const [promoCode, setPromoCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChanging, setIsChanging] = useState(false);

    const handleApplyPromo = async (e) => {
        e.preventDefault();
        if (!promoCode.trim()) return;

        setIsLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await applyPromoCode(promoCode.toUpperCase());
            console.log('Promo code applied:', result); // Debug log
            setSuccess('Promo code applied successfully!');
            onApplyPromo(result);
            setPromoCode('');
            setIsChanging(false);
        } catch (err) {
            setError(err.message || 'Failed to apply promo code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemovePromo = () => {
        onRemovePromo();
        setSuccess('');
        setError('');
        setPromoCode('');
        setIsChanging(false);
    };

    const handleChangePromo = () => {
        setIsChanging(true);
        setSuccess('');
        setError('');
    };

    if (appliedPromo && !isChanging) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                    <div>
                        <p className="text-sm font-medium text-green-800">
                            {appliedPromo.code} applied ({appliedPromo.discount}% off)
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleChangePromo}
                        >
                            Change
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePromo}
                            className="text-red-600 hover:text-red-700"
                        >
                            Remove
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <form onSubmit={handleApplyPromo} className="flex gap-2">
                <Input
                    type="text"
                    placeholder="ENTER PROMO CODE"
                    value={promoCode.toUpperCase()}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1"
                    maxLength={15}
                />
                <Button type="submit" disabled={isLoading || !promoCode.trim()}>
                    {isLoading ? 'Applying...' : 'Apply'}
                </Button>
                {isChanging && (
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setIsChanging(false)}
                    >
                        Cancel
                    </Button>
                )}
            </form>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {success && (
                <Alert>
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}
        </div>
    );
};
