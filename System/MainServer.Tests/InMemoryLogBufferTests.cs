using MainServer.Logging;

namespace MainServer.Tests;

public class InMemoryLogBufferTests
{
    [Fact]
    public void Append_RemovesOldestWhenOverCapacity()
    {
        var buffer = new InMemoryLogBuffer(maxLines: 3);
        buffer.Append("a");
        buffer.Append("b");
        buffer.Append("c");
        buffer.Append("d");

        Assert.Equal(new[] { "b", "c", "d" }, buffer.Snapshot());
    }
}
