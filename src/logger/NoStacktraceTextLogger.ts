import { LogEntry, TextLogger } from '../'

export class NoStacktraceTextLogger extends TextLogger {
    prepareLogOutput(logEntry: LogEntry, context: unknown): string {
        logEntry.stacktrace = undefined
        return super.prepareLogOutput(logEntry, context)
    }
}
