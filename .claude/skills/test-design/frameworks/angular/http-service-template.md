# HTTP-Service-Test — HttpTestingController

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ParameterService } from './parameter.service';
import { BoSuggestionRequestModel } from '../../Interfaces/bo';

describe('ParameterService', () => {
  let service: ParameterService;
  let httpMock: HttpTestingController;

  const taskId = 'task-1';
  const setupId = 'setup-1';
  const boSuggestionRoute = `/api/bo/task/${taskId}/setup/${setupId}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ParameterService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ParameterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sendBoSuggestion_GivenTaskAndSetup_WithConfigurationsBody_PostsToExpectedRoute', () => {
    // Arrange
    const body: BoSuggestionRequestModel = { configurations: [/* … */] };

    // Act
    service.sendBoSuggestion(taskId, setupId, body).subscribe();

    // Assert
    const req = httpMock.expectOne(boSuggestionRoute);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });
});
```

Orientierung: `parameter.service.spec.ts`.
