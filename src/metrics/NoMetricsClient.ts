/* eslint-disable @typescript-eslint/no-empty-function */

import { MetricsClient } from '..'

/**
 * Metrics client that does not collect any metrics.
 */
export class NoMetricsClient implements MetricsClient {
    initMetrics(): void {}
    setAvailability(): void {}
    increaseRequestThroughput(): void {}
    increaseErrors(): void {}
    getMetricsContentType(): string {
        return ''
    }
    getMetrics(): Promise<string> {
        return new Promise((resolve) => {resolve('')})
    }
}
