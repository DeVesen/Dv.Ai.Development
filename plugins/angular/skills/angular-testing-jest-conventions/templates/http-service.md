# HTTP-Service-Test — HttpTestingController

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrderApiService } from './order-api.service';
import { CreateOrderRequest } from '../../interfaces/order';

describe('OrderApiService', () => {
  let service: OrderApiService;
  let httpMock: HttpTestingController;

  const taskId = 'task-1';
  const orderId = 'order-1';
  const createOrderRoute = `/api/tasks/${taskId}/orders/${orderId}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OrderApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(OrderApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('createOrder_GivenTaskAndOrder_WithRequestBody_PostsToExpectedRoute', () => {
    // Arrange
    const body: CreateOrderRequest = { name: 'Test Order' };

    // Act
    service.createOrder(taskId, orderId, body).subscribe();

    // Assert
    const req = httpMock.expectOne(createOrderRoute);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });
});
```
