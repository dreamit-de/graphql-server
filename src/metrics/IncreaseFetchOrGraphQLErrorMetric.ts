import { determineGraphQLOrFetchError } from '../error/DetermineGraphQLOrFetchError'
import type { GraphQLServerOptions } from '../server/GraphQLServerOptions'

/**
 * Increases the error metric with either a FetchError or GraphQLError label
 * @param {unknown} error - An error
 * @param {Record<string, unknown>} context - The request context
 * @param {GraphQLServerOptions} serverOptions - The GraphQLServerOptions
 */
export function increaseFetchOrGraphQLErrorMetric(
    error: unknown,
    serverOptions: GraphQLServerOptions,
    context: Record<string, unknown>,
): void {
    const { collectErrorMetricsFunction, logger } = serverOptions
    logger.debug(
        'Calling increaseFetchOrGraphQLErrorMetric' +
            ` with error ${error} and errorIsFetch ${error instanceof Error}`,
        context,
    )
    collectErrorMetricsFunction({
        context,
        error,
        errorName: determineGraphQLOrFetchError(error),
        serverOptions,
    })
}
