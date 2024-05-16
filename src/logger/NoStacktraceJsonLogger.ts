import { JsonLogger, LogEntry, LogEntryInput, createLogEntry } from '..'

export class NoStacktraceJsonLogger extends JsonLogger {
    logMessage(logEntryInput: LogEntryInput): void {
        const {
            dateFunction,
            logMessage,
            loglevel,
            error,
            customErrorName,
            context,
        } = logEntryInput

        const logEntry: LogEntry = createLogEntry({
            context,
            customErrorName,
            dateFunction,
            error,
            logMessage,
            loggerName: this.loggerName,
            loglevel,
            serviceName: this.serviceName,
        })
        logEntry.stacktrace = undefined
        this.loggerConsole.log(JSON.stringify(logEntry))
    }
}
