import {
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INTROSPECTION_DISABLED_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    MetricsClient,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    VALIDATION_ERROR
} from '@sgohlke/graphql-server-base'

/**
 * Simple metrics client.
 * Mimics behaviour of prom-client without using the prom-client library.
 * Does not collect NodeJS metrics like cpu and memory usage.
 */
export class SimpleMetricsClient implements MetricsClient {
    readonly requestThroughputMetricName: string
    readonly availabilityMetricName: string
    readonly errorsMetricName: string
    graphQLServerAvailabilityGauge!: number
    requestThroughput!: number
    graphQLServerErrorCounter!: Record<string, number>

    constructor(requestThroughputMetricName = 'graphql_server_request_throughput',
        availabilityMetricName = 'graphql_server_availability',
        errorsMetricName = 'graphql_server_errors') {
        this.requestThroughputMetricName = requestThroughputMetricName
        this.availabilityMetricName = availabilityMetricName
        this.errorsMetricName = errorsMetricName
        this.initMetrics()
    }

    initMetrics(): void {
        this.createRequestThroughputCounter()
        this.createServerAvailabilityGauge()
        this.createServerErrorCounter()
        this.initErrorCounterLabels()
    }

    createServerErrorCounter(): void {
        this.graphQLServerErrorCounter = {}
    }

    createServerAvailabilityGauge(): void {
        this.graphQLServerAvailabilityGauge = 0
    }

    createRequestThroughputCounter(): void {
        this.requestThroughput = 0
    }

    /**
     * Initializes the error counter.
     * When evaluating time series this can help
     * to create an initial time series that can be used for actions like alerting.
     * Otherwise, calculating differences with functions like "increase" with
     * an undefined time series might not work for the first occurrence of an error.
     */
    initErrorCounterLabels(): void {
        this.graphQLServerErrorCounter[GRAPHQL_ERROR] = 0
        this.graphQLServerErrorCounter[SCHEMA_VALIDATION_ERROR] = 0
        this.graphQLServerErrorCounter[FETCH_ERROR] = 0
        this.graphQLServerErrorCounter[METHOD_NOT_ALLOWED_ERROR] = 0
        this.graphQLServerErrorCounter[INVALID_SCHEMA_ERROR] = 0
        this.graphQLServerErrorCounter[MISSING_QUERY_PARAMETER_ERROR] = 0
        this.graphQLServerErrorCounter[VALIDATION_ERROR] = 0
        this.graphQLServerErrorCounter[SYNTAX_ERROR] = 0
        this.graphQLServerErrorCounter[INTROSPECTION_DISABLED_ERROR] = 0
    }

    increaseErrors(label: string): void {
        this.graphQLServerErrorCounter[label]++
    }

    increaseRequestThroughput(): void {
        this.requestThroughput++
    }

    setAvailability(value: number): void {
        this.graphQLServerAvailabilityGauge = value
    }

    getMetricsContentType(): string {
        return 'text/plain; charset=utf-8; version=0.0.4'
    }

    getErrorCount(errorLabel: string): string {
        return `${this.errorsMetricName}{errorClass="${errorLabel}"} ` +
         this.graphQLServerErrorCounter[errorLabel]
    }

    async getMetrics(): Promise<string> {
        return new Promise((resolve) => {
            resolve(`
            # HELP ${this.requestThroughputMetricName} Number of incoming requests
            # TYPE ${this.requestThroughputMetricName} counter
            ${this.requestThroughputMetricName} ${this.requestThroughput}
            # HELP ${this.availabilityMetricName}  GraphQL server availability
            # TYPE ${this.availabilityMetricName}  gauge
            ${this.availabilityMetricName} ${this.graphQLServerAvailabilityGauge}
            # HELP ${this.errorsMetricName} Number of errors per Error class
            # TYPE ${this.errorsMetricName} counter
            ${this.getErrorCount(GRAPHQL_ERROR)}
            ${this.getErrorCount(SCHEMA_VALIDATION_ERROR)}
            ${this.getErrorCount(FETCH_ERROR)}
            ${this.getErrorCount(METHOD_NOT_ALLOWED_ERROR)}
            ${this.getErrorCount(INVALID_SCHEMA_ERROR)}
            ${this.getErrorCount(MISSING_QUERY_PARAMETER_ERROR)}
            ${this.getErrorCount(VALIDATION_ERROR)}
            ${this.getErrorCount(SYNTAX_ERROR)}
            ${this.getErrorCount(INTROSPECTION_DISABLED_ERROR)}
            `)
        })
    }
}
