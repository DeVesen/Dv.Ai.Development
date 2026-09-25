'use strict';

class OrderRepository {
  constructor(store) {
    this.store = store;
  }

  async findById(orderId) {
    return this.store.get(orderId) ?? null;
  }
}

module.exports = { OrderRepository };
