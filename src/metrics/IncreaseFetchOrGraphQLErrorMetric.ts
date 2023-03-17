import { 
    Logger, 
    MetricsClient 
} from '@sgohlke/graphql-server-base'
import {
    determineGraphQLOrFetchError,
} from '..'

/**
 * Increases the error metric with either a FetchError or GraphQLError label
 * @param {unknown} error - An error
 * @param {unknown} context - The request context
 * @param {Logger} logger - The logger
 * @param {MetricsClient} metricsClient - The metrics client
 * @param {} collectErrorMetricsFunction - The used collectErrorMetricsFunction
 */
export function increaseFetchOrGraphQLErrorMetric(error: unknown,
    context: unknown,
    logger: Logger,
    metricsClient: MetricsClient,
    collectErrorMetricsFunction: (errorName: string,
        error?: unknown,
        context?: unknown,
        logger?: Logger,
        metricsClient?: MetricsClient) => void): void {
    logger.logDebugIfEnabled(
        'Calling increaseFetchOrGraphQLErrorMetric'+
        ` with error ${error} and errorIsFetch ${error instanceof Error }`,
        context
    )
    collectErrorMetricsFunction(determineGraphQLOrFetchError(error),
        error,
        context,
        logger,
        metricsClient)
}
