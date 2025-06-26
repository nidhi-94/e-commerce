// import Product from "../../models/productmodel.js";
// import Sale from "../../models/salemodel.js";
// import { uploadToCloudinary } from "../../utils/cloudinaryupload.js";

// export const createSale = async (req, res) => {
//     try {
//         const {
//             title,
//             startsAt: rawStartsAt,
//             endsAt: rawEndsAt,
//             products
//         } = req.body;

//         const parseDate = (str) => {
//             const [day, month, year] = str.split(/[\/\-]/).map(Number);
//             return new Date(year, month - 1, day);
//         };

//         const startsAt = parseDate(rawStartsAt);
//         const endsAt = parseDate(rawEndsAt);
//         if (!title || !startsAt || !endsAt) {
//             return res.status(400).json({ message: "Title, discount, start and end dates are required." });
//         }

//         if (new Date(startsAt) >= new Date(endsAt)) {
//             return res.status(400).json({ message: "End date must be after start date." });
//         }

//         const sale = new Sale({ title, startsAt, endsAt, isActive: true });
//         await sale.save();

//         const productIds = [];

//         for (const item of products) {
//             const product = await Product.findById(item.productId);
//             if (!product || product.price <= 0) continue;

//             const discount = (product.price * item.discountPercent) / 100;
//             const salePrice = parseFloat((product.price - discount).toFixed(2));

//             await Product.findByIdAndUpdate(product._id, {
//                 salePrice,
//                 discountPercent: item.discountPercent,
//                 onSale: true,
//                 saleEndsAt: endsAt,
//                 saleId: sale._id
//             });

//             productIds.push(product._id);
//         }

//         let coverImage = null;
//         if (req.file) {
//             const result = await uploadToCloudinary(req.file, "e-commerce sales");
//             coverImage = {
//                 url: result.secure_url,
//                 public_id: result.public_id
//             };
//         }
//         sale.products = productIds;
//         if (coverImage) sale.coverImage = coverImage;
//         await sale.save();

//         res.status(201).json({
//             message: `Sale created and applied to ${productIds.length} products.`,
//             sale,
//             updatedProducts: productIds
//         });
//     } catch (error) {
//         console.error("Create sale error:", error);
//         res.status(500).json({ message: "Failed to create sale.", error: error.message });
//     }
// }

// export const getActiveSales = async (req, res) => {
//     try {
//         const now = new Date();
//         await Sale.updateMany({ endsAt: { $lt: now }, isActive: true }, { $set: { isActive: false } });

//         const sales = await Sale.find({
//             startsAt: { $lte: now },
//             endsAt: { $gte: now },
//             isActive: true
//         }).populate("products", "title slug imageUrl price salePrice onSale discountPercent");

//         const formattedSales = sales.map(sale => ({
//             _id: sale._id,
//             title: sale.title,
//             coverImage: sale.coverImage,
//             endsAt: sale.endsAt,
//             timeLeft: new Date(sale.endsAt).getTime() - Date.now(),
//             products: sale.products.map(product => ({
//                 _id: product._id,
//                 title: product.title,
//                 slug: product.slug,
//                 imageUrl: product.imageUrl,
//                 price: product.price,
//                 salePrice: product.salePrice,
//                 discountPercent: product.discountPercent,
//                 onSale: product.onSale
//             }))
//         }));

//         res.status(200).json(formattedSales);
//     } catch (error) {
//         res.status(500).json({ message: "Failed to fetch active sales.", error: error.message });
//     }
// };
