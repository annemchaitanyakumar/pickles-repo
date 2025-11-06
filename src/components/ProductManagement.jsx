import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { tokenService } from '@/services/tokenService';

export const ProductManagement = () => {
    const { toast } = useToast();
    const [activeProducts, setActiveProducts] = useState([]);
    const [inactiveProducts, setInactiveProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, product: null, mode: 'soft' });

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            // Fetch active products
            const activeResponse = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            // Fetch inactive products
            const inactiveResponse = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/inactive/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!activeResponse.ok || !inactiveResponse.ok) {
                throw new Error('Failed to fetch products');
            }

            const activeData = await activeResponse.json();
            const inactiveData = await inactiveResponse.json();

            // Ensure image URLs are usable for both active and inactive lists
            const makePresignedForList = async (list) => {
                const items = list || [];
                // find those without fully qualified http(s) urls
                const need = items.filter(p => !(p.product_image1_url && typeof p.product_image1_url === 'string' && p.product_image1_url.startsWith('http')));
                if (!need.length) return items;

                const promises = need.map(p => fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${p.id}/presigned-urls/`).then(r => r.ok ? r.json() : null).catch(() => null));
                const results = await Promise.allSettled(promises);

                const idTo = {};
                results.forEach((res, i) => {
                    const pid = need[i]?.id;
                    idTo[pid] = res.status === 'fulfilled' && res.value ? res.value : null;
                });

                return items.map(p => {
                    const urls = idTo[p.id];
                    if (urls && (urls.product_image1_url || urls.image1_url)) {
                        return { ...p, product_image1_url: urls.product_image1_url || urls.image1_url };
                    }
                    // fallback: keep existing url if any, else placeholder
                    return { ...p, product_image1_url: p.product_image1_url || '/placeholder.png' };
                });
            };

            const activeList = await makePresignedForList(activeData.results || activeData || []);
            const inactiveList = await makePresignedForList(inactiveData.results || inactiveData || []);

            setActiveProducts(activeList);
            setInactiveProducts(inactiveList);
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

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDeactivate = async (product) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${product.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

                // Status 204 is a success response for DELETE
                if (response.status === 204 || response.ok) {
                    toast({
                        title: "Success",
                        description: "Product deactivated successfully"
                    });
                    await fetchProducts(); // Refresh the product lists
                } else {
                    throw new Error('Failed to deactivate product');
                }
        } catch (error) {
                console.error('Deactivation error:', error);
            toast({
                variant: "destructive",
                title: "Error",
                    description: error.message || 'Failed to deactivate product'
            });
        }
    };

    const handleRestore = async (product) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${product.id}/restore/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to restore product');

            toast({
                title: "Success",
                description: "Product restored successfully"
            });

            fetchProducts();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    const handleHardDelete = async (product) => {
        try {
            const token = tokenService.getAccessToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch(`${import.meta.env.VITE_DJANGO_URL}/products/${product.id}/hard-delete/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to delete product');

            toast({
                title: "Success",
                description: "Product deleted permanently"
            });

            setDeleteDialog({ open: false, product: null, mode: 'soft' });
            fetchProducts();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message
            });
        }
    };

    const ProductCard = ({ product, inactive = false }) => (
        <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold">{product.product_title}</h3>
                    <p className="text-sm text-muted-foreground">{product.category}</p>
                </div>
                {product.product_image1_url && (
                    <img 
                        src={product.product_image1_url} 
                        alt={product.product_title}
                        className="w-16 h-16 object-cover rounded"
                    />
                )}
            </div>
            <div className="space-x-2">
                {inactive ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestore(product)}
                        >
                            Restore
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialog({ 
                                open: true, 
                                product, 
                                mode: 'hard'
                            })}
                        >
                            Delete Permanently
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteDialog({ 
                            open: true, 
                            product, 
                            mode: 'soft'
                        })}
                    >
                        Deactivate
                    </Button>
                )}
            </div>
        </Card>
    );

    return (
        <div className="container mx-auto p-4 space-y-4">
            <Tabs defaultValue="active">
                <TabsList className="mb-4">
                    <TabsTrigger value="active">Active Products</TabsTrigger>
                    <TabsTrigger value="inactive">Inactive Products</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    {loading ? (
                        <p>Loading active products...</p>
                    ) : activeProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {activeProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product}
                                />
                            ))}
                        </div>
                    ) : (
                        <p>No active products found.</p>
                    )}
                </TabsContent>

                <TabsContent value="inactive" className="space-y-4">
                    {loading ? (
                        <p>Loading inactive products...</p>
                    ) : inactiveProducts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inactiveProducts.map(product => (
                                <ProductCard 
                                    key={product.id} 
                                    product={product}
                                    inactive
                                />
                            ))}
                        </div>
                    ) : (
                        <p>No inactive products found.</p>
                    )}
                </TabsContent>
            </Tabs>

            <AlertDialog 
                open={deleteDialog.open} 
                onOpenChange={(open) => !open && setDeleteDialog({ open: false, product: null, mode: 'soft' })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {deleteDialog.mode === 'hard' 
                                ? 'Permanently Delete Product' 
                                : 'Deactivate Product'
                            }
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteDialog.mode === 'hard'
                                ? 'This action cannot be undone. This will permanently delete the product.'
                                : 'This will deactivate the product. You can restore it later.'
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (deleteDialog.mode === 'hard') {
                                    handleHardDelete(deleteDialog.product);
                                } else {
                                    handleDeactivate(deleteDialog.product);
                                    setDeleteDialog({ open: false, product: null, mode: 'soft' });
                                }
                            }}
                            className={deleteDialog.mode === 'hard' ? 'bg-destructive' : ''}
                        >
                            {deleteDialog.mode === 'hard' ? 'Delete Permanently' : 'Deactivate'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ProductManagement;
