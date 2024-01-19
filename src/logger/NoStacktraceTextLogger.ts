import { LogEntry, TextLogger } from '..'

export class NoStacktraceTextLogger extends TextLogger {
    prepareLogOutput(logEntry: LogEntry): string {
        return (
            `${logEntry.timestamp} [${logEntry.level.toUpperCase()}]` +
            `${this.loggerName}-${this.serviceName} :` +
            `${logEntry.message}`
        )
    }
}
