import {Buffer} from 'node:buffer'
import {
    GraphQLErrorWithInfo,
    ResponseHandler,
    ResponseParameters
} from '..'
import {GraphQLError} from 'graphql'

/**
 * Default implementation of ResponseHandler interface
 */
export class DefaultResponseHandler implements ResponseHandler {
    // Error constants
    methodNotAllowedError: GraphQLErrorWithInfo = {
        graphQLError: new GraphQLError('GraphQL server only supports GET and POST requests.', {}),
        statusCode: 405,
        customHeaders: { allow: 'GET, POST' }
    }

    invalidSchemaError: GraphQLErrorWithInfo = {
        graphQLError: new GraphQLError(
            'Request cannot be processed. Schema in GraphQL server is invalid.', {}
        ),
        statusCode: 500,
    }

    missingQueryParameterError: GraphQLErrorWithInfo = {
        graphQLError: new GraphQLError(
            'Request cannot be processed. No query was found in parameters or body.', {}
        ),
        statusCode: 400,
    }

    onlyQueryInGetRequestsError: GraphQLErrorWithInfo = {
        graphQLError: new GraphQLError('Only "query" operation is allowed in "GET" requests', {}),
        statusCode: 405,
        customHeaders: {allow: 'POST'}
    }

    constructor(methodNotAllowedError?: GraphQLErrorWithInfo,
        invalidSchemaError?: GraphQLErrorWithInfo,
        missingQueryParameterError?: GraphQLErrorWithInfo,
        onlyQueryInGetRequestsError?: GraphQLErrorWithInfo) {
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
            statusCode,
            formatErrorFunction
        }
            = responseParameters
        logger.logDebugIfEnabled(
            `Preparing response with executionResult ${JSON.stringify(executionResult)}`+
            `, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}` +
            `, and context ${context}`,
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
                    context)
                response.setHeader(key, String(value))
            }
        }
        response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
    }

    /** Sends a fitting response if a method is not allowed */
    sendErrorResponse(error:GraphQLErrorWithInfo, responseParameters: ResponseParameters): void {
        return this.sendResponse(
            {
                response: responseParameters.response,
                executionResult: {errors: [error.graphQLError]},
                statusCode: error.statusCode,
                request: responseParameters.request,
                context: responseParameters.context,
                logger: responseParameters.logger,
                customHeaders: error.customHeaders,
                formatErrorFunction: responseParameters.formatErrorFunction
            }
        )
    }
}
