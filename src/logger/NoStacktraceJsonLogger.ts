import { JsonLogger } from './JsonLogger'
import { LogEntry } from './LogEntry'
import { LogEntryInput } from './LogEntryInput'

export class NoStacktraceJsonLogger extends JsonLogger {
    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const logEntry = super.createLogEntry(logEntryInput)
        logEntry.stacktrace = undefined
        return logEntry
    }
}
