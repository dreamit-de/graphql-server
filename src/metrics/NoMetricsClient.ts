/* eslint-disable no-empty-function, no-useless-constructor */
import type { MetricsClient } from '@dreamit/graphql-server-base'

/**
 * Metrics client that does not collect any metrics.
 */
export class NoMetricsClient implements MetricsClient {
    constructor() {}
    initMetrics(): void {}
    setAvailability(): void {}
    increaseRequestThroughput(): void {}
    increaseErrors(): void {}
    getMetricsContentType(): string {
        return ''
    }
    getMetrics(): Promise<string> {
        return new Promise((resolve) => {
            resolve('')
        })
    }
}
