import { applyCoupon, calculateTotal } from './pricing.js';

export const pay = (cart, coupon) => applyCoupon(calculateTotal(cart.items, 0), coupon);
