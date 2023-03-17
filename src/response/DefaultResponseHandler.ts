import {Buffer} from 'node:buffer'
import {
    ResponseHandler,
    ResponseParameters
} from '..'
import {GraphQLError} from 'graphql'
import { GraphQLExecutionResult } from '@sgohlke/graphql-server-base'

/**
 * Default implementation of ResponseHandler interface
 */
export class DefaultResponseHandler implements ResponseHandler {
    // Error constants
    methodNotAllowedResponse: GraphQLExecutionResult = {
        executionResult: {
            errors:
                [new GraphQLError('GraphQL server only supports GET and POST requests.', {})]
        },
        statusCode: 405,
        customHeaders: { allow: 'GET, POST' }
    }

    invalidSchemaResponse: GraphQLExecutionResult = {
        executionResult: {
            errors:
                [new GraphQLError(
                    'Request cannot be processed. Schema in GraphQL server is invalid.', {}
                )]
        },
        statusCode: 500,
    }

    missingQueryParameterResponse: GraphQLExecutionResult = {
        executionResult: {
            errors:
                [new GraphQLError(
                    'Request cannot be processed. No query was found in parameters or body.', {}
                )]
        },
        statusCode: 400,
    }

    onlyQueryInGetRequestsResponse: GraphQLExecutionResult = {
        executionResult: {
            errors:
                [new GraphQLError('Only "query" operation is allowed in "GET" requests', {})]
        },
        statusCode: 405,
        customHeaders: {allow: 'POST'}
    }

    constructor(methodNotAllowedResponse?: GraphQLExecutionResult,
        invalidSchemaResponse?: GraphQLExecutionResult,
        missingQueryParameterResponse?: GraphQLExecutionResult,
        onlyQueryInGetRequestsResponse?: GraphQLExecutionResult) {
        if (methodNotAllowedResponse) {
            this.methodNotAllowedResponse = methodNotAllowedResponse
        }
        if (invalidSchemaResponse) {
            this.invalidSchemaResponse= invalidSchemaResponse
        }
        if (missingQueryParameterResponse) {
            this.missingQueryParameterResponse = missingQueryParameterResponse
        }
        if (onlyQueryInGetRequestsResponse) {
            this.onlyQueryInGetRequestsResponse = onlyQueryInGetRequestsResponse
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
}
