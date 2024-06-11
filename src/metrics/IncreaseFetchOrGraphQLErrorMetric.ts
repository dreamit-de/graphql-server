import { GraphQLServerOptions, determineGraphQLOrFetchError } from '../'

/**
 * Increases the error metric with either a FetchError or GraphQLError label
 * @param {unknown} error - An error
 * @param {unknown} context - The request context
 * @param {GraphQLServerOptions} serverOptions - The GraphQLServerOptions
 */
export function increaseFetchOrGraphQLErrorMetric(
    error: unknown,
    serverOptions: GraphQLServerOptions,
    context: unknown,
): void {
    const { collectErrorMetricsFunction, logger } = serverOptions
    if (logger) {
        logger.debug(
            'Calling increaseFetchOrGraphQLErrorMetric' +
                ` with error ${error} and errorIsFetch ${error instanceof Error}`,
            context,
        )
    }
    if (collectErrorMetricsFunction) {
        collectErrorMetricsFunction({
            context,
            error,
            errorName: determineGraphQLOrFetchError(error),
            serverOptions,
        })
    }
}
