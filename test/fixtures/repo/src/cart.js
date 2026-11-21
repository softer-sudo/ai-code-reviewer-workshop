import { calculateTotal } from './pricing.js';

export function cartTotal(cart) {
  return calculateTotal(cart.items, cart.discount);
}
