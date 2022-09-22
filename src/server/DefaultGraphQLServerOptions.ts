import {
    GraphQLServerOptions,
    DefaultMetricsClient,
    DefaultRequestInformationExtractor,
    TextLogger,
    GraphQLServerRequest,
    GraphQLServerResponse,
    getRequestInfoForLogging,
    GraphQLRequestInfo,
    Logger,
    RequestInformationExtractor,
    MetricsClient,
    DefaultResponseHandler,
    ResponseHandler
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

export const fallbackTextLogger = new TextLogger('fallback-logger', 'fallback-service')
export const defaultRequestInformationExtractor = new DefaultRequestInformationExtractor()
export const defaultResponseHandler = new DefaultResponseHandler()
export const defaultMetricsClient = new DefaultMetricsClient()

export class DefaultGraphQLServerOptions implements GraphQLServerOptions {
    logger: Logger = fallbackTextLogger
    requestInformationExtractor: RequestInformationExtractor = defaultRequestInformationExtractor
    responseHandler: ResponseHandler = defaultResponseHandler
    metricsClient: MetricsClient = defaultMetricsClient
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
 * Default context error metrics function to store information in context for further use.
 * Default behaviour: return request object. Can be set in options.
 * @param {GraphQLServerRequest} request - The initial request
 * @param {GraphQLServerResponse} response - The response to send back
 * @param {Logger} logger - A logger
 */
export function defaultContextFunction(request: GraphQLServerRequest,
    response: GraphQLServerResponse, logger?: Logger): unknown {
    if (logger) {
        logger.logDebugIfEnabled(
            `Calling defaultContextFunction with request ${request} and response ${response}`,
            request
        )
    }
    return request
}

/**
 * Default extension function that can be used
 * to fill extensions field of GraphQL response. Can be set in options.
 * @param {GraphQLServerRequest} request - The initial request
 * @param {GraphQLRequestInfo} requestInfo - The extracted requestInfo
 * @param {ExecutionResult} executionResult - The executionResult created by execute function
 * @param {Logger} logger - A logger
 * @returns {ObjMap<unknown>}
 * A key-value map to be added as extensions in response
 */
export function defaultExtensions(request: GraphQLServerRequest,
    requestInfo: GraphQLRequestInfo,
    executionResult: ExecutionResult,
    logger?: Logger): ObjMap<unknown> | undefined {
    if (logger) {
        logger.logDebugIfEnabled(
            `Calling defaultExtensions for request ${getRequestInfoForLogging(request)}`+
            `, requestInfo ${JSON.stringify(requestInfo)}`+
            ` and executionResult ${JSON.stringify(executionResult)}`,
            request
        )
    }

    return undefined
}

/**
 * Default collect error metrics function. Can be set in options.
 * @param {string} errorName - The error name that is used as label in error metrics
 * @param {unknown} error - An optional GraphQL error
 * @param {GraphQLServerRequest} request - The initial request
 * @param {unknown} context - The request context
 * @param {Logger} logger - A logger
 * @param {MetricsClient} metricsClient - The metrics client
 */
export function defaultCollectErrorMetrics(errorName: string,
    error?: unknown,
    request?: GraphQLServerRequest,
    context?: unknown,
    logger?: Logger,
    metricsClient?: MetricsClient): void {
    if (logger) {
        logger.logDebugIfEnabled(
            `Calling defaultCollectErrorMetrics with request ${getRequestInfoForLogging(request)}`+
            ` and error ${error} and errorName ${errorName}`,
            request
        )
    }
    if (metricsClient) {
        metricsClient.increaseErrors(errorName, request, context)
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
