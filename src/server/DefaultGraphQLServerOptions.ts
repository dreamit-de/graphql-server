import {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    Logger,
    StandardSchemaV1,
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
import { TextLogger } from '../logger/TextLogger'
import { SimpleMetricsClient } from '../metrics/SimpleMetricsClient'
import { extractInformationFromRequest } from '../request/ExtractInformationFromRequest'
import { sendResponse } from '../response/SendResponse'
import { GraphQLServerOptions } from './GraphQLServerOptions'

const defaultGraphqlExecutionErrorMessage =
    'While processing the request a GraphQL execution error occurred: '
const defaultExecutionResultErrorMessage =
    'While processing the request the following error occurred: '
const defaultValidationErrorMessage =
    'While processing the request the following validation error occurred: '

const fallbackTextLogger: Logger = new TextLogger(
    'fallback-logger',
    'fallback-service',
)
const invalidSchemaResponse: GraphQLExecutionResult = {
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

const noOpStandardSchema: StandardSchemaV1 = {
    '~standard': {
        validate: (value: unknown) => ({ value }),
        vendor: 'no-op',
        version: 1,
    },
}

const defaultGraphQLServerOptions: GraphQLServerOptions = {
    collectErrorMetricsFunction: defaultCollectErrorMetrics,
    contextFunction: defaultContextFunction,
    customValidationRules: [],
    defaultValidationRules: specifiedRules,
    executeFunction: execute,
    executionResultErrorMessage: defaultExecutionResultErrorMessage,
    extensionFunction: defaultExtensions,
    extractInformationFromRequest: extractInformationFromRequest,
    formatErrorFunction: defaultFormatErrorFunction,
    graphqlExecutionErrorMessage: defaultGraphqlExecutionErrorMessage,
    invalidSchemaResponse: invalidSchemaResponse,
    logger: fallbackTextLogger,
    methodNotAllowedResponse: defaultMethodNotAllowedResponse,
    metricsClient: new SimpleMetricsClient(),
    missingQueryParameterResponse: defaultMissingQueryParameterResponse,
    onlyQueryInGetRequestsResponse: defaultOnlyQueryInGetRequestsResponse,
    parseFunction: parse,
    reassignAggregateError: false,
    removeValidationRecommendations: true,
    responseEndChunkFunction: defaultResponseEndChunkFunction,
    responseStandardSchema: noOpStandardSchema,
    schemaValidationFunction: validateSchema,
    sendResponse: sendResponse,
    shouldUpdateSchemaFunction: defaultShouldUpdateSchema,
    validateFunction: validate,
    validationErrorMessage: defaultValidationErrorMessage,
}

/**
 * Default format error function to format error if necessary.
 * Default behaviour: Calls toJSON function of error. Can be set in options.
 * @param {GraphQLError} error - The error to be formatted
 */
function defaultFormatErrorFunction(
    error: GraphQLError,
): GraphQLFormattedError {
    return error.toJSON()
}

/**
 * Default context function to store information in context for further use.
 * Default behaviour: return request object. Can be set in options.
 * @param contextParameters - The context parameters
 */
function defaultContextFunction(contextParameters: {
    serverOptions: GraphQLServerOptions
    request?: GraphQLServerRequest
    response?: GraphQLServerResponse
}): unknown {
    const { serverOptions, request, response } = contextParameters
    const logger = serverOptions.logger
    logger.debug(
        'Calling defaultRequestResponseContextFunction with ' +
            `request ${request} and response ${response}`,
        request,
    )
    return request
}

/**
 * Default extension function that can be used
 * to fill extensions field of GraphQL response. Can be set in options.
 * @param extensionParameters - The extensions parameters
 * @returns {Record<string, unknown>}
 * A key-value map to be added as extensions in response
 */
function defaultExtensions(extensionParameters: {
    requestInformation: GraphQLRequestInfo
    executionResult: ExecutionResult
    serverOptions: GraphQLServerOptions
    context?: unknown
}): Record<string, unknown> | undefined {
    const { requestInformation, executionResult, serverOptions, context } =
        extensionParameters
    const logger = serverOptions.logger
    logger.debug(
        `Calling defaultExtensions for requestInfo ${JSON.stringify(requestInformation)}` +
            ` and executionResult ${JSON.stringify(executionResult)}`,
        context,
    )
    return undefined
}

/**
 * Default collect error metrics function. Can be set in options.
 * @param errorParameters - The error parameters
 */
function defaultCollectErrorMetrics(errorParameters: {
    errorName: string
    error: unknown
    serverOptions: GraphQLServerOptions
    context?: unknown
}): void {
    const { errorName, error, serverOptions, context } = errorParameters
    const { logger, metricsClient } = serverOptions
    logger.debug(
        `Calling defaultCollectErrorMetrics with error ${error} and errorName ${errorName}`,
        context,
    )
    metricsClient.increaseErrors(errorName, context)
}

/**
 * Determines whether a schema update should be executed.
 * Default behaviour: If schema is undefined return false.
 * @param {GraphQLSchema} schema - The new schema to use as updated schema.
 * @returns {boolean} True if schema should be updated, false if not
 */
function defaultShouldUpdateSchema(schema?: GraphQLSchema): boolean {
    return !!schema
}

/**
 * Return a default error message if used method is not allowed by GraphQLServer
 * @param {string} method - The actual used method
 * @returns {GraphQLExecutionResult} A MethodNotAllowed response
 */
function defaultMethodNotAllowedResponse(
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
function defaultMissingQueryParameterResponse(
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
function defaultOnlyQueryInGetRequestsResponse(
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
function defaultResponseEndChunkFunction(
    executionResult: ExecutionResult | undefined,
): unknown {
    return JSON.stringify(executionResult)
}

export {
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultExecutionResultErrorMessage,
    defaultExtensions,
    defaultFormatErrorFunction,
    defaultGraphQLServerOptions,
    defaultGraphqlExecutionErrorMessage,
    defaultMethodNotAllowedResponse,
    defaultMissingQueryParameterResponse,
    defaultOnlyQueryInGetRequestsResponse,
    defaultResponseEndChunkFunction,
    defaultShouldUpdateSchema,
    defaultValidationErrorMessage,
    fallbackTextLogger,
    invalidSchemaResponse,
    noOpStandardSchema,
}
