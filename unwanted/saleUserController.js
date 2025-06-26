// import Sale from "../../models/salemodel.js";

// export const getHomePageSales = async (req, res) => {
//     try {
//         const now = new Date();
//         const activeSales = await Sale.find({
//             startsAt: { $lte: now },
//             endsAt: { $gte: now },
//             isActive: true
//         }).populate("products", "title slug imageUrl price salePrice onSale")
//             .select("title discountPercent coverImage products endsAt")
//             .sort({ discountPercent: -1 });

//         const formattedSales = activeSales
//             .filter(sale => sale.products.length > 0)
//             .map(sale => ({
//                 ...sale._doc,
//                 timeLeft: new Date(sale.endsAt).getTime() - Date.now()
//             }));

//         res.status(200).json({ success: true, sales: formattedSales });
//     } catch (error) {
//         res.status(500).json({ message: "Failed to load homepage sales.", error: error.message });
//     }
// };

// export const getUpComingSales = async (req, res) => {
//     try {
//         const now = new Date();
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 5;
//         const minDiscount = parseInt(req.query.minDiscount) || 0;
//         const highlightOnly = req.query.highlight === "true";

//         const query = {
//             startsAt: { $gt: now },
//             isActive: true,
//             discountPercent: { $gte: minDiscount }
//         }

//         if (highlightOnly) query.highlight = true;
        
//         const total = await Sale.countDocuments(query);
//         const sales = await Sale.find(query)
//             .populate("products", "title slug imageUrl price")
//             .select("title discountPercent coverImage startsAt products highlight")
//             .sort({ startsAt: 1 })
//             .skip((page - 1) * limit)
//             .limit(limit);

//         const formattedSales = sales
//             .map(sale => ({
//                 ...sale._doc,
//                 timeUntilStart: new Date(sale.startsAt).getTime() - Date.now()
//             }));

//         res.status(200).json({ 
//             success: true,
//             total,
//             page,
//             pages: Math.ceil(total / limit),
//             sales: formattedSales
//         });
//     } catch (error) {
//         res.status(500).json({ message: "Failed to load homepage sales.", error: error.message });
//     }
// }

// export const getSaleDetails = async (req, res) => {
//     try {
//         const { id } = req.params;
//         if(!id) return res.status(400).json({message: "SaleId is required."});

//         const sale = await Sale.findById(id)
//         .populate("products", "title slug price salePrice imageUrl rating")
//         .select("title discountPercent coverImage startsAt endsAt description products");

//         if(!sale) return res.status(404).json({message: "sale not found."});

//         const now = new Date();
//         const status = (now >= sale.startsAt && now <= sale.endsAt) ? "active"
//                       : (now < sale.startsAt) ? "upcoming" : "expired";

//         res.status(200).json({
//             success: true,
//             sale,
//             status,
//             timeLeft: status === "active" ? sale.endsAt.getTime() - now.getTime() : null,
//             timeUntilStart: status === "upcoming" ? sale.startsAt.getTime() - now.getTime() : null
//         });

//     } catch (error) {
//         return res.status(500).json({ message: "Failed to fetch sales details.", error: error.message });
//     }
// }