export interface Logger {
    readonly loggerName: string
    readonly serviceName: string
    readonly debugEnabled: boolean

    debug(logMessage: string, context?: unknown): void
    logDebugIfEnabled(message: string, context?: unknown): void
    error(logMessage: string,
        error: Error,
        customErrorName: string,
        context?: unknown): void
    info(logMessage: string, context?: unknown): void
    warn(logMessage: string, context?: unknown): void
}
