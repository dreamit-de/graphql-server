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
    debug(): void {}
    error(): void {}
    info(): void {}
    warn(): void {}
}
