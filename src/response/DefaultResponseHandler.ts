import {Buffer} from 'node:buffer'
import {
    ResponseHandler,
    ResponseParameters
} from '..'
import {GraphQLError} from 'graphql'

/**
 * Default implementation of ResponseHandler interface
 */
export class DefaultResponseHandler implements ResponseHandler {
    // Error constants
    methodNotAllowedError =
        new GraphQLError('GraphQL server only supports GET and POST requests.', {})
    invalidSchemaError =
        new GraphQLError('Request cannot be processed. Schema in GraphQL server is invalid.', {})
    missingQueryParameterError =
        new GraphQLError(
            'Request cannot be processed. No query was found in parameters or body.', {}
        )
    onlyQueryInGetRequestsError =
        new GraphQLError('Only "query" operation is allowed in "GET" requests', {})

    constructor(methodNotAllowedError?: GraphQLError,
        invalidSchemaError?: GraphQLError,
        missingQueryParameterError?: GraphQLError,
        onlyQueryInGetRequestsError?: GraphQLError) {
        if (methodNotAllowedError) {
            this.methodNotAllowedError = methodNotAllowedError
        }
        if (invalidSchemaError) {
            this.invalidSchemaError = invalidSchemaError
        }
        if (missingQueryParameterError) {
            this.missingQueryParameterError = missingQueryParameterError
        }
        if (onlyQueryInGetRequestsError) {
            this.onlyQueryInGetRequestsError = onlyQueryInGetRequestsError
        }
    }

    sendResponse(responseParameters: ResponseParameters): void {
        const {
            customHeaders,
            context,
            executionResult,
            logger,
            response,
            request,
            statusCode,
            formatErrorFunction
        }
            = responseParameters
        logger.logDebugIfEnabled(
            `Preparing response with executionResult ${JSON.stringify(executionResult)}`+
            `, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}` +
            `, and context ${context}`,
            request,
            context
        )
        if (executionResult && executionResult.errors && formatErrorFunction) {
            executionResult.errors.map((element) => formatErrorFunction(element))
        }
        if (statusCode) {
            response.statusCode = statusCode
        }
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (customHeaders) {
            for (const [key, value] of Object.entries(customHeaders)) {
                logger.logDebugIfEnabled(`Set custom header ${key} to ${value}`,
                    request,
                    context)
                response.setHeader(key, String(value))
            }
        }
        response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
    }


    /** Sends a fitting response if the schema used by the GraphQL server is invalid */
    sendInvalidSchemaResponse(responseParameters: ResponseParameters): void {
        return this.sendResponse(
            {
                response: responseParameters.response,
                executionResult: {errors: [this.invalidSchemaError]},
                statusCode: 500,
                request: responseParameters.request,
                context: responseParameters.context,
                logger: responseParameters.logger,
                formatErrorFunction: responseParameters.formatErrorFunction
            }
        )
    }

    /** Sends a fitting response if there is no query available in the request */
    sendMissingQueryResponse(responseParameters: ResponseParameters): void {
        return this.sendResponse(
            {
                response: responseParameters.response,
                executionResult: {errors: [this.missingQueryParameterError]},
                statusCode: 400,
                request: responseParameters.request,
                context: responseParameters.context,
                logger: responseParameters.logger,
                formatErrorFunction: responseParameters.formatErrorFunction
            }
        )
    }

    /** Sends a fitting response if a mutation is requested in a GET request */
    sendMutationNotAllowedForGetResponse(responseParameters: ResponseParameters): void {
        return this.sendResponse(
            {
                response: responseParameters.response,
                executionResult: {errors: [this.onlyQueryInGetRequestsError]},
                statusCode: 405,
                request: responseParameters.request,
                context: responseParameters.context,
                logger: responseParameters.logger,
                customHeaders: {allow: 'POST'},
                formatErrorFunction: responseParameters.formatErrorFunction
            }
        )
    }

    /** Sends a fitting response if a method is not allowed */
    sendMethodNotAllowedResponse(responseParameters: ResponseParameters): void {
        return this.sendResponse(
            {
                response: responseParameters.response,
                executionResult: {errors: [this.methodNotAllowedError]},
                statusCode: 405,
                request: responseParameters.request,
                context: responseParameters.context,
                logger: responseParameters.logger,
                customHeaders: { allow: 'GET, POST' },
                formatErrorFunction: responseParameters.formatErrorFunction
            }
        )
    }
}
