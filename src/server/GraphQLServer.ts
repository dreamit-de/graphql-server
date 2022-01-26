import {
    DocumentNode,
    execute,
    ExecutionResult,
    formatError,
    getOperationAST,
    GraphQLError,
    GraphQLSchema,
    parse,
    ParseOptions,
    Source,
    specifiedRules,
    validate,
    validateSchema
} from 'graphql'
import {IncomingMessage,
    ServerResponse} from 'http'
import {Logger} from '../logger/Logger'
import {GraphQLServerOptions} from './GraphQLServerOptions'
import {TextLogger} from '../logger/TextLogger'
import {GraphQLErrorWithStatusCode} from '../error/GraphQLErrorWithStatusCode'
import {DefaultRequestInformationExtractor} from './DefaultRequestInformationExtractor'
import {ValidationRule} from 'graphql/validation/ValidationContext'
import {TypeInfo} from 'graphql/utilities/TypeInfo'
import {Maybe} from 'graphql/jsutils/Maybe'
import {GraphQLFieldResolver,
    GraphQLTypeResolver} from 'graphql/type/definition'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'
import {RequestInformationExtractor} from './RequestInformationExtractor'
import {GraphQLFormattedError} from 'graphql/error/formatError'
import {MetricsClient} from '../metrics/MetricsClient'
import {DefaultMetricsClient} from '../metrics/DefaultMetricsClient'
import {
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    VALIDATION_ERROR
} from '../error/ErrorNameConstants'

export type Request = IncomingMessage & { url: string,  body?: unknown }
export type Response = ServerResponse & { json?: (data: unknown) => void }
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
    new GraphQLError('GraphQL server only supports GET and POST requests.')
const invalidSchemaError =
    new GraphQLError('Request cannot be processed. Schema in GraphQL server is invalid.')
const missingQueryParameterError =
    new GraphQLError('Request cannot be processed. No query was found in parameters or body.')
const onlyQueryInGetRequestsError =
    new GraphQLError('Only "query" operation is allowed in "GET" requests')

const requestCouldNotBeProcessed = 'Request could not be processed: '

export class GraphQLServer {
    private logger: Logger = fallbackTextLogger
    private requestInformationExtractor: RequestInformationExtractor
        = defaultRequestInformationExtractor
    private metricsClient: MetricsClient = defaultMetricsClient

    /**
     * Enables additional debug output if set to true.
     * Recommendation: Set to false for production environments
     */
    private debug?: boolean
    private schema?: GraphQLSchema
    private shouldUpdateSchemaFunction:
        (schema?: GraphQLSchema) => boolean = this.defaultShouldUpdateSchema
    private formatErrorFunction: (error: GraphQLError) => GraphQLFormattedError = formatError
    private collectErrorMetricsFunction:
        (errorName: string, error?: unknown, request?: Request) => void
        = this.defaultCollectErrorMetrics
    private schemaValidationFunction:
        (schema: GraphQLSchema) => ReadonlyArray<GraphQLError> = validateSchema
    private schemaValidationErrors: ReadonlyArray<GraphQLError> = []
    private parseFunction: (source: string | Source, options?: ParseOptions) => DocumentNode = parse
    private defaultValidationRules:  ReadonlyArray<ValidationRule> = specifiedRules
    private customValidationRules: ReadonlyArray<ValidationRule> = []
    private validationTypeInfo?: TypeInfo
    private validationOptions?: { maxErrors?: number }

    /**
     * Removes validation recommendations like "users not found. Did you mean user?".
     * For non-production environments it is usually safe to allow recommendations.
     * For production environments when not providing access to third-party
     * users it is considered good practice to remove these recommendations
     * so users can not circumvent disabled
     * introspection request by using recommendations to explore the schema.
     */
    private removeValidationRecommendations?: boolean
    private validateSchemaFunction:
        (schema: GraphQLSchema,
         documentAST: DocumentNode,
         rules?: ReadonlyArray<ValidationRule>,
         typeInfo?: TypeInfo,
         options?: { maxErrors?: number },) => ReadonlyArray<GraphQLError>  = validate
    private rootValue?: unknown
    private contextFunction:
        (request: Request, response: Response) => unknown = this.defaultContextFunction
    private fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    private typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    private executeFunction: (schema: GraphQLSchema,
                              document: DocumentNode,
                              rootValue?: unknown,
                              contextValue?: unknown,
                              variableValues?: Maybe<Record<string, unknown>>,
                              operationName?: Maybe<string>,
                              fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>,
                              typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>)
        => PromiseOrValue<ExecutionResult> = execute
    private extensionFunction: (request: Request,
                                requestInformation: GraphQLRequestInfo,
                                executionResult: ExecutionResult)
        => MaybePromise<undefined | Record<string, unknown>> = this.defaultExtensions

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
            this.formatErrorFunction = options.formatErrorFunction || formatError
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
                        this.collectErrorMetricsFunction(SCHEMA_VALIDATION_ERROR, error, undefined)
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

    async handleRequest(request: Request, response: Response): Promise<void> {
        // Increase request throughput
        this.metricsClient.increaseRequestThroughput(request)

        if (request.method === 'OPTIONS') {
            return this.sendPreflightResponse(request, response)
        }
        // Reject requests that do not use GET and POST methods.
        else if (request.method !== 'GET' && request.method !== 'POST') {
            this.logger.error(requestCouldNotBeProcessed,
                methodNotAllowedError,
                METHOD_NOT_ALLOWED_ERROR,
                request)
            this.collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                methodNotAllowedError,
                request)
            return this.sendResponse(response,
                {errors: [methodNotAllowedError]},
                405,
                { allow: 'GET, POST' },
                request)
        }

        // Reject requests if schema is invalid
        if (!this.schema || !this.isValidSchema(this.schema)) {
            this.metricsClient.setAvailability(0)
            this.logger.error(requestCouldNotBeProcessed,
                invalidSchemaError,
                INVALID_SCHEMA_ERROR,
                request)
            this.collectErrorMetricsFunction(INVALID_SCHEMA_ERROR, invalidSchemaError, request)
            return this.sendInvalidSchemaResponse(request, response)
        } else {
            this.metricsClient.setAvailability(1)
        }

        // Extract graphql request information (query, variables, operationName) from request
        const requestInformation =
            await this.requestInformationExtractor.extractInformationFromRequest(request)
        this.logDebugIfEnabled(
            `Extracted request information is ${JSON.stringify(requestInformation)}`, request
        )
        if (!requestInformation.query && requestInformation.error) {
            this.logger.error(requestCouldNotBeProcessed,
                requestInformation.error.graphQLError,
                GRAPHQL_ERROR,
                request)
            this.collectErrorMetricsFunction(GRAPHQL_ERROR, requestInformation.error, request)
            return this.sendGraphQLErrorWithStatusCodeResponse(request,
                response,
                requestInformation.error)
        }
        // Reject request if no query parameter is provided
        else if (!requestInformation.query) {
            this.logger.error(requestCouldNotBeProcessed,
                missingQueryParameterError,
                MISSING_QUERY_PARAMETER_ERROR,
                request)
            this.collectErrorMetricsFunction(MISSING_QUERY_PARAMETER_ERROR,
                missingQueryParameterError,
                request)
            return this.sendMissingQueryResponse(request, response)
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
                request)
            this.collectErrorMetricsFunction(SYNTAX_ERROR, syntaxError, request)
            return this.sendSyntaxErrorResponse(request, response, syntaxError as GraphQLError)
        }
        this.logDebugIfEnabled(
            `Parsing query into document succeeded with document: ${JSON.stringify(documentAST)}`,
            request
        )

        /**
         * Validate document against schema (
         * validate(schema, document, rules) function). Return 400 for errors
         */
        const validationErrors = this.validateSchemaFunction(this.schema,
            documentAST,
            [...this.defaultValidationRules, ...this.customValidationRules],
            this.validationTypeInfo,
            this.validationOptions)
        if (validationErrors.length > 0) {
            this.logDebugIfEnabled(
                `One or more validation errors occurred: ${JSON.stringify(validationErrors)}`,
                request
            )
            for (const validationError of validationErrors) {
                this.logger.error('While processing the request ' +
                    'the following validation error occurred: ',
                validationError,
                VALIDATION_ERROR,
                request)
                this.collectErrorMetricsFunction(VALIDATION_ERROR, validationError, request)
            }
            return this.sendValidationErrorResponse(request,
                response,
                this.removeValidationRecommendationsFromErrors(validationErrors))
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
                request)
            this.collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                onlyQueryInGetRequestsError,
                request)
            return this.sendMutationNotAllowedForGetResponse(request,
                response,
                onlyQueryInGetRequestsError)
        }

        const context = this.contextFunction(request, response)

        /**
         * Perform execution
         * (execute(schema, document, variables, operationName, resolvers) function).
         * Return 400 if errors are available
         */
        try {
            const executionResult = await this.executeFunction(this.schema,
                documentAST,
                this.rootValue,
                context,
                requestInformation.variables,
                requestInformation.operationName,
                this.fieldResolver,
                this.typeResolver)

            const extensionsResult = this.extensionFunction(request,
                requestInformation,
                executionResult)
            if (extensionsResult) {
                executionResult.extensions = extensionsResult
            }

            // Collect error metrics for execution result
            if (executionResult.errors && executionResult.errors.length > 0) {
                for (const error of executionResult.errors) {
                    this.logger.error('While processing the request ' +
                        'the following error occurred: ',
                    error,
                    this.determineGraphQLOrFetchError(error),
                    request)
                    this.increaseFetchOrGraphQLErrorMetric(error, request)
                }
            }

            // Return execution result
            this.logDebugIfEnabled(`Create response from data ${JSON.stringify(executionResult)}`,
                request)
            return this.sendResponse(response, executionResult, 200, {}, request)
        } catch (error: unknown) {
            this.logger.error('While processing the request ' +
                'a GraphQL execution error occurred',
            error as GraphQLError,
            this.determineGraphQLOrFetchError(error),
            request)
            this.increaseFetchOrGraphQLErrorMetric(error, request)
            return this.sendGraphQLExecutionErrorResponse(request, response, error as GraphQLError)
        }
    }

    sendResponse(response: Response,
        executionResult: ExecutionResult,
        statusCode: number,
        customHeaders: Record<string, string>,
        request: Request): void {

        this.logDebugIfEnabled(
            `Preparing response with executionResult ${JSON.stringify(executionResult)}`+
            `, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}`,
            request
        )
        if (executionResult.errors) {
            executionResult.errors.map(this.formatErrorFunction)
        }
        response.statusCode = statusCode
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        for (const [key, value] of Object.entries(customHeaders)) {
            this.logDebugIfEnabled(`Set custom header ${key} to ${value}`, request)
            response.setHeader(key, String(value))
        }

        response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
    }

    logDebugIfEnabled(message: string, request?: Request): void {
        if (this.debug) {
            this.logger.debug(message, request)
        }
    }

    /** Sends a fitting response if the schema used by the GraphQL server is invalid */
    sendInvalidSchemaResponse(request: Request, response: Response): void {
        return this.sendResponse(response,
            {errors: [invalidSchemaError]},
            500,
            {},
            request)
    }

    /** Sends a fitting response if there is no query available in the request */
    sendMissingQueryResponse(request: Request, response: Response): void {
        return this.sendResponse(response,
            {errors: [missingQueryParameterError]},
            400,
            {},
            request)
    }

    /** Sends a fitting response if a syntax error occurred during document parsing */
    sendSyntaxErrorResponse(request: Request, response: Response, syntaxError: GraphQLError): void {
        return this.sendResponse(response,
            {errors: [syntaxError]},
            400,
            {},
            request)
    }

    /** Sends a fitting response if a validation error response occurred during schema validation */
    sendValidationErrorResponse(request: Request,
        response: Response,
        errors: readonly GraphQLError[]): void {
        return this.sendResponse(response,
            {errors: errors},
            400,
            {},
            request)
    }

    /** Sends a fitting response if a mutation is requested in a GET request */
    sendMutationNotAllowedForGetResponse(request: Request,
        response: Response,
        error: GraphQLError): void {
        return this.sendResponse(response,
            {errors: [error]},
            405,
            {allow: 'POST'},
            request)
    }

    /** Sends a fitting response if a syntax error occurred during document parsing */
    sendGraphQLExecutionErrorResponse(request: Request,
        response: Response,
        error: GraphQLError): void {
        return this.sendResponse(response,
            {errors: [error]},
            400,
            {},
            request)
    }

    /**
     * Sends an error response using information from an GraphQLErrorWithStatusCode error
     * @param {Request} request - The initial request
     * @param {Response} response - The response to send
     * @param {GraphQLErrorWithStatusCode} error - An error that occurred while executing a function
     */
    sendGraphQLErrorWithStatusCodeResponse(request: Request,
        response: Response,
        error: GraphQLErrorWithStatusCode): void {
        return this.sendResponse(response,
            {errors: [error.graphQLError]},
            error.statusCode,
            {},
            request)
    }

    // Removes validation recommendations matching the defined recommendation text
    removeValidationRecommendationsFromErrors(validationErrors: ReadonlyArray<GraphQLError>)
        : ReadonlyArray<GraphQLError> {
        if (!this.removeValidationRecommendations) {
            return validationErrors
        } else {
            for (const validationError of validationErrors) {
                if (validationError.message.includes(recommendationText)) {
                    validationError.message = validationError.message.substring(0,
                        validationError.message.indexOf(recommendationText))
                }
            }
            return validationErrors
        }
    }

    /**
     * Default context error metrics function to store information in context for further use.
     * Default behaviour: return request object. Can be set in options.
     * @param {Request} request - The initial request
     * @param {Response} response - The response to send back
     */
    defaultContextFunction(request: Request, response: Response): unknown {
        this.logDebugIfEnabled(
            `Calling defaultContextFunction with request ${request} and response ${response}`,
            request
        )
        return request
    }

    /**
     * Default extension function that can be used
     * to fill extensions field of GraphQL response. Can be set in options.
     * @param {Request} request - The initial request
     * @param {GraphQLRequestInfo} requestInfo - The extracted requestInfo
     * @param {ExecutionResult} executionResult - The executionResult created by execute function
     * @returns {MaybePromise<undefined | { [key: string]: unknown }>}
     * A key-value map to be added as extensions in response
     */
    defaultExtensions(request: Request,
        requestInfo: GraphQLRequestInfo,
        executionResult: ExecutionResult): MaybePromise<undefined | Record<string, unknown>> {
        this.logDebugIfEnabled(
            `Calling defaultExtensions for request ${request}`+
            `, requestInfo ${JSON.stringify(requestInfo)}`+
            ` and executionResult ${JSON.stringify(executionResult)}`,
            request
        )
        return undefined
    }

    /**
     * Default collect error metrics function. Can be set in options.
     * @param {string} errorName - The error name that is used as label in error metrics
     * @param {GraphQLError} error - An optional GraphQL error
     * @param {Request} request - The initial request
     */
    defaultCollectErrorMetrics(errorName: string, error?: unknown, request?: Request): void {
        this.logDebugIfEnabled(
            `Calling defaultCollectErrorMetrics with request ${request}`+
            ` and error ${error} and errorName ${errorName}`,
            request
        )
        this.metricsClient.increaseErrors(errorName, request)
    }

    /**
     * Increases the error metric with either a FetchError or GraphQLError label
     * @param {unknown} error - An error
     * @param {Request} request - The initial request
     */
    increaseFetchOrGraphQLErrorMetric(error: unknown, request: Request): void {
        this.logDebugIfEnabled(
            `Calling increaseFetchOrGraphQLErrorMetric with request ${request}`+
            ` and error ${error} and errorIsFetch ${error instanceof Error }`,
            request
        )
        this.collectErrorMetricsFunction(this.determineGraphQLOrFetchError(error) , error, request)
    }

    /**
     * Determines if an error is a GraphQLError or
     * FetchError using the information in the error message
     * @param {unknown} error - An error
     * @returns {string} FETCH_ERROR if error is a FetchError, GraphQLError otherwise
     */
    determineGraphQLOrFetchError(error: unknown): string {
        if (error instanceof Error && error.message && (error.message.includes(FETCH_ERROR)
            || error.message.includes('ECONNREFUSED')
            || error.message.includes('ECONNRESET')
            || error.message.includes('socket hang up'))) {
            return FETCH_ERROR
        } else {
            return GRAPHQL_ERROR
        }
    }

    /**
     * Sends back a preflight response containing a fitting
     * 'Access-Control-Allow-Methods' header
     * @param {Request} request - The initial request
     * @param {Response} response - The response to send back
     */
    sendPreflightResponse(request: Request, response: Response): void {
        this.logDebugIfEnabled(
            'Responding to OPTIONS request',
            request
        )
        response.statusCode = 200
        response.setHeader('Access-Control-Allow-Methods', 'GET,POST')
        response.end()
    }
}
