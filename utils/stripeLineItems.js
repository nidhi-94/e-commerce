export const buildStripeLineItems = (orderItems, shippingCharges = 0, taxAmount = 0, shippingLabel = "Shipping", taxLabel = "Tax", discount = 0) => {
    const lineItems = orderItems.map(item => ({
        price_data: {
            currency: "inr",
            product_data: {
                name: item.title
            },
            unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity
    }));
    if (taxAmount > 0) {
        lineItems.push({
            price_data: {
                currency: "inr",
                product_data: {
                    name: taxLabel
                },
                unit_amount: Math.round(taxAmount * 100),
            },
            quantity: 1
        });
    }

    if (discount > 0) {
        lineItems.push({
            price_data: {
                currency: "inr",
                product_data: {
                    name: "Discount",
                },
                unit_amount: -Math.round(discount * 100), 
            },
            quantity: 1,
        });
    }

    return lineItems;
};