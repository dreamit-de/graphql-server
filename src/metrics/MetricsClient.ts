import {GraphQLServerRequest} from '..'

/**
 * Interface for collecting GraphQL server metrics
 */
export interface MetricsClient {
    // Initializes/sets up the metrics
    initMetrics(): void

    /**
     * Sets the availability for the GraphQL server.
     * Most likely used with 0 (not available) and 1 (available)
     */
    setAvailability(value: number): void
    // Increases the number of requests (by 1)
    increaseRequestThroughput(request?: GraphQLServerRequest): void

    /**
     * Increases the error counter (by 1)
     * @param {string} label - A label to specify what kind error occurred
     * @param {GraphQLServerRequest} request - The initial request
     */
    increaseErrors(label: string, request?: GraphQLServerRequest): void
    // Gets the Content-Type of the metrics for use in the response headers.
    getMetricsContentType(): string
    // Gets the metrics for use in the response body.
    getMetrics(): Promise<string>
}
