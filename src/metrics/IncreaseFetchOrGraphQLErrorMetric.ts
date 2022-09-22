import {
    determineGraphQLOrFetchError,
    getRequestInfoForLogging,
    GraphQLServerRequest,
    Logger,
    MetricsClient
} from '..'

/**
 * Increases the error metric with either a FetchError or GraphQLError label
 * @param {unknown} error - An error
 * @param {GraphQLServerRequest} request - The initial request
 * @param {unknown} context - The request context
 * @param {Logger} logger - The logger
 * @param {MetricsClient} metricsClient - The metrics client
 * @param {} collectErrorMetricsFunction - The used collectErrorMetricsFunction
 */
export function increaseFetchOrGraphQLErrorMetric(error: unknown,
    request: GraphQLServerRequest,
    context: unknown,
    logger: Logger,
    metricsClient: MetricsClient,
    collectErrorMetricsFunction: (errorName: string,
        error?: unknown,
        request?: GraphQLServerRequest,
        context?: unknown,
        logger?: Logger,
        metricsClient?: MetricsClient) => void): void {
    logger.logDebugIfEnabled(
        'Calling increaseFetchOrGraphQLErrorMetric'+
        ` with request ${getRequestInfoForLogging(request)}`+
        ` and error ${error} and errorIsFetch ${error instanceof Error }`,
        request
    )
    collectErrorMetricsFunction(determineGraphQLOrFetchError(error),
        error,
        request,
        context,
        logger,
        metricsClient)
}
