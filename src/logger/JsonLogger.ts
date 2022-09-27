import {Console} from 'node:console'
import {
    GraphQLServerRequest,
    Logger,
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

    debug(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.debug, request, undefined, undefined, context)
    }

    logDebugIfEnabled(message: string, request?: GraphQLServerRequest, context?: unknown): void {
        if (this.debugEnabled) {
            this.debug(message, request, context)
        }
    }

    error(logMessage: string,
        error: Error,
        customErrorName: string,
        request?: GraphQLServerRequest,
        context?: unknown): void {
        this.logMessage(logMessage, LogLevel.error, request, error, customErrorName, context)
    }

    info(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.info, request, undefined, undefined, context)
    }

    warn(logMessage: string, request?: GraphQLServerRequest, context?: unknown): void {
        this.logMessage(logMessage, LogLevel.warn, request, undefined, undefined, context)
    }

    logMessage(logMessage: string,
        loglevel: LogLevel,
        request?: GraphQLServerRequest,
        error?: Error,
        customErrorName?: string,
        context?: unknown): void {
        const logEntry: LogEntry = LogHelper.createLogEntry(logMessage,
            loglevel,
            this.loggerName,
            this.serviceName,
            request,
            error,
            customErrorName,
            context)
        loggerConsole.log(JSON.stringify(logEntry))
    }
}
