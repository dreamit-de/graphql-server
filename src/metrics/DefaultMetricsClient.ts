import {MetricsClient} from './MetricsClient';
import prom,
{Counter,
    Gauge} from 'prom-client'

/**
 * Default metrics client to collect metrics from application and GraphQL server.
 */
export class DefaultMetricsClient implements MetricsClient {
    readonly metricsIdentifier: string
    graphQLServerAvailabilityGauge!: Gauge<string>
    requestThroughput!: Counter<string>
    graphQLServerErrorCounter!: Counter<string>

    constructor(metricsIdentifier = 'graphql_server') {
        this.metricsIdentifier = metricsIdentifier
        this.initMetrics()
    }

    initMetrics(): void {
        prom.register.clear()
        prom.collectDefaultMetrics()
        this.requestThroughput = new prom.Counter({
            name: `${this.metricsIdentifier}_request_throughput`,
            help: 'Number of incoming requests',
        })
        this.graphQLServerAvailabilityGauge = new prom.Gauge({
            name: `${this.metricsIdentifier}_availability`,
            help: 'GraphQL server availability',
        })
        this.graphQLServerErrorCounter = new prom.Counter({
            name: `${this.metricsIdentifier}_errors`,
            help: 'Number of errors per Error class',
            labelNames: ['errorClass'],
        })
        /*
         * Initializes the error counter for errors with type GraphQLError. When evaluating time series this can help
         * to create an initial time series that can be used for actions like alerting. Otherwise calculating
         * differences with functions like "increase" with an undefined time series might not work for the first
         * occurrence of an error.
         */
        this.graphQLServerErrorCounter.labels('GraphQLError').inc(0)
        this.graphQLServerErrorCounter.labels('SchemaValidationError').inc(0)
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
        return prom.register.contentType;
    }

    async getMetrics(): Promise<string> {
        return prom.register.metrics();
    }
}
