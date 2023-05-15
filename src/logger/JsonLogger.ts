import {Logger} from '@dreamit/graphql-server-base'
import {Console} from 'node:console'
import {
    LogEntry,
    LogHelper,
    LogLevel
} from '..'

const loggerConsole: Console = new Console(process.stdout, process.stderr, false)

/**
 * Logger implementation that outputs log entries as JSON text to console.
 * Can be useful for log aggregation tools.
 */
export class JsonLogger implements Logger {
    loggerName = 'test'
    debugEnabled = false
    serviceName: string

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * Will be output to "logger" field in JSON.
     * @param {string} serviceName - The service name of the logger.
     * Used to identify the graphql server and can be used to differentiate
     * it from remote graphql services like in a gateway setup.
     * Will be output to "serviceName" field in JSON.
     * @param {boolean} debugEnabled - If debug output should be enabled
     */
    constructor(loggerName: string, serviceName: string, debugEnabled = false) {
        this.loggerName = loggerName
        this.serviceName = serviceName
        this.debugEnabled = debugEnabled
    }

    debug(logMessage: string, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.debug, undefined, undefined, context)
    }

    logDebugIfEnabled(message: string, context?: unknown): void {
        if (this.debugEnabled) {
            this.debug(message, context)
        }
    }

    error(logMessage: string,
        error: Error,
        customErrorName: string,
        context?: unknown): void {
        this.logMessage(logMessage, LogLevel.error, error, customErrorName, context)
    }

    info(logMessage: string, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.info, undefined, undefined, context)
    }

    warn(logMessage: string, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.warn, undefined, undefined, context)
    }

    logMessage(logMessage: string,
        loglevel: LogLevel,
        error?: Error,
        customErrorName?: string,
        context?: unknown): void {
        const logEntry: LogEntry = LogHelper.createLogEntry(logMessage,
            loglevel,
            this.loggerName,
            this.serviceName,
            error,
            customErrorName,
            context)
        loggerConsole.log(JSON.stringify(logEntry))
    }
}
