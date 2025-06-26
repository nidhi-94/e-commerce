export const validateOrderInput = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ message: "Request body is required." });
  }

  const { shippingAddress, paymentMethod } = req.body;

  if (!shippingAddress || !paymentMethod) {
    return res.status(400).json({ message: "Missing address or payment method." });
  }

  next();
};
