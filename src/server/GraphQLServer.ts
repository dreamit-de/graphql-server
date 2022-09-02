import {
    DocumentNode,
    execute,
    ExecutionArgs,
    ExecutionResult,
    getOperationAST,
    GraphQLError,
    GraphQLFormattedError,
    GraphQLSchema,
    parse,
    ParseOptions,
    Source,
    specifiedRules,
    validate,
    validateSchema
} from 'graphql'
import {
    Logger,
    GraphQLServerOptions,
    TextLogger,
    GraphQLErrorWithStatusCode,
    DefaultRequestInformationExtractor,
    MetricsClient,
    DefaultMetricsClient,
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    VALIDATION_ERROR,
    GraphQLServerRequest,
    GraphQLServerResponse,
    RequestInformationExtractor,
    isAggregateError,
    getRequestInfoForLogging
} from '..'


import {ValidationRule} from 'graphql/validation/ValidationContext'
import {TypeInfo} from 'graphql/utilities/TypeInfo'
import {Maybe} from 'graphql/jsutils/Maybe'
import {
    GraphQLFieldResolver,
    GraphQLTypeResolver
} from 'graphql/type/definition'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'
import {ObjMap} from 'graphql/jsutils/ObjMap'


export type MaybePromise<T> = Promise<T> | T
export interface GraphQLRequestInfo {
    query?: string
    variables?: Readonly<Record<string, unknown>>
    operationName?: string
    error?: GraphQLErrorWithStatusCode
}

const fallbackTextLogger = new TextLogger('fallback-logger', 'fallback-service')
const defaultRequestInformationExtractor = new DefaultRequestInformationExtractor()
const defaultMetricsClient = new DefaultMetricsClient()
const recommendationText = 'Did you mean'

// Error constants
const methodNotAllowedError =
    new GraphQLError('GraphQL server only supports GET and POST requests.', {})
const invalidSchemaError =
    new GraphQLError('Request cannot be processed. Schema in GraphQL server is invalid.', {})
const missingQueryParameterError =
    new GraphQLError('Request cannot be processed. No query was found in parameters or body.', {})
const onlyQueryInGetRequestsError =
    new GraphQLError('Only "query" operation is allowed in "GET" requests', {})

const requestCouldNotBeProcessed = 'Request could not be processed: '

export class GraphQLServer {
    protected logger: Logger = fallbackTextLogger
    protected requestInformationExtractor: RequestInformationExtractor
        = defaultRequestInformationExtractor
    protected metricsClient: MetricsClient = defaultMetricsClient

    /**
     * Enables additional debug output if set to true.
     * Recommendation: Set to false for production environments
     */
    protected debug?: boolean
    protected schema?: GraphQLSchema
    protected shouldUpdateSchemaFunction:
        (schema?: GraphQLSchema) => boolean = this.defaultShouldUpdateSchema
    protected formatErrorFunction:
        (error: GraphQLError) => GraphQLFormattedError = this.defaultFormatErrorFunction
    protected collectErrorMetricsFunction: (errorName: string,
                                            error?: unknown,
                                            request?: GraphQLServerRequest,
                                            context?: unknown) => void
        = this.defaultCollectErrorMetrics
    protected schemaValidationFunction:
        (schema: GraphQLSchema) => ReadonlyArray<GraphQLError> = validateSchema
    protected schemaValidationErrors: ReadonlyArray<GraphQLError> = []
    protected parseFunction:
        (source: string | Source, options?: ParseOptions) => DocumentNode = parse
    protected defaultValidationRules:  ReadonlyArray<ValidationRule> = specifiedRules
    protected customValidationRules: ReadonlyArray<ValidationRule> = []
    protected validationTypeInfo?: TypeInfo
    protected validationOptions?: { maxErrors?: number }

    /**
     * Removes validation recommendations like "users not found. Did you mean user?".
     * For non-production environments it is usually safe to allow recommendations.
     * For production environments when not providing access to third-party
     * users it is considered good practice to remove these recommendations
     * so users can not circumvent disabled
     * introspection request by using recommendations to explore the schema.
     */
    protected removeValidationRecommendations?: boolean

    /**
     * Reassign AggregateError containing more than one error back to the original
     * errors field of the ExecutionResult.
     */
    protected reassignAggregateError?: boolean
    protected validateSchemaFunction:
        (schema: GraphQLSchema,
         documentAST: DocumentNode,
         rules?: ReadonlyArray<ValidationRule>,
         options?: { maxErrors?: number },
         typeInfo?: TypeInfo,) => ReadonlyArray<GraphQLError>  = validate
    protected rootValue?: unknown
    protected contextFunction:
        (request: GraphQLServerRequest,
            response: GraphQLServerResponse) => unknown = this.defaultContextFunction
    protected fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    protected typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    protected executeFunction: (arguments_: ExecutionArgs)
    => PromiseOrValue<ExecutionResult> = execute
    protected extensionFunction: (request: GraphQLServerRequest,
                                requestInformation: GraphQLRequestInfo,
                                executionResult: ExecutionResult)
        => ObjMap<unknown> | undefined = this.defaultExtensions

    constructor(options?: GraphQLServerOptions) {
        this.setOptions(options)
    }

    setOptions(options?: GraphQLServerOptions): void {
        if (options) {
            this.logger = options.logger || fallbackTextLogger
            this.debug = options.debug  === undefined ? false : options.debug
            this.requestInformationExtractor =
                options.requestInformationExtractor || defaultRequestInformationExtractor
            this.metricsClient = options.metricsClient || defaultMetricsClient
            this.formatErrorFunction = options.formatErrorFunction
                || this.defaultFormatErrorFunction
            this.collectErrorMetricsFunction =
                options.collectErrorMetricsFunction || this.defaultCollectErrorMetrics
            this.schemaValidationFunction = options.schemaValidationFunction || validateSchema
            this.parseFunction = options.parseFunction || parse
            this.defaultValidationRules = options.defaultValidationRules || specifiedRules
            this.customValidationRules = options.customValidationRules || []
            this.validationTypeInfo = options.validationTypeInfo
            this.validationOptions = options.validationOptions
            this.removeValidationRecommendations =
                options.removeValidationRecommendations === undefined
                    ? true
                    : options.removeValidationRecommendations
            this.reassignAggregateError =
                options.reassignAggregateError === undefined
                    ? false
                    : options.reassignAggregateError
            this.validateSchemaFunction = options.validateFunction || validate
            this.rootValue = options.rootValue
            this.contextFunction = options.contextFunction || this.defaultContextFunction
            this.fieldResolver = options.fieldResolver
            this.typeResolver = options.typeResolver
            this.executeFunction = options.executeFunction || execute
            this.extensionFunction = options.extensionFunction || this.defaultExtensions
            this.shouldUpdateSchemaFunction =
                options.shouldUpdateSchemaFunction || this.defaultShouldUpdateSchema
            this.setSchema(options.schema)
        }
    }

    getSchema(): GraphQLSchema | undefined {
        return this.schema
    }

    isValidSchema(schema?: GraphQLSchema): boolean {
        return schema ? this.schemaValidationErrors.length === 0 : false
    }

    setSchema(schema?: GraphQLSchema): void {
        this.logger.info('Trying to set graphql schema')
        this.logDebugIfEnabled(`Schema is  ${JSON.stringify(schema)}`)
        if (this.shouldUpdateSchemaFunction(schema)) {
            this.schema = schema
            // Validate schema
            if (this.schema) {
                this.schemaValidationErrors = this.schemaValidationFunction(this.schema)
                if (this.schemaValidationErrors.length > 0) {
                    this.logger.warn('Schema validation failed with errors. ' +
                        'Please check the GraphQL schema and fix potential issues.')
                    for (const error of this.schemaValidationErrors) {
                        this.logger.error('A schema validation error occurred: ',
                            error,
                            SCHEMA_VALIDATION_ERROR)
                        this.collectErrorMetricsFunction(SCHEMA_VALIDATION_ERROR, error)
                    }
                }
            }
        } else {
            this.logger.warn('Schema update was rejected because condition' +
                ' set in "shouldUpdateSchema" check was not fulfilled.')
        }

        this.metricsClient.setAvailability(this.isValidSchema(this.schema) ? 1 : 0)
    }

    /**
     * Determines whether a schema update should be executed.
     * Default behaviour: If schema is undefined return false.
     * @param {GraphQLSchema} schema - The new schema to use as updated schema.
     * @returns {boolean} True if schema should be updated, false if not
     */
    defaultShouldUpdateSchema(schema?: GraphQLSchema): boolean {
        return !!schema
    }

    getSchemaValidationErrors():  ReadonlyArray<GraphQLError> | undefined {
        return this.schemaValidationErrors
    }

    // Gets the Content-Type of the metrics for use in the response headers
    getMetricsContentType(): string {
        return this.metricsClient.getMetricsContentType()
    }

    // Gets the metrics for use in the response body.
    async getMetrics(): Promise<string> {
        return this.metricsClient.getMetrics()
    }

    async handleRequest(request: GraphQLServerRequest,
        response: GraphQLServerResponse): Promise<void> {
        const context = this.contextFunction(request, response)

        // Increase request throughput
        this.metricsClient.increaseRequestThroughput(request, context)

        // Reject requests that do not use GET and POST methods.
        if (request.method !== 'GET' && request.method !== 'POST') {
            this.logger.error(requestCouldNotBeProcessed,
                methodNotAllowedError,
                METHOD_NOT_ALLOWED_ERROR,
                request,
                context)
            this.collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                methodNotAllowedError,
                request,
                context)
            return this.sendResponse(response,
                {errors: [methodNotAllowedError]},
                405,
                { allow: 'GET, POST' },
                request,
                context)
        }

        // Reject requests if schema is invalid
        if (!this.schema || !this.isValidSchema(this.schema)) {
            this.metricsClient.setAvailability(0)
            this.logger.error(requestCouldNotBeProcessed,
                invalidSchemaError,
                INVALID_SCHEMA_ERROR,
                request,
                context)
            this.collectErrorMetricsFunction(INVALID_SCHEMA_ERROR,
                invalidSchemaError,
                request,
                context)
            return this.sendInvalidSchemaResponse(request, response, context)
        } else {
            this.metricsClient.setAvailability(1)
        }

        // Extract graphql request information (query, variables, operationName) from request
        const requestInformation =
            await this.requestInformationExtractor.extractInformationFromRequest(request)
        this.logDebugIfEnabled(
            `Extracted request information is ${JSON.stringify(requestInformation)}`,
            request,
            context
        )
        if (!requestInformation.query && requestInformation.error) {
            this.logger.error(requestCouldNotBeProcessed,
                requestInformation.error.graphQLError,
                GRAPHQL_ERROR,
                request,
                context)
            this.collectErrorMetricsFunction(GRAPHQL_ERROR,
                requestInformation.error,
                request,
                context)
            return this.sendGraphQLErrorWithStatusCodeResponse(request,
                response,
                requestInformation.error,
                context)
        }
        // Reject request if no query parameter is provided
        else if (!requestInformation.query) {
            this.logger.error(requestCouldNotBeProcessed,
                missingQueryParameterError,
                MISSING_QUERY_PARAMETER_ERROR,
                request,
                context)
            this.collectErrorMetricsFunction(MISSING_QUERY_PARAMETER_ERROR,
                missingQueryParameterError,
                request,
                context)
            return this.sendMissingQueryResponse(request, response, context)
        }

        // Parse given GraphQL source into a document (parse(query) function)
        let documentAST: DocumentNode
        try {
            documentAST = this.parseFunction(new Source(requestInformation.query,
                'GraphQL request'))
        } catch (syntaxError: unknown) {
            this.logger.error(requestCouldNotBeProcessed,
                syntaxError as GraphQLError,
                SYNTAX_ERROR,
                request,
                context)
            this.collectErrorMetricsFunction(SYNTAX_ERROR, syntaxError, request, context)
            return this.sendSyntaxErrorResponse(request,
                response,
                syntaxError as GraphQLError,
                context)
        }
        this.logDebugIfEnabled(
            `Parsing query into document succeeded with document: ${JSON.stringify(documentAST)}`,
            request,
            context
        )

        /**
         * Validate document against schema (
         * validate(schema, document, rules) function). Return 400 for errors
         */
        const validationErrors = this.validateSchemaFunction(this.schema,
            documentAST,
            [...this.defaultValidationRules, ...this.customValidationRules],
            this.validationOptions,
            this.validationTypeInfo)
        if (validationErrors.length > 0) {
            this.logDebugIfEnabled(
                `One or more validation errors occurred: ${JSON.stringify(validationErrors)}`,
                request,
                context
            )
            for (const validationError of validationErrors) {
                this.logger.error('While processing the request ' +
                    'the following validation error occurred: ',
                validationError,
                VALIDATION_ERROR,
                request,
                context)
                this.collectErrorMetricsFunction(VALIDATION_ERROR,
                    validationError,
                    request,
                    context)
            }
            return this.sendValidationErrorResponse(request,
                response,
                this.removeValidationRecommendationsFromErrors(validationErrors),
                context)
        }

        /**
         * Reject request if get method is used for non-query(mutation) requests.
         * Check with getOperationAST(document, operationName) function.
         * Return 405 if that is the case
         */
        const operationAST = getOperationAST(documentAST, requestInformation.operationName)
        if (request.method === 'GET' && operationAST && operationAST.operation !== 'query') {
            this.logger.error(requestCouldNotBeProcessed,
                onlyQueryInGetRequestsError,
                METHOD_NOT_ALLOWED_ERROR,
                request,
                context)
            this.collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                onlyQueryInGetRequestsError,
                request,
                context)
            return this.sendMutationNotAllowedForGetResponse(request,
                response,
                onlyQueryInGetRequestsError,
                context)
        }



        /**
         * Perform execution
         * (execute(schema, document, variables, operationName, resolvers) function).
         * Return 400 if errors are available
         */
        try {
            const executionResult = await this.executeFunction({
                schema: this.schema,
                document: documentAST,
                rootValue: this.rootValue,
                contextValue: context,
                variableValues: requestInformation.variables,
                operationName: requestInformation.operationName,
                fieldResolver: this.fieldResolver,
                typeResolver: this.typeResolver
            })

            const extensionsResult = this.extensionFunction(request,
                requestInformation,
                executionResult)
            if (extensionsResult) {
                executionResult.extensions = extensionsResult
            }

            // Collect error metrics for execution result
            if (executionResult.errors && executionResult.errors.length > 0) {
                for (const error of executionResult.errors) {
                    if (this.reassignAggregateError
                        && error.originalError
                        && isAggregateError(error.originalError)) {

                        this.logDebugIfEnabled('Error is AggregateError and ' +
                            'reassignAggregateError feature is enabled. AggregateError ' +
                            'will be reassigned to original errors field.',
                        request,
                        context)
                        executionResult.errors = error.originalError.errors
                    }

                    this.logger.error('While processing the request ' +
                        'the following error occurred: ',
                    error,
                    this.determineGraphQLOrFetchError(error),
                    request,
                    context)
                    this.increaseFetchOrGraphQLErrorMetric(error, request, context)
                }
            }

            // Return execution result
            this.logDebugIfEnabled(`Create response from data ${JSON.stringify(executionResult)}`,
                request,
                context)
            return this.sendResponse(response,
                executionResult,
                200,
                {},
                request,
                context)
        } catch (error: unknown) {
            this.logger.error('While processing the request ' +
                'a GraphQL execution error occurred',
            error as GraphQLError,
            this.determineGraphQLOrFetchError(error),
            request,
            context)
            this.increaseFetchOrGraphQLErrorMetric(error, request, context)
            return this.sendGraphQLExecutionErrorResponse(request,
                response,
                error as GraphQLError,
                context)
        }
    }

    sendResponse(response: GraphQLServerResponse,
        executionResult: ExecutionResult,
        statusCode: number,
        customHeaders: Record<string, string>,
        request: GraphQLServerRequest,
        context: unknown): void {

        this.logDebugIfEnabled(
            `Preparing response with executionResult ${JSON.stringify(executionResult)}`+
            `, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}` +
            `, and context ${context}`,
            request,
            context
        )
        if (executionResult.errors) {
            executionResult.errors.map((element) => this.formatErrorFunction(element))
        }
        response.statusCode = statusCode
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        for (const [key, value] of Object.entries(customHeaders)) {
            this.logDebugIfEnabled(`Set custom header ${key} to ${value}`,
                request,
                context)
            response.setHeader(key, String(value))
        }

        response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
    }

    logDebugIfEnabled(message: string, request?: GraphQLServerRequest, context?: unknown): void {
        if (this.debug) {
            this.logger.debug(message, request, context)
        }
    }

    /** Sends a fitting response if the schema used by the GraphQL server is invalid */
    sendInvalidSchemaResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse,
        context: unknown): void {
        return this.sendResponse(response,
            {errors: [invalidSchemaError]},
            500,
            {},
            request,
            context)
    }

    /** Sends a fitting response if there is no query available in the request */
    sendMissingQueryResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse,
        context: unknown): void {
        return this.sendResponse(response,
            {errors: [missingQueryParameterError]},
            400,
            {},
            request,
            context)
    }

    /** Sends a fitting response if a syntax error occurred during document parsing */
    sendSyntaxErrorResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse,
        syntaxError: GraphQLError,
        context: unknown): void {
        return this.sendResponse(response,
            {errors: [syntaxError]},
            400,
            {},
            request,
            context)
    }

    /** Sends a fitting response if a validation error response occurred during schema validation */
    sendValidationErrorResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse,
        errors: readonly GraphQLError[],
        context: unknown): void {
        return this.sendResponse(response,
            {errors: errors},
            400,
            {},
            request,
            context)
    }

    /** Sends a fitting response if a mutation is requested in a GET request */
    sendMutationNotAllowedForGetResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse,
        error: GraphQLError,
        context: unknown): void {
        return this.sendResponse(response,
            {errors: [error]},
            405,
            {allow: 'POST'},
            request,
            context)
    }

    /** Sends a fitting response if a syntax error occurred during document parsing */
    sendGraphQLExecutionErrorResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse,
        error: GraphQLError,
        context: unknown): void {
        return this.sendResponse(response,
            {errors: [error]},
            400,
            {},
            request,
            context)
    }

    /**
     * Sends an error response using information from an GraphQLErrorWithStatusCode error
     * @param {GraphQLServerRequest} request - The initial request
     * @param {GraphQLServerResponse} response - The response to send
     * @param {GraphQLErrorWithStatusCode} error - An error that occurred while executing a function
     * @param {unknown} context - The context used for the GraphQL request
     */
    sendGraphQLErrorWithStatusCodeResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse,
        error: GraphQLErrorWithStatusCode,
        context: unknown): void {
        return this.sendResponse(response,
            {errors: [error.graphQLError]},
            error.statusCode,
            {},
            request,
            context)
    }

    // Removes validation recommendations matching the defined recommendation text
    removeValidationRecommendationsFromErrors(validationErrors: ReadonlyArray<GraphQLError>)
        : ReadonlyArray<GraphQLError> {
        if (!this.removeValidationRecommendations) {
            return validationErrors
        } else {
            for (const validationError of validationErrors) {
                if (validationError.message.includes(recommendationText)) {
                    validationError.message = validationError.message.slice(0,
                        Math.max(0, validationError.message.indexOf(recommendationText)))
                }
            }
            return validationErrors
        }
    }

    /**
     * Default format error function to format error if necessary.
     * Default behaviour: Calls toJSON function of error. Can be set in options.
     * @param {GraphQLError} error - The error to be formatted
     */
    defaultFormatErrorFunction(error: GraphQLError): GraphQLFormattedError {
        return error.toJSON()
    }

    /**
     * Default context error metrics function to store information in context for further use.
     * Default behaviour: return request object. Can be set in options.
     * @param {GraphQLServerRequest} request - The initial request
     * @param {GraphQLServerResponse} response - The response to send back
     */
    defaultContextFunction(request: GraphQLServerRequest,
        response: GraphQLServerResponse): unknown {
        this.logDebugIfEnabled(
            `Calling defaultContextFunction with request ${request} and response ${response}`,
            request
        )
        return request
    }

    /**
     * Default extension function that can be used
     * to fill extensions field of GraphQL response. Can be set in options.
     * @param {GraphQLServerRequest} request - The initial request
     * @param {GraphQLRequestInfo} requestInfo - The extracted requestInfo
     * @param {ExecutionResult} executionResult - The executionResult created by execute function
     * @returns {ObjMap<unknown>}
     * A key-value map to be added as extensions in response
     */
    defaultExtensions(request: GraphQLServerRequest,
        requestInfo: GraphQLRequestInfo,
        executionResult: ExecutionResult): ObjMap<unknown> | undefined {
        this.logDebugIfEnabled(
            `Calling defaultExtensions for request ${getRequestInfoForLogging(request)}`+
            `, requestInfo ${JSON.stringify(requestInfo)}`+
            ` and executionResult ${JSON.stringify(executionResult)}`,
            request
        )
        return undefined
    }

    /**
     * Default collect error metrics function. Can be set in options.
     * @param {string} errorName - The error name that is used as label in error metrics
     * @param {unknown} error - An optional GraphQL error
     * @param {GraphQLServerRequest} request - The initial request
     * @param {unknown} context - The request context
     */
    defaultCollectErrorMetrics(errorName: string,
        error?: unknown,
        request?: GraphQLServerRequest,
        context?: unknown): void {
        this.logDebugIfEnabled(
            `Calling defaultCollectErrorMetrics with request ${getRequestInfoForLogging(request)}`+
            ` and error ${error} and errorName ${errorName}`,
            request
        )
        this.metricsClient.increaseErrors(errorName, request, context)
    }

    /**
     * Increases the error metric with either a FetchError or GraphQLError label
     * @param {unknown} error - An error
     * @param {GraphQLServerRequest} request - The initial request
     * @param {unknown} context - The request context
     */
    increaseFetchOrGraphQLErrorMetric(error: unknown,
        request: GraphQLServerRequest,
        context: unknown): void {
        this.logDebugIfEnabled(
            'Calling increaseFetchOrGraphQLErrorMetric'+
            ` with request ${getRequestInfoForLogging(request)}`+
            ` and error ${error} and errorIsFetch ${error instanceof Error }`,
            request
        )
        this.collectErrorMetricsFunction(this.determineGraphQLOrFetchError(error),
            error,
            request,
            context)
    }

    /**
     * Determines if an error is a GraphQLError or
     * FetchError using the information in the error message
     * @param {unknown} error - An error
     * @returns {string} FETCH_ERROR if error is a FetchError, GraphQLError otherwise
     */
    determineGraphQLOrFetchError(error: unknown): string {
        return error instanceof Error && error.message && (error.message.includes(FETCH_ERROR)
            || error.message.includes('ECONNREFUSED')
            || error.message.includes('ECONNRESET')
            || error.message.includes('ETIMEDOUT')
            || error.message.includes('socket hang up')) ? FETCH_ERROR : GRAPHQL_ERROR
    }
}
