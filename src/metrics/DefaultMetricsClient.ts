import {MetricsClient} from './MetricsClient'
import prom,
{
    Counter,
    Gauge
} from 'prom-client'
import {
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    VALIDATION_ERROR
} from '../error/ErrorNameConstants'

/**
 * Default metrics client to collect metrics from application and GraphQL server.
 */
export class DefaultMetricsClient implements MetricsClient {
    readonly requestThroughputMetricName: string
    readonly availabilityMetricName: string
    readonly errorsMetricName: string
    graphQLServerAvailabilityGauge!: Gauge<string>
    requestThroughput!: Counter<string>
    graphQLServerErrorCounter!: Counter<string>

    constructor(requestThroughputMetricName = 'graphql_server_request_throughput',
        availabilityMetricName = 'graphql_server_availability',
        errorsMetricName = 'graphql_server_errors') {
        this.requestThroughputMetricName = requestThroughputMetricName
        this.availabilityMetricName = availabilityMetricName
        this.errorsMetricName = errorsMetricName
        this.initMetrics()
    }

    initMetrics(): void {
        prom.register.clear()
        prom.collectDefaultMetrics()
        this.createRequestThroughputCounter()
        this.createServerAvailabilityGauge()
        this.createServerErrorCounter()
        this.initErrorCounterLabels()
    }

    createServerErrorCounter(): void {
        this.graphQLServerErrorCounter = new prom.Counter({
            name: this.errorsMetricName,
            help: 'Number of errors per Error class',
            labelNames: ['errorClass'],
        })
    }

    createServerAvailabilityGauge(): void {
        this.graphQLServerAvailabilityGauge = new prom.Gauge({
            name: this.availabilityMetricName,
            help: 'GraphQL server availability',
        })
    }

    createRequestThroughputCounter(): void {
        this.requestThroughput = new prom.Counter({
            name: this.requestThroughputMetricName,
            help: 'Number of incoming requests',
        })
    }

    /**
     * Initializes the error counter.
     * When evaluating time series this can help
     * to create an initial time series that can be used for actions like alerting.
     * Otherwise calculating differences with functions like "increase" with
     * an undefined time series might not work for the first occurrence of an error.
     */
    initErrorCounterLabels(): void {
        this.graphQLServerErrorCounter.labels(GRAPHQL_ERROR).inc(0)
        this.graphQLServerErrorCounter.labels(SCHEMA_VALIDATION_ERROR).inc(0)
        this.graphQLServerErrorCounter.labels(FETCH_ERROR).inc(0)
        this.graphQLServerErrorCounter.labels(METHOD_NOT_ALLOWED_ERROR).inc(0)
        this.graphQLServerErrorCounter.labels(INVALID_SCHEMA_ERROR).inc(0)
        this.graphQLServerErrorCounter.labels(MISSING_QUERY_PARAMETER_ERROR).inc(0)
        this.graphQLServerErrorCounter.labels(VALIDATION_ERROR).inc(0)
        this.graphQLServerErrorCounter.labels(SYNTAX_ERROR).inc(0)
    }

    increaseErrors(label: string): void {
        this.graphQLServerErrorCounter.labels(label).inc()
    }

    increaseRequestThroughput(): void {
        this.requestThroughput.inc()
    }

    setAvailability(value: number): void {
        this.graphQLServerAvailabilityGauge.set(value)
    }

    getMetricsContentType(): string {
        return prom.register.contentType
    }

    async getMetrics(): Promise<string> {
        return prom.register.metrics()
    }
}
