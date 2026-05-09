namespace MainServer.Logging;

/// <summary>
/// Keeps the last N log lines for the public /api/logs endpoint.
/// </summary>
public sealed class InMemoryLogBuffer
{
    private readonly object _gate = new();
    private readonly List<string> _lines = new();
    private readonly int _maxLines;

    public InMemoryLogBuffer(int maxLines = 800)
    {
        _maxLines = Math.Clamp(maxLines, 1, 50_000);
    }

    public void Append(string line)
    {
        lock (_gate)
        {
            _lines.Add(line);
            while (_lines.Count > _maxLines)
                _lines.RemoveAt(0);
        }
    }

    public string[] Snapshot()
    {
        lock (_gate)
            return _lines.ToArray();
    }
}
