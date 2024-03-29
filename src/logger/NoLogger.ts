/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger } from '@dreamit/graphql-server-base'

/**
 * Logger implementation that does not log or output anything.
 */
export class NoLogger implements Logger {
    loggerName: string
    serviceName: string
    debugEnabled = false

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * @param {string} serviceName - The service name of the logger.
     */
    constructor(loggerName: string, serviceName: string) {
        this.loggerName = loggerName
        this.serviceName = serviceName
    }
    debug(logMessage: string, context?: unknown): void {}
    error(
        logMessage: string,
        error: Error,
        customErrorName?: string,
        context?: unknown,
    ): void {}
    info(logMessage: string, context?: unknown): void {}
    warn(logMessage: string, context?: unknown): void {}
}
