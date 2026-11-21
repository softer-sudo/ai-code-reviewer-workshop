// pricing helpers
export function calculateTotal(items, discount) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.qty;
  }
  return total - discount;
}

export const applyCoupon = (total, coupon) => {
  if (!coupon) return total;
  return total * (1 - coupon.percent / 100);
};
