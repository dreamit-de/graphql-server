import {Logger} from './Logger'
import {Console} from 'console'
import {LogLevel} from './LogLevel'
import {LogEntry} from './LogEntry'
import {LogHelper} from './LogHelper'

const loggerConsole: Console = new Console(process.stdout, process.stderr, false)

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonLogger implements Logger {
    loggerName = 'test'
    serviceName: string

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be output to "logger" field in JSON.
     * @param {string} serviceName - The service name of the logger.
     * Used to identify the graphql server and can be used to differentiate
     * it from remote graphql services like in a gateway setup.
     * Will be output to "serviceName" field in JSON.
     */
    constructor(loggerName: string, serviceName: string) {
        this.loggerName = loggerName
        this.serviceName = serviceName
    }

    debug(logMessage: string): void {
        this.logMessage(logMessage, LogLevel.debug)
    }

    error(logMessage: string, error: Error): void {
        this.logMessage(logMessage, LogLevel.error, error)
    }

    info(logMessage: string): void {
        this.logMessage(logMessage, LogLevel.info)
    }

    warn(logMessage: string): void {
        this.logMessage(logMessage, LogLevel.warn)
    }

    logMessage(logMessage: string, loglevel: LogLevel, error?: Error): void {
        const logEntry: LogEntry = LogHelper.createLogEntry(logMessage,
            loglevel,
            this.loggerName,
            this.serviceName,
            error)
        loggerConsole.log(JSON.stringify(logEntry))
    }
}
