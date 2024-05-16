/* eslint-disable @typescript-eslint/no-unused-vars */
import { DateFunction } from '@dreamit/funpara'
import { Logger } from '@dreamit/graphql-server-base'

/**
 * Logger implementation that does not log or output anything.
 */
export class NoLogger implements Logger {
    loggerName: string
    serviceName: string
    debugEnabled: boolean

    /**
     * Creates a new instance of Logger.
     * @param {string} loggerName - The logger name of the logger.
     * @param {string} serviceName - The service name of the logger.
     */
    constructor(loggerName: string, serviceName: string) {
        this.loggerName = loggerName
        this.serviceName = serviceName
        this.debugEnabled = false
    }
    debug(
        logMessage: string,
        context?: unknown,
        dateFunction?: DateFunction,
    ): void {}
    error(
        logMessage: string,
        error: Error,
        customErrorName?: string,
        context?: unknown,
        dateFunction?: DateFunction,
    ): void {}
    info(
        logMessage: string,
        context?: unknown,
        dateFunction?: DateFunction,
    ): void {}
    warn(
        logMessage: string,
        context?: unknown,
        dateFunction?: DateFunction,
    ): void {}
}
