import mongoose from "mongoose";

export const generateUniqueId = async (prefix, modelName, field) => {
    let isUnique = false;
    let finalId = "";

    while(!isUnique){
        const randomCode =  Math.random().toString(36).substring(2, 5).toUpperCase();
        finalId = `${prefix}-${randomCode}`;

        const exists = await mongoose.models[modelName].findOne({ [field]: finalId });
        if(!exists) isUnique = true;
    }
    return finalId;
};