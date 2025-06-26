export const calculateTaxAndShipping = (subTotal) => {
  let taxRate = 0.18;

  if (subTotal <= 8999) taxRate = 0.05;
  else if (subTotal <= 15999) taxRate = 0.12;
  else if (subTotal <= 35999) taxRate = 0.18;
  else taxRate = 0.28;

  const taxAmount = parseFloat((subTotal * taxRate).toFixed(2));
  const shippingCharges = subTotal >= 9999 ? 0 : 49;

  return { taxAmount, shippingCharges };
};
