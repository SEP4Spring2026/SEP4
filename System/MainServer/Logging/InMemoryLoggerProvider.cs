using Microsoft.Extensions.Logging;

namespace MainServer.Logging;

public sealed class InMemoryLoggerProvider : ILoggerProvider
{
    private readonly InMemoryLogBuffer _buffer;

    public InMemoryLoggerProvider(InMemoryLogBuffer buffer)
    {
        _buffer = buffer;
    }

    public ILogger CreateLogger(string categoryName) => new BufferLogger(categoryName, _buffer);

    public void Dispose()
    {
    }

    private sealed class BufferLogger : ILogger
    {
        private readonly string _category;
        private readonly InMemoryLogBuffer _buffer;

        public BufferLogger(string category, InMemoryLogBuffer buffer)
        {
            _category = category;
            _buffer = buffer;
        }

        public IDisposable BeginScope<TState>(TState state) where TState : notnull => NullScope.Instance;

        public bool IsEnabled(LogLevel logLevel) => logLevel != LogLevel.None;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel))
                return;

            var message = formatter(state, exception);
            var line = $"{DateTime.UtcNow:yyyy-MM-dd'T'HH:mm:ss.fff}Z [{logLevel}] {_category}: {message}";
            _buffer.Append(line);

            if (exception != null)
                _buffer.Append(exception.ToString());
        }

        private sealed class NullScope : IDisposable
        {
            public static readonly NullScope Instance = new();
            public void Dispose()
            {
            }
        }
    }
}
