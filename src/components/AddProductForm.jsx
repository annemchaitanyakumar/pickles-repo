import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '@/services/tokenService';
import { motion, AnimatePresence } from 'framer-motion';

export const AddProductForm = ({ onSuccess, product = null }) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [authorized, setAuthorized] = useState(true);

    // Admin check
    useEffect(() => {
        // Use tokenService to obtain user info (mirrors non-sensitive fields to cookies)
        const authData = tokenService.getUserInfo();
        console.log('Initial auth data (from tokenService):', authData);

        if (authData) {
            if ((authData.role || '').toUpperCase() !== 'ADMIN' && (authData.role || '').toUpperCase() !== 'ROLE_ADMIN') {
                toast({
                    variant: "destructive",
                    title: "Access Denied",
                    description: "Only administrators can add products"
                });
                setAuthorized(false);
                return;
            }

            // Validate token presence (in-memory)
            const token = tokenService.getAccessToken();
            if (!token) {
                toast({
                    variant: "destructive",
                    title: "Authentication Error",
                    description: "Please login again"
                });
                setAuthorized(false);
                return;
            }

            console.log('Admin check passed, token present');
        } else {
            toast({
                variant: "destructive",
                title: "Access Denied",
                description: "Please login as administrator"
            });
            setAuthorized(false);
        }
    }, [navigate, toast]);

    const [formData, setFormData] = useState({
        category: '',
        product_name: '', // Short name for identification
        product_title: '', // Display title
        product_description: '',
        product_image1: null,
        product_image2: null,
        product_image3: null,
        variants: [
            { variant_id: null, weight: '', price: '', stock: '', unit: 'g' },
            { variant_id: null, weight: '', price: '', stock: '', unit: 'g' },
            { variant_id: null, weight: '', price: '', stock: '', unit: 'g' }
        ]
    });

    // If `product` prop is provided (edit mode), populate form
    useEffect(() => {
        if (!product) return;
        try {
            const uniqueVariants = {};
            // Deduplicate variants by weight
            (product.variants || []).forEach(v => {
                const key = v.weight.toString();
                if (!uniqueVariants[key]) {
                    uniqueVariants[key] = {
                        variant_id: v.variant_id ?? v.id ?? null,
                        weight: v.weight ?? '',
                        price: v.price ?? '',
                        stock: v.stock ?? '',
                        unit: v.unit ?? 'g'
                    };
                }
            });

            const deduplicatedVariants = Object.values(uniqueVariants).slice(0, 3);
            
            setFormData({
                category: product.category || '',
                product_name: product.product_name || product.product_title || '',
                product_title: product.product_title || '',
                product_description: product.product_description || '',
                product_image1: null,
                product_image2: null,
                product_image3: null,
                variants: deduplicatedVariants.concat(
                    Array.from({ 
                        length: Math.max(0, 3 - deduplicatedVariants.length) 
                    }, () => ({ 
                        variant_id: null, 
                        weight: '', 
                        price: '', 
                        stock: '', 
                        unit: 'g' 
                    }))
                )
            });
        } catch (err) {
            console.error('Failed to populate product into form:', err);
        }
    }, [product]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (prev[name] === value) return prev; // Skip update if value hasn't changed
            return { ...prev, [name]: value };
        });
    };

    const handleImageChange = (e, imageNumber) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({
                ...prev,
                [`product_image${imageNumber}`]: file
            }));
        }
    };

    const handleVariantChange = (index, field, value) => {
        setFormData(prev => ({
            ...prev,
            variants: prev.variants.map((v, i) =>
                i === index ? { ...v, [field]: value } : v
            )
        }));
    };

    // Helper function to get the stored auth token
    const getStoredAuthToken = () => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) return null;
            return token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!authorized) throw new Error('Not authorized to perform this action');
            const authData = tokenService.getUserInfo() || {};

            // Normalize role
            const role = (authData.role || '').replace("ROLE_", "") || null;
            if (role !== "ADMIN") {
                throw new Error('Only administrators can add products');
            }

            // Get token using the helper function
            const token = getStoredAuthToken();
            if (!token) throw new Error('No token found');

            // Validate required fields
            if (!formData.category) throw new Error('Please select a category');
            if (!formData.product_title) throw new Error('Product title is required');
            if (!product && !formData.product_image1) throw new Error('At least one image is required');

            // Filter out empty variants first
            const filledVariants = formData.variants.filter(v => 
                v.weight && v.price && v.stock
            );

            // If this is an update, only include up to 3 variants
            const limitedVariants = filledVariants.slice(0, 3);

            // Map to the format expected by the backend
            const cleanedVariants = limitedVariants.map(v => ({
                ...(product?.id && v.variant_id ? { variant_id: v.variant_id } : {}),
                weight: String(v.weight || '').trim(),
                price: String(v.price || '').trim(),
                stock: String(v.stock || '').trim(),
                unit: 'g'
            }));

            if (cleanedVariants.length === 0) {
                throw new Error('At least one variant is required');
            }

            // Create form data with explicit string conversions
            const formDataToSend = new FormData();
            
            // Add basic fields with string conversion and trimming
            formDataToSend.append('product_name', String(formData.product_name || formData.product_title || '').trim());
            formDataToSend.append('product_title', String(formData.product_title || '').trim());
            formDataToSend.append('product_description', String(formData.product_description || '').trim());
            formDataToSend.append('category', String(formData.category || '').trim());

            // Add variants as separate fields
            cleanedVariants.forEach((variant, index) => {
                formDataToSend.append(`variants[${index}][weight]`, variant.weight);
                formDataToSend.append(`variants[${index}][price]`, variant.price);
                formDataToSend.append(`variants[${index}][stock]`, variant.stock);
                formDataToSend.append(`variants[${index}][unit]`, 'g');
                if (product?.id && variant.variant_id) {
                    formDataToSend.append(`variants[${index}][variant_id]`, variant.variant_id);
                }
            });

            // Handle image files with unique names
            if (formData.product_image1) {
                const file1 = new File([formData.product_image1], `${Date.now()}_1.jpg`, { type: formData.product_image1.type });
                formDataToSend.append('product_image1', file1);
            }
            if (formData.product_image2) {
                const file2 = new File([formData.product_image2], `${Date.now()}_2.jpg`, { type: formData.product_image2.type });
                formDataToSend.append('product_image2', file2);
            }
            if (formData.product_image3) {
                const file3 = new File([formData.product_image3], `${Date.now()}_3.jpg`, { type: formData.product_image3.type });
                formDataToSend.append('product_image3', file3);
            }

            // Log the form data for debugging
            console.log('Form data being sent:', Object.fromEntries(formDataToSend.entries()));
            console.log('Stringified variants:', JSON.stringify(cleanedVariants, null, 2));

            // Decide create vs edit
            const isEdit = Boolean(product && product.id);
            const apiUrl = isEdit
                ? `${import.meta.env.VITE_DJANGO_URL}/products/${product.id}/`
                : `${import.meta.env.VITE_DJANGO_URL}/products/`;

            // Make the request
            const response = await fetch(apiUrl, {
                method: isEdit ? 'PATCH' : 'POST',
                body: formDataToSend,
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
                mode: 'cors'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || errorData.category?.[0] || 'Failed to create product');
            }

            const result = await response.json();
            console.log('Product created:', result);

            toast({
                title: "Success",
                description: "Product created successfully",
            });

            if (onSuccess) onSuccess(result);

            // Reset form
            setFormData({
                category: '',
                product_title: '',
                product_description: '',
                product_image1: null,
                product_image2: null,
                product_image3: null,
                variants: [
                    { variant_id: null, weight: '', price: '', stock: '', unit: 'g' },
                    { variant_id: null, weight: '', price: '', stock: '', unit: 'g' },
                    { variant_id: null, weight: '', price: '', stock: '', unit: 'g' }
                ]
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 3;

    const FormStep1 = React.memo(() => (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                        value={formData.category}
                        onValueChange={(value) => {
                            if (value === formData.category) return;
                            setFormData(prev => ({ ...prev, category: value }));
                        }}
                        required
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="VEG">VEG</SelectItem>
                            <SelectItem value="NONVEG">NON VEG</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="product_name">Product Name</Label>
                    <Input
                        id="product_name"
                        name="product_name"
                        placeholder="Short identifying name"
                        value={formData.product_name}
                        onChange={handleInputChange}
                        required
                        autoComplete="off"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="product_title">Product Title</Label>
                    <Input
                        id="product_title"
                        name="product_title"
                        placeholder="Display title"
                        value={formData.product_title}
                        onChange={handleInputChange}
                        required
                        autoComplete="off"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="product_description">Product Description</Label>
                    <Textarea
                        id="product_description"
                        name="product_description"
                        value={formData.product_description}
                        onChange={handleInputChange}
                        required
                    />
                </div>
            </div>
        </div>
    ));

    const FormStep2 = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((num) => (
                    <div key={num} className="space-y-2">
                        <Label htmlFor={`product_image${num}`}>Product Image {num}</Label>
                        <Input
                            id={`product_image${num}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageChange(e, num)}
                            required={num === 1}
                        />
                        {formData[`product_image${num}`] && (
                            <div className="mt-2">
                                <img
                                    src={URL.createObjectURL(formData[`product_image${num}`])}
                                    alt={`Preview ${num}`}
                                    className="w-full h-32 object-cover rounded-md"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const FormStep3 = React.memo(() => (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label>Variants (Maximum 3)</Label>
                    <span className="text-sm text-muted-foreground">
                        {formData.variants.filter(v => v.weight && v.price && v.stock).length}/3 variants
                    </span>
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                    Note: Duplicate weight values will be automatically combined.
                </div>
                {formData.variants.map((variant, index) => (
                    <Card key={index} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Weight (g)</Label>
                                <Input
                                    type="number"
                                    value={variant.weight}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (variant.weight === value) return;
                                        handleVariantChange(index, 'weight', value);
                                    }}
                                    required={index === 0}
                                    min="1"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Price (₹)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={variant.price}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (variant.price === value) return;
                                        handleVariantChange(index, 'price', value);
                                    }}
                                    required={index === 0}
                                    min="0"
                                    autoComplete="off"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Stock</Label>
                                <Input
                                    type="number"
                                    value={variant.stock}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        if (variant.stock === value) return;
                                        handleVariantChange(index, 'stock', value);
                                    }}
                                    required={index === 0}
                                    min="0"
                                    autoComplete="off"
                                />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    ));

    const goToNextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const goToPreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="mb-8">
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
                    <span className="text-sm font-medium">{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="w-full h-2" />
            </div>

            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {currentStep === 1 && <FormStep1 />}
                        {currentStep === 2 && <FormStep2 />}
                        {currentStep === 3 && <FormStep3 />}
                    </motion.div>
                </AnimatePresence>
            </div>

            <div className="flex justify-between gap-4 mt-8">
                {currentStep > 1 && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={goToPreviousStep}
                        className="w-full"
                    >
                        Previous
                    </Button>
                )}
                {currentStep < totalSteps && (
                    <Button
                        type="button"
                        onClick={goToNextStep}
                        className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90"
                    >
                        Next
                    </Button>
                )}
                {currentStep === totalSteps && (
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90"
                        disabled={loading}
                    >
                        {loading ? (product ? 'Updating...' : 'Creating...') : (product ? 'Update Product' : 'Create Product')}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default AddProductForm;