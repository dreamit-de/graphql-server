import {PromMetricsClient} from '@sgohlke/graphql-prom-metrics'

/**
 * Default metrics client to collect metrics from application and GraphQL server.
 * @deprecated Use PromMetricsClient from '@sgohlke/graphql-prom-metrics' or other fitting
 * MetricsClient implementations. Will be removed in graphql-server version 4.
 */
export class DefaultMetricsClient extends PromMetricsClient {}
