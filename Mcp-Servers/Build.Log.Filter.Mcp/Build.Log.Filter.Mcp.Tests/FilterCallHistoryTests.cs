using Build.Log.Filter.Mcp.Models;
using Build.Log.Filter.Mcp.Streaming;

namespace Build.Log.Filter.Mcp.Tests;

public class FilterCallHistoryTests
{
    [Fact]
    public void Record_And_GetLast_Returns_Entries_Newest_First()
    {
        var history = new FilterCallHistory();

        history.Record(new FilterCallRecord(DateTime.UtcNow, "DotnetBuild", new string('a', 1000), new string('b', 200)));
        history.Record(new FilterCallRecord(DateTime.UtcNow, "NgBuild", new string('a', 2000), new string('b', 500)));

        var entries = history.GetLast(10);

        Assert.Equal(2, entries.Count);
        Assert.Equal("NgBuild", entries[0].ToolType);
        Assert.Equal("DotnetBuild", entries[1].ToolType);
    }

    [Fact]
    public void GetLast_With_Empty_History_Returns_Empty_List()
    {
        var history = new FilterCallHistory();

        var entries = history.GetLast(10);

        Assert.Empty(entries);
    }

    [Fact]
    public void Ringbuffer_Drops_Oldest_When_Over_Max()
    {
        var history = new FilterCallHistory();
        const int maxEntries = 100;

        for (var i = 1; i <= maxEntries + 5; i++)
            history.Record(new FilterCallRecord(DateTime.UtcNow, $"Tool{i}", new string('a', i * 100), new string('b', i * 10)));

        var entries = history.GetLast(maxEntries);

        Assert.Equal(maxEntries, entries.Count);
        // Newest should be Tool105, oldest kept should be Tool6 (first five dropped)
        Assert.Equal($"Tool{maxEntries + 5}", entries[0].ToolType);
        Assert.Equal("Tool6", entries[maxEntries - 1].ToolType);
    }

    [Fact]
    public void GetLast_Respects_Count_Parameter()
    {
        var history = new FilterCallHistory();

        for (var i = 1; i <= 10; i++)
            history.Record(new FilterCallRecord(DateTime.UtcNow, $"Tool{i}", new string('a', 100), new string('b', 50)));

        var entries = history.GetLast(3);

        Assert.Equal(3, entries.Count);
        Assert.Equal("Tool10", entries[0].ToolType);
        Assert.Equal("Tool8", entries[2].ToolType);
    }

    [Fact]
    public void AccumulateStreamInput_And_RecordStream_Creates_Correct_Entry()
    {
        var history = new FilterCallHistory();

        history.AccumulateStreamInput("session1", new string('a', 500));
        history.AccumulateStreamInput("session1", new string('b', 300));
        history.AccumulateStreamInput("session1", new string('c', 200));

        history.RecordStream("session1", "DotnetTest", new string('d', 150));

        var entries = history.GetLast(10);

        Assert.Single(entries);
        Assert.Equal(1000, entries[0].InputChars);
        Assert.Equal(150, entries[0].OutputChars);
        Assert.Equal(850, entries[0].SavedChars);
        Assert.Equal(85.0, entries[0].SavedPercent);
        Assert.Equal("DotnetTest", entries[0].ToolType);
    }

    [Fact]
    public void RecordStream_Without_Accumulation_Does_Not_Record()
    {
        var history = new FilterCallHistory();

        history.RecordStream("unknown_session", "DotnetBuild", "some output");

        Assert.Empty(history.GetLast(10));
    }

    [Fact]
    public void SavedPercent_Is_Zero_When_InputChars_Is_Zero()
    {
        var record = new FilterCallRecord(DateTime.UtcNow, "Test", "", "");

        Assert.Equal(0, record.SavedPercent);
    }

    [Fact]
    public void Record_Stores_Full_Input_And_Output_Text()
    {
        var history = new FilterCallHistory();
        var input = "error CS1234: Something went wrong\nwarning CS5678: Minor issue";
        var output = "error CS1234: Something went wrong";

        history.Record(new FilterCallRecord(DateTime.UtcNow, "DotnetBuild", input, output));

        var entries = history.GetLast(1);

        Assert.Single(entries);
        Assert.Equal(input, entries[0].InputValue);
        Assert.Equal(output, entries[0].OutputValue);
        Assert.Equal(input.Length, entries[0].InputChars);
        Assert.Equal(output.Length, entries[0].OutputChars);
    }

    [Fact]
    public void Clear_Removes_All_Entries()
    {
        var history = new FilterCallHistory();

        history.Record(new FilterCallRecord(DateTime.UtcNow, "DotnetBuild", "input1", "output1"));
        history.Record(new FilterCallRecord(DateTime.UtcNow, "NgBuild", "input2", "output2"));
        history.AccumulateStreamInput("session1", "chunk1");

        history.Clear();

        Assert.Empty(history.GetLast(10));
    }

    [Fact]
    public void Id_Is_Ten_Characters_Long()
    {
        var record = new FilterCallRecord(DateTime.UtcNow, "DotnetBuild", "some input", "some output");

        Assert.Equal(10, record.Id.Length);
    }

    [Fact]
    public void Id_Is_Deterministic_For_Same_Input()
    {
        var timestamp = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        var record1 = new FilterCallRecord(timestamp, "DotnetBuild", "input", "output1");
        var record2 = new FilterCallRecord(timestamp, "DotnetBuild", "input", "output2");

        Assert.Equal(record1.Id, record2.Id);
    }

    [Fact]
    public void Id_Differs_For_Different_Input()
    {
        var timestamp = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        var record1 = new FilterCallRecord(timestamp, "DotnetBuild", "input1", "output");
        var record2 = new FilterCallRecord(timestamp, "DotnetBuild", "input2", "output");

        Assert.NotEqual(record1.Id, record2.Id);
    }

    [Fact]
    public void Id_Differs_For_Different_ToolType()
    {
        var timestamp = new DateTime(2026, 1, 1, 12, 0, 0, DateTimeKind.Utc);
        var record1 = new FilterCallRecord(timestamp, "DotnetBuild", "input", "output");
        var record2 = new FilterCallRecord(timestamp, "NgBuild", "input", "output");

        Assert.NotEqual(record1.Id, record2.Id);
    }

    [Fact]
    public void GetById_Returns_Matching_Record()
    {
        var history = new FilterCallHistory();
        var record = new FilterCallRecord(DateTime.UtcNow, "DotnetBuild", "input", "output");
        history.Record(record);

        var found = history.GetById(record.Id);

        Assert.NotNull(found);
        Assert.Equal(record.Id, found.Id);
        Assert.Equal("input", found.InputValue);
    }

    [Fact]
    public void GetById_Returns_Null_For_Unknown_Id()
    {
        var history = new FilterCallHistory();
        history.Record(new FilterCallRecord(DateTime.UtcNow, "DotnetBuild", "input", "output"));

        var found = history.GetById("0000000000");

        Assert.Null(found);
    }
}
