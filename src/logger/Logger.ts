export interface Logger {
    readonly loggerName: string
    readonly serviceName: string

    debug(logMessage: string): void
    error(logMessage: string, error: Error): void
    info(logMessage: string): void
    warn(logMessage: string): void
}
