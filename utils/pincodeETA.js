export const estimateDeliveryByPincode = (pincode) => {
    const fastZones = ["110001", "400001", "560001"];
    if(fastZones.includes(pincode)) return 3;
    return 7;
};