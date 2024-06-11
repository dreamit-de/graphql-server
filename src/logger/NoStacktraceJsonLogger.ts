import { JsonLogger, LogEntry, LogEntryInput } from '../'

export class NoStacktraceJsonLogger extends JsonLogger {
    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const logEntry = super.createLogEntry(logEntryInput)
        logEntry.stacktrace = undefined
        return logEntry
    }
}
