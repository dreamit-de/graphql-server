import { JsonLogger, LogEntry, LogEntryInput, createLogEntry } from '..'
import { Console } from 'node:console'

export class NoStacktraceJsonLogger extends JsonLogger {
    loggerConsole: Console = new Console(process.stdout, process.stderr, false)
    logMessage(logEntryInput: LogEntryInput): void {
        const { logMessage, loglevel, error, customErrorName, context } =
            logEntryInput

        const logEntry: LogEntry = createLogEntry({
            context,
            customErrorName,
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
