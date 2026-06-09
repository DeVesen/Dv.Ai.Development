using Xunit;

namespace SampleApp.Tests;

public class PersonRecordTests
{
    [Fact]
    public void Has_Name()
    {
        var p = new PersonRecord("Bob", 42);
        Assert.Equal("Bob", p.Name);
    }
}
