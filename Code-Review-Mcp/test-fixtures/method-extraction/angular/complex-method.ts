export class OrderProcessor {
  // Short method — below thresholds, must produce no candidates.
  shortMethod(x: number): number {
    return x + 1;
  }

  processOrder(order: { id: string }, items: { sku: string; qty: number }[], discountConfig: { pct: number }) {
    let total = 0;
    let valid = true;

    // validate order items
    for (const item of items) {
      if (!item.sku || item.qty <= 0) {
        valid = false;
        break;
      }
      if (item.qty > 100) {
        valid = false;
      }
    }
    if (!valid) {
      throw new Error('invalid items');
    }

    // apply discount rules
    for (const item of items) {
      let price = item.qty * 10;
      if (discountConfig.pct > 0) {
        price = price * (1 - discountConfig.pct / 100);
      }
      if (order.id.startsWith('VIP')) {
        price = price * 0.9;
      }
      total += price;
    }

    if (total > 1000) {
      total = total * 0.95;
    } else if (total > 500) {
      total = total * 0.98;
    }

    return total;
  }
}
