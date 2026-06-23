# Namenskonvention und AAA — Angular-Beispiele

Schema und Regeln: [references/naming-and-aaa.md](../../references/naming-and-aaa.md).

## Service-Test (`it`)

```typescript
it('sendBoSuggestion_GivenTaskAndSetup_WithConfigurationsBody_PostsToExpectedRoute', () => {
  // Arrange
  const taskId = 'task-1';
  const setupId = 'setup-1';
  const body = createBoSuggestionBody();

  // Act
  service.sendBoSuggestion(taskId, setupId, body).subscribe();

  // Assert
  const req = httpMock.expectOne(`/api/bo/task/${taskId}/setup/${setupId}`);
  expect(req.request.method).toBe('POST');
  expect(req.request.body).toEqual(body);
  req.flush({});
});
```

## Guard-Test

```typescript
it('canDeactivate_GivenComponentReturnsFalse_WithNoDialog_DoesNotOpenDialog', async () => {
  // Arrange
  const component: CanComponentDeactivate = {
    canDeactivate: () => Promise.resolve(false),
  };

  // Act
  const result = await guard.canDeactivate(component);

  // Assert
  expect(result).toBe(false);
  expect(dialog.open).not.toHaveBeenCalled();
});
```

## Gruppierung mit `describe`

Bestehende Specs dürfen `describe('methodName')` behalten. **Neue** `it` in solchen Blöcken nach Konvention benennen:

```typescript
describe('ParameterSearchService', () => {
  describe('hasFilters', () => {
    it('hasFilters_GivenNoFilters_ReturnsFalse', () => {
      expect(service.hasFilters()).toBe(false);
    });

    it('hasFilters_GivenSetFilterValue_WithSingleEntry_ReturnsTrue', () => {
      service.setFilterValue('Task.Name', 'x');
      expect(service.hasFilters()).toBe(true);
    });
  });
});
```

## Bestand: bestehende Namen

Specs mit `it('should …')` oder natürlichsprachlichen Namen **nicht** umbenennen, solange der Test nicht ohnehin geändert wird. Neue Tests in derselben Datei nach Schema benennen.
