import type { LogEntry, LogEntryInput } from '@dreamit/graphql-server-base'
import { JsonLogger } from './JsonLogger'

export class NoStacktraceJsonLogger extends JsonLogger {
    createLogEntry(logEntryInput: LogEntryInput): LogEntry {
        const logEntry = super.createLogEntry(logEntryInput)
        logEntry.stacktrace = undefined
        return logEntry
    }
}
