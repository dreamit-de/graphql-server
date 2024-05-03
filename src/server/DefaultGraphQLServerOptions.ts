import {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    Logger,
    MetricsClient,
    ResponseParameters,
} from '@dreamit/graphql-server-base'
import {
    ExecutionResult,
    GraphQLError,
    GraphQLFormattedError,
    GraphQLSchema,
    execute,
    parse,
    specifiedRules,
    validate,
    validateSchema,
} from 'graphql'
import { Maybe } from 'graphql/jsutils/Maybe'
import { ObjMap } from 'graphql/jsutils/ObjMap'
import {
    GraphQLFieldResolver,
    GraphQLTypeResolver,
} from 'graphql/type/definition'
import { TypeInfo } from 'graphql/utilities/TypeInfo'
import { ValidationRule } from 'graphql/validation/ValidationContext'
import { Buffer } from 'node:buffer'
import {
    GraphQLServerOptions,
    SimpleMetricsClient,
    StandaloneResponseParameters,
    TextLogger,
    extractInformationFromRequest,
    sendResponse,
} from '..'

export const defaultGraphqlExecutionErrorMessage =
    'While processing the request a GraphQL execution error occurred: '
export const defaultExecutionResultErrorMessage =
    'While processing the request the following error occurred: '
export const defaultValidationErrorMessage =
    'While processing the request the following validation error occurred: '

export const fallbackTextLogger = new TextLogger(
    'fallback-logger',
    'fallback-service',
)
export const invalidSchemaResponse: GraphQLExecutionResult = {
    executionResult: {
        errors: [
            new GraphQLError(
                'Request cannot be processed. Schema in GraphQL server is invalid.',
                {},
            ),
        ],
    },
    statusCode: 500,
}

export class DefaultGraphQLServerOptions implements GraphQLServerOptions {
    logger: Logger = fallbackTextLogger
    extractInformationFromRequest: (
        request: GraphQLServerRequest,
    ) => GraphQLRequestInfo = extractInformationFromRequest
    sendResponse: (responseParameters: ResponseParameters) => void =
        sendResponse
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
    contextFunction = defaultContextFunction
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
    missingQueryParameterResponse = defaultMissingQueryParameterResponse
    methodNotAllowedResponse = defaultMethodNotAllowedResponse
    onlyQueryInGetRequestsResponse = defaultOnlyQueryInGetRequestsResponse
    validationErrorMessage = defaultValidationErrorMessage
    executionResultErrorMessage = defaultExecutionResultErrorMessage
    graphqlExecutionErrorMessage = defaultGraphqlExecutionErrorMessage
    responseEndChunkFunction = defaultResponseEndChunkFunction
    fetchErrorMessage?: string
    adjustGraphQLExecutionResult?: (
        parameters: StandaloneResponseParameters,
    ) => GraphQLExecutionResult
}

/**
 * Default format error function to format error if necessary.
 * Default behaviour: Calls toJSON function of error. Can be set in options.
 * @param {GraphQLError} error - The error to be formatted
 */
export function defaultFormatErrorFunction(
    error: GraphQLError,
): GraphQLFormattedError {
    return error.toJSON()
}

/**
 * Default context function to store information in context for further use.
 * Default behaviour: return request object. Can be set in options.
 * @param contextParameters - The context parameters
 */
export function defaultContextFunction(contextParameters: {
    serverOptions: GraphQLServerOptions
    request?: GraphQLServerRequest
    response?: GraphQLServerResponse
}): unknown {
    const { serverOptions, request, response } = contextParameters
    const logger = serverOptions.logger
    if (logger) {
        logger.debug(
            'Calling defaultRequestResponseContextFunction with ' +
                `request ${request} and response ${response}`,
            request,
        )
    }
    return request
}

/**
 * Default extension function that can be used
 * to fill extensions field of GraphQL response. Can be set in options.
 * @param extensionParameters - The extensions parameters
 * @returns {ObjMap<unknown>}
 * A key-value map to be added as extensions in response
 */
export function defaultExtensions(extensionParameters: {
    requestInformation: GraphQLRequestInfo
    executionResult: ExecutionResult
    serverOptions: GraphQLServerOptions
    context?: unknown
}): ObjMap<unknown> | undefined {
    const { requestInformation, executionResult, serverOptions, context } =
        extensionParameters
    const logger = serverOptions.logger
    if (logger) {
        logger.debug(
            `Calling defaultExtensions for requestInfo ${JSON.stringify(requestInformation)}` +
                ` and executionResult ${JSON.stringify(executionResult)}`,
            context,
        )
    }

    return undefined
}

/**
 * Default collect error metrics function. Can be set in options.
 * @param errorParameters - The error parameters
 */
export function defaultCollectErrorMetrics(errorParameters: {
    errorName: string
    error: unknown
    serverOptions: GraphQLServerOptions
    context?: unknown
}): void {
    const { errorName, error, serverOptions, context } = errorParameters
    const { logger, metricsClient } = serverOptions
    if (logger) {
        logger.debug(
            `Calling defaultCollectErrorMetrics with error ${error} and errorName ${errorName}`,
            context,
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
export function defaultMethodNotAllowedResponse(
    method?: string,
): GraphQLExecutionResult {
    return {
        customHeaders: { allow: 'GET, POST' },
        executionResult: {
            errors: [
                new GraphQLError(
                    'GraphQL server only supports GET and POST requests.' +
                        ` Got ${method}`,
                    {},
                ),
            ],
        },
        statusCode: 405,
    }
}

/**
 * Return a default error message if no query information is found in body or URL parameter
 * @param {string} method - The actual used method
 * @returns {GraphQLExecutionResult} A MissingQueryParameter response
 */
export function defaultMissingQueryParameterResponse(
    method?: string,
): GraphQLExecutionResult {
    return {
        executionResult: {
            errors: [
                new GraphQLError(
                    'Request cannot be processed. No query was found ' +
                        `in parameters or body. Used method is ${method}`,
                    {},
                ),
            ],
        },
        statusCode: 400,
    }
}

/**
 * Return a default error message if an unsupported operation is used in GET requests.
 * Default: Only supported operation is "query"
 * @param {string} operation - The actual used operation
 * @returns {GraphQLExecutionResult} A OnlyQueryInGetRequestsResponse response
 */
export function defaultOnlyQueryInGetRequestsResponse(
    operation?: string,
): GraphQLExecutionResult {
    return {
        customHeaders: { allow: 'POST' },
        executionResult: {
            errors: [
                new GraphQLError(
                    'Only "query" operation is allowed in "GET" requests.' +
                        ` Got: "${operation}"`,
                    {},
                ),
            ],
        },
        statusCode: 405,
    }
}

/**
 * Default response.end chunk function to adjust chunk/Body if necessary.
 * Default behavior: Create Buffer from stringified executionResult
 * @param {GraphQLError} error - The error to be formatted
 */
export function defaultResponseEndChunkFunction(
    executionResult: ExecutionResult | undefined,
): unknown {
    return Buffer.from(JSON.stringify(executionResult), 'utf8')
}
