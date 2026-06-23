# Service Unit-Test — Jasmine + TestBed

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SearchFilterBufferPersistService } from './search-filter-buffer-persist.service';
import { SearchApiService } from './api/search-api.service';

describe('SearchFilterBufferPersistService', () => {
  let service: SearchFilterBufferPersistService;
  let searchApi: jasmine.SpyObj<SearchApiService>;

  beforeEach(() => {
    searchApi = jasmine.createSpyObj<SearchApiService>('SearchApiService', ['saveFilterBuffer']);
    searchApi.saveFilterBuffer.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      providers: [
        SearchFilterBufferPersistService,
        { provide: SearchApiService, useValue: searchApi },
      ],
    });

    service = TestBed.inject(SearchFilterBufferPersistService);
  });

  it('schedulePersist_GivenGridSnapshot_WithValidColumns_CallsSaveFilterBuffer', () => {
    // Arrange
    const dto = createSearchFilterBufferDto();

    // Act
    service.schedulePersist(dto);

    // Assert
    expect(searchApi.saveFilterBuffer).toHaveBeenCalledWith(
      jasmine.objectContaining({ gridColumnsJson: dto.gridColumnsJson }),
    );
  });
});
```

Orientierung: `search-filter-buffer-persist.service.spec.ts`.
