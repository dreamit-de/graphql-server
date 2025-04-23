import {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    METHOD_NOT_ALLOWED_ERROR,
} from '@dreamit/graphql-server-base'
import { requestCouldNotBeProcessed } from '../request/RequestConstants'
import { getFirstErrorFromExecutionResult } from '../response/GraphQLExecutionResult'
import { GraphQLServerOptions } from './GraphQLServerOptions'

export function getRequestInformation(
    request: GraphQLServerRequest,
    context: unknown,
    options: GraphQLServerOptions,
): GraphQLRequestInfo | GraphQLExecutionResult {
    const {
        logger,
        collectErrorMetricsFunction,
        methodNotAllowedResponse,
        extractInformationFromRequest,
    } = options

    // Reject requests that do not use GET and POST methods.
    if (request.method !== 'GET' && request.method !== 'POST') {
        const response = methodNotAllowedResponse(request.method)
        const error = getFirstErrorFromExecutionResult(response)
        logger.error(
            requestCouldNotBeProcessed,
            error,
            METHOD_NOT_ALLOWED_ERROR,
            context,
        )
        collectErrorMetricsFunction({
            context,
            error,
            errorName: METHOD_NOT_ALLOWED_ERROR,
            serverOptions: options,
        })
        return response
    }

    // Extract graphql request information (query, variables, operationName) from request
    const requestInformation = extractInformationFromRequest(request)
    logger.debug(
        `Extracted request information is ${JSON.stringify(requestInformation)}`,
        context,
    )
    return requestInformation
}
