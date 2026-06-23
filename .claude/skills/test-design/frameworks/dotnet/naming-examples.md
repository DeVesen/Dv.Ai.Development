# Namenskonvention und AAA — .NET-Beispiele

Schema und Regeln: [references/naming-and-aaa.md](../../references/naming-and-aaa.md).

## Ohne Parameter

```csharp
[Fact]
public void GetAll_GivenNoEntries_ReturnsEmptyList()
{
    // Arrange
    var service = new ConsoleLogService();

    // Act
    var logs = service.GetAll();

    // Assert
    logs.Should().BeEmpty();
}
```

## Mit direkten Parametern

```csharp
[Fact]
public void Add_GivenEmptyLog_WithFrontendInfoMessage_StoresSingleEntry()
{
    // Arrange
    var service = new ConsoleLogService();

    // Act
    service.Add("Frontend", "Info", "Application started");

    // Assert
    service.GetAll().Should().ContainSingle()
        .Which.Message.Should().Be("Application started");
}
```

## Arrange baut Zustand, dann Calculate o. Ä.

```csharp
[Fact]
public async Task Calculate_GivenTwoParametersInDb_WithTaskId_ReturnsAggregatedValues()
{
    // Arrange
    var taskId = Guid.NewGuid();
    await SeedParametersAsync(taskId, count: 2);

    // Act
    var result = await _sut.Calculate(taskId);

    // Assert
    result.Values.Should().HaveCount(2);
}
```

## Parametrisiert (`[Theory]`)

Methodenname = Szenario-Klasse; konkrete Werte in `InlineData`:

```csharp
[Theory]
[InlineData("Frontend", "Info", "Started")]
[InlineData("Backend", "Warning", "Slow request")]
public void Add_GivenEmptyLog_WithValidEntry_StoresEntryWithMatchingFields(
    string source, string level, string message)
{
    // Arrange
    var service = new ConsoleLogService();

    // Act
    service.Add(source, level, message);

    // Assert
    service.GetAll().Should().ContainSingle()
        .Which.Source.Should().Be(source);
}
```

## NUnit/MSTest (Bestand erweitern)

Gleiche Namens- und AAA-Regeln; Attribute des bestehenden Frameworks beibehalten (`[Test]` / `[TestMethod]` statt `[Fact]`). Neue Methoden in bestehenden NUnit/MSTest-Klassen nach Konvention benennen — Klasse nicht auf xUnit umstellen.
