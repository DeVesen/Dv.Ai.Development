'use strict';

class OrderService {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }
}

module.exports = { OrderService };
