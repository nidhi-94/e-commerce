import User from "../models/usermodel.js";
import Order from "../models/ordermodel.js";

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select("-password");
        console.log("Looking up user ID:", req.user.userId);

        if(!user) return res.status(404).json({message: "User not found."});
        res.json(user);
       
    } catch (error) {
        res.status(500).json({message: "Failed to load dashboard.", error: error.message});
    }
};

export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if(!user) {
            console.log("User not found for ID:", req.user.userId);
            return res.status(404).json({message: "User not found"});
        }

        const { name, email, password } = req.body;
        if(name) user.name = name;
        if(email) user.email = email;
        if(password) user.password = password;
        
        await user.save();
        res.json({message: "Profile updated", user: {name: user.name, email: user.email}});
    } catch (error) {
        res.status(500).json({error:error.message});
    }
};

export const getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({user: req.user.userId}).sort({ createdAt: -1});
        res.json(orders);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}