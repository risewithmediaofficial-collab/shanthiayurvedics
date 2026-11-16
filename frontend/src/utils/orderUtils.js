/**
 * Order Financial & Utility Helpers
 */

/**
 * Calculates the exact COD amount to collect at delivery doorstep.
 * If advance payment was made, COD collect can NEVER be the grand total / MRP.
 *
 * @param {Object} order
 * @returns {number}
 */
export function getEffectiveCodAmount(order) {
  if (!order) return 0;
  const pm = String(order.paymentMethod || '').trim().toUpperCase();
  if (pm !== 'COD' && pm !== 'CASH_ON_DELIVERY') return 0;

  const grand = Math.max(0, Number(order.grandTotal) || 0);
  const adv = Math.max(0, Number(order.advanceAmount) || 0);
  const maxCod = Math.max(0, grand - adv);

  // If advance amount was paid, COD collect amount CANNOT exceed (grand - adv)
  if (adv > 0) {
    if (
      order.codAmount !== undefined &&
      order.codAmount !== null &&
      order.codAmount !== '' &&
      Number(order.codAmount) > 0 &&
      Number(order.codAmount) <= maxCod
    ) {
      return Number(order.codAmount);
    }
    return maxCod;
  }

  // No advance payment
  if (
    order.codAmount !== undefined &&
    order.codAmount !== null &&
    order.codAmount !== '' &&
    Number(order.codAmount) > 0
  ) {
    return Number(order.codAmount);
  }

  return grand;
}
