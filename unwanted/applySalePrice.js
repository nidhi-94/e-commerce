// import Sale from "./salemodel.js";

// const applySalePrice = async (product) => {
//     const now = new Date();
//     const sales = await Sale.find({
//         isActive: true,
//         startsAt: { $lte: now },
//         endsAt: { $gte: now },
//         $or: [
//             { category: product.category },
//             { brand: product.brand },
//             { tags: {$in: product.tags} },
//             { products: product._id }
//         ]
//     }).sort({ discountPercent: -1 });

//     if(sales.length > 0){
//         const bestSales = sales[0];
//         const discount = (product.price * bestSales.discountPercent) / 100;
//         product.salePrice = Math.round(product.price - discount);
//         product.onSale = true;
//         product.saleEndsAt = bestSales.endsAt;
//     }
//     return product;
// }

// export default applySalePrice;