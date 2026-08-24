# Service Unit-Test — Jest + TestBed

```typescript
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { SearchFilterBufferPersistService } from './search-filter-buffer-persist.service';
import { SearchApiService } from './api/search-api.service';

describe('SearchFilterBufferPersistService', () => {
  let service: SearchFilterBufferPersistService;
  let searchApi: jest.Mocked<SearchApiService>;

  beforeEach(() => {
    searchApi = { saveFilterBuffer: jest.fn() } as unknown as jest.Mocked<SearchApiService>;
    searchApi.saveFilterBuffer.mockReturnValue(of(void 0));

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
      expect.objectContaining({ gridColumnsJson: dto.gridColumnsJson }),
    );
  });
});
```
