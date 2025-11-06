// Prepare minimal product data for order submission
export const prepareProductListForOrder = (items) => {
  return items.map(item => ({
    id: item.id || item.productId,
    quantity: item.quantity,
    price: item.weightBasedPrice || item.productPrice,
    weight: item.weight,
    name: item.name || item.productName,
    packaging: item.packaging
  }));
};