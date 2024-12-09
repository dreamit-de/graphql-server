import { LogEntry } from './LogEntry'
import { TextLogger } from './TextLogger'

export class NoStacktraceTextLogger extends TextLogger {
    prepareLogOutput(logEntry: LogEntry, context: unknown): string {
        logEntry.stacktrace = undefined
        return super.prepareLogOutput(logEntry, context)
    }
}
