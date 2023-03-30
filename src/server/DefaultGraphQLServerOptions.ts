import {
    extractInformationFromRequest,
    GraphQLServerOptions,
    TextLogger,
    sendResponse,
    SimpleMetricsClient,
} from '..'
import {
    execute,
    ExecutionResult,
    GraphQLError,
    GraphQLFormattedError,
    GraphQLSchema,
    parse,
    specifiedRules,
    validate,
    validateSchema
} from 'graphql'
import {ObjMap} from 'graphql/jsutils/ObjMap'
import {ValidationRule} from 'graphql/validation/ValidationContext'
import {TypeInfo} from 'graphql/utilities/TypeInfo'
import {Maybe} from 'graphql/jsutils/Maybe'
import {
    GraphQLFieldResolver,
    GraphQLTypeResolver
} from 'graphql/type/definition'
import { 
    GraphQLExecutionResult,
    GraphQLRequestInfo, 
    GraphQLServerRequest, 
    GraphQLServerResponse, 
    Logger, 
    MetricsClient, 
    ResponseParameters
} from '@sgohlke/graphql-server-base'

export const fallbackTextLogger = new TextLogger('fallback-logger', 'fallback-service')
export const invalidSchemaResponse: GraphQLExecutionResult = {
    executionResult: {
        errors:
            [new GraphQLError(
                'Request cannot be processed. Schema in GraphQL server is invalid.', {}
            )]
    },
    statusCode: 500,
}

export const missingQueryParameterResponse: GraphQLExecutionResult = {
    executionResult: {
        errors:
            [new GraphQLError(
                'Request cannot be processed. No query was found in parameters or body.', {}
            )]
    },
    statusCode: 400,
}

export class DefaultGraphQLServerOptions implements GraphQLServerOptions {
    logger: Logger = fallbackTextLogger
    extractInformationFromRequest: 
    (request: GraphQLServerRequest) => GraphQLRequestInfo = extractInformationFromRequest
    sendResponse: (responseParameters: ResponseParameters) => void = sendResponse
    metricsClient: MetricsClient = new SimpleMetricsClient()
    formatErrorFunction = defaultFormatErrorFunction
    collectErrorMetricsFunction = defaultCollectErrorMetrics
    schemaValidationFunction = validateSchema
    parseFunction = parse
    defaultValidationRules = specifiedRules
    customValidationRules: ReadonlyArray<ValidationRule> = []
    removeValidationRecommendations = true
    reassignAggregateError = false
    validateFunction = validate
    requestResponseContextFunction = defaultRequestResponseContextFunction
    requestContextFunction = defaultRequestContextFunction
    loggerContextFunction = defaultLoggerContextFunction
    executeFunction = execute
    extensionFunction = defaultExtensions
    shouldUpdateSchemaFunction = defaultShouldUpdateSchema
    validationTypeInfo?: TypeInfo
    validationOptions?: { maxErrors?: number }
    rootValue?: unknown
    fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    schema?: GraphQLSchema 
    invalidSchemaResponse = invalidSchemaResponse
    missingQueryParameterResponse = missingQueryParameterResponse
    methodNotAllowedResponse = defaultMethodNotAllowedResponse
    onlyQueryInGetRequestsResponse = defaultOnlyQueryInGetRequestsResponse
}

/**
 * Default format error function to format error if necessary.
 * Default behaviour: Calls toJSON function of error. Can be set in options.
 * @param {GraphQLError} error - The error to be formatted
 */
export function defaultFormatErrorFunction(error: GraphQLError): GraphQLFormattedError {
    return error.toJSON()
}

/**
 * Default context function to store information in context for further use.
 * Default behaviour: return request object. Can be set in options.
 * @param {GraphQLServerRequest} request - The initial request
 * @param {GraphQLServerResponse} response - The response to send back
 * @param {Logger} _logger - DEPRECATED: use serverOptions.logger instead
 * @param {GraphQLServerOptions} serverOptions - The GraphQLServerOptions
 */
export function defaultRequestResponseContextFunction(request: GraphQLServerRequest,
    response: GraphQLServerResponse,
    _logger?: Logger,
    serverOptions?: GraphQLServerOptions): unknown {
    if (serverOptions && serverOptions.logger) {
        serverOptions.logger.debug(
            'Calling defaultRequestResponseContextFunction with '+
            `request ${request} and response ${response}`,
            request
        )
    }
    return request
}

/**
 * Default context function to store information in context for further use.
 * Default behaviour: return request object. Can be set in options.
 * @param {GraphQLServerRequest} request - The initial request
 * @param {Logger} _logger - DEPRECATED: use serverOptions.logger instead
 * @param {GraphQLServerOptions} serverOptions - The GraphQLServerOptions
 */
export function defaultRequestContextFunction(request: GraphQLServerRequest,
    _logger?: Logger,
    serverOptions?: GraphQLServerOptions): unknown {
    if (serverOptions && serverOptions.logger) {
        serverOptions.logger.debug(
            `Calling defaultRequestContextFunction with request ${request}`,
            request
        )
    }
    return request
}

/**
 * Default context function to store information in context for further use.
 * Default behaviour: return empty object. Can be set in options.
 * @param {Logger} _logger - DEPRECATED: use serverOptions.logger instead
 * @param {GraphQLServerOptions} serverOptions - The GraphQLServerOptions
 */
export function defaultLoggerContextFunction(_logger?: Logger,
    serverOptions?: GraphQLServerOptions): unknown {
    if (serverOptions && serverOptions.logger) {
        serverOptions.logger.debug(
            'Calling defaultLoggerContextFunction',
        )
    }
    return {}
}

/**
 * Default extension function that can be used
 * to fill extensions field of GraphQL response. Can be set in options.
 * @param {GraphQLRequestInfo} requestInfo - The extracted requestInfo
 * @param {ExecutionResult} executionResult - The executionResult created by execute function
 * @param {Logger} logger - A logger
 * @param {unknown} context - The request context
 * @returns {ObjMap<unknown>}
 * A key-value map to be added as extensions in response
 */
export function defaultExtensions(requestInfo: GraphQLRequestInfo,
    executionResult: ExecutionResult,
    logger?: Logger,
    context?: unknown): ObjMap<unknown> | undefined {
    if (logger) {
        logger.debug(
            `Calling defaultExtensions for requestInfo ${JSON.stringify(requestInfo)}`+
            ` and executionResult ${JSON.stringify(executionResult)}`,
            context
        )
    }

    return undefined
}

/**
 * Default collect error metrics function. Can be set in options.
 * @param {string} errorName - The error name that is used as label in error metrics
 * @param {unknown} error - An optional GraphQL error
 * @param {unknown} context - The request context
 * @param {Logger} logger - A logger
 * @param {MetricsClient} metricsClient - The metrics client
 */
export function defaultCollectErrorMetrics(errorName: string,
    error?: unknown,
    context?: unknown,
    logger?: Logger,
    metricsClient?: MetricsClient): void {
    if (logger) {
        logger.debug(
            `Calling defaultCollectErrorMetrics with error ${error} and errorName ${errorName}`,
            context
        )
    }
    if (metricsClient) {
        metricsClient.increaseErrors(errorName, context)
    }

}

/**
 * Determines whether a schema update should be executed.
 * Default behaviour: If schema is undefined return false.
 * @param {GraphQLSchema} schema - The new schema to use as updated schema.
 * @returns {boolean} True if schema should be updated, false if not
 */
export function defaultShouldUpdateSchema(schema?: GraphQLSchema): boolean {
    return !!schema
}

/**
 * Return a default error message if used method is not allowed by GraphQLServer
 * @param {string} method - The actual used method
 * @returns {GraphQLExecutionResult} A MethodNotAllowed response
 */
export function defaultMethodNotAllowedResponse(method?: string): GraphQLExecutionResult {
    return {
        executionResult: {
            errors:
                [
                    new GraphQLError('GraphQL server only supports GET and POST requests.'
                    + ` Got ${method}`
                    , {})
                ]
        },
        statusCode: 405,
        customHeaders: { allow: 'GET, POST' }
    }
}

/**
 * Return a default error message if an unsupported operation is used in GET requests.
 * Default: Only supported operation is "query"
 * @param {string} operation - The actual used operation
 * @returns {GraphQLExecutionResult} A OnlyQueryInGetRequestsResponse response
 */
export function defaultOnlyQueryInGetRequestsResponse(operation?: string): GraphQLExecutionResult {
    return {
        executionResult: {
            errors:
                [new GraphQLError('Only "query" operation is allowed in "GET" requests.'+
                ` Got: "${operation}"`, {})]
        },
        statusCode: 405,
        customHeaders: {allow: 'POST'}
    }
}
