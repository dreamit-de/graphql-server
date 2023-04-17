import {
    GraphQLServerOptions,
    determineGraphQLOrFetchError,
} from '..'

/**
 * Increases the error metric with either a FetchError or GraphQLError label
 * @param {unknown} error - An error
 * @param {unknown} context - The request context
 * @param {GraphQLServerOptions} serverOptions - The GraphQLServerOptions
 */
export function increaseFetchOrGraphQLErrorMetric(error: unknown,
    serverOptions: GraphQLServerOptions,
    context: unknown): void {

    if (serverOptions.logger) {
        serverOptions.logger.debug(
            'Calling increaseFetchOrGraphQLErrorMetric'+
            ` with error ${error} and errorIsFetch ${error instanceof Error }`,
            context
        )
    }
    if (serverOptions.collectErrorMetricsFunction) {
        serverOptions.collectErrorMetricsFunction({
            context,
            error,
            errorName: determineGraphQLOrFetchError(error),
            serverOptions
        })
    }

}
