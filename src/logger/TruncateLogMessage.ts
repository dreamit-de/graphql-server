import { LogEntry } from '..'

export function truncateLogMessage(
    logEntry: LogEntry,
    truncateLimit = 0,
    truncatedText = '_TRUNCATED_',
): LogEntry {
    if (
        truncateLimit > 0 &&
        logEntry.message.length > truncateLimit + truncatedText.length
    ) {
        logEntry.message =
            truncateLimit > truncatedText.length
                ? logEntry.message.slice(
                      0,
                      truncateLimit - truncatedText.length,
                  ) + truncatedText
                : logEntry.message.slice(0, truncateLimit)
    }
    return logEntry
}
