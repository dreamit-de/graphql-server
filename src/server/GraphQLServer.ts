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
    validate,
    validateSchema
} from 'graphql'
import {IncomingMessage,
    ServerResponse} from 'http'
import {Logger} from '../logger/Logger'
import {GraphQLServerOptions} from './GraphQLServerOptions'
import {TextLogger} from '../logger/TextLogger'
import {GraphQLErrorWithStatusCode} from './GraphQLErrorWithStatusCode'
import {DefaultRequestInformationExtractor} from './DefaultRequestInformationExtractor'
import {ValidationRule} from 'graphql/validation/ValidationContext'
import {TypeInfo} from 'graphql/utilities/TypeInfo'
import {OperationTypeNode} from 'graphql/language/ast'
import {Maybe} from 'graphql/jsutils/Maybe'
import {GraphQLFieldResolver,
    GraphQLTypeResolver} from 'graphql/type/definition'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'
import {RequestInformationExtractor} from './RequestInformationExtractor'
import {GraphQLFormattedError} from 'graphql/error/formatError'
import {MetricsClient} from '../metrics/MetricsClient'
import {DefaultMetricsClient} from '../metrics/DefaultMetricsClient'

export type Request = IncomingMessage & { url: string,  body?: unknown }
export type Response = ServerResponse & { json?: (data: unknown) => void }
export type MaybePromise<T> = Promise<T> | T

export interface GraphQLRequestInfo {
    query?: string
    variables?: { readonly [name: string]: unknown }
    operationName?: string
    error?: GraphQLErrorWithStatusCode
}

const fallbackTextLogger = new TextLogger('fallback-logger', 'fallback-service')
const defaultRequestInformationExtractor = new DefaultRequestInformationExtractor()
const defaultMetricsClient = new DefaultMetricsClient()
const recommendationText = 'Did you mean'

export class GraphQLServer {
    private logger: Logger = fallbackTextLogger
    private requestInformationExtractor: RequestInformationExtractor = defaultRequestInformationExtractor
    private metricsClient: MetricsClient = defaultMetricsClient
    //Enables additional debug output if set to true. Recommendation: Set to false for production environments
    private debug?: boolean
    private schema?: GraphQLSchema
    private shouldUpdateSchemaFunction: (schema?: GraphQLSchema) => boolean = this.defaultShouldUpdateSchema
    private formatErrorFunction: (error: GraphQLError) => GraphQLFormattedError = formatError
    private collectErrorMetricsFunction: (error: GraphQLError, request?: Request) => void = this.defaultCollectErrorMetrics
    private schemaValidationFunction: (schema: GraphQLSchema) => ReadonlyArray<GraphQLError> = validateSchema
    private schemaValidationErrors: ReadonlyArray<GraphQLError> = []
    private parseFunction: (source: string | Source, options?: ParseOptions) => DocumentNode = parse
    private validationRules?: ReadonlyArray<ValidationRule>
    private validationTypeInfo?: TypeInfo
    private validationOptions?: { maxErrors?: number }
    /*
    * Removes validation recommendations like "users not found. Did you mean user?". For non-production environments
    * it is usually safe to allow recommendations. For production environments when not providing access to third-party
    * users it is considered good practice to remove these recommendations so users can not circumvent disabled
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
    private contextValue?: unknown
    private fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    private typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    private executeFunction: (schema: GraphQLSchema,
                              document: DocumentNode,
                              rootValue?: unknown,
                              contextValue?: unknown,
                              variableValues?: Maybe<{ [key: string]: unknown }>,
                              operationName?: Maybe<string>,
                              fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>,
                              typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>) => PromiseOrValue<ExecutionResult> = execute
    private extensionFunction: (request: Request, requestInformation: GraphQLRequestInfo, executionResult: ExecutionResult) => MaybePromise<undefined | { [key: string]: unknown }> = this.defaultExtensions

    constructor(options?: GraphQLServerOptions) {
        this.setOptions(options)
    }

    setOptions(options?: GraphQLServerOptions): void {
        if (options) {
            this.logger = options.logger || fallbackTextLogger
            this.debug = options.debug  === undefined ? false : options.debug
            this.requestInformationExtractor = options.requestInformationExtractor || defaultRequestInformationExtractor
            this.metricsClient = options.metricsClient || defaultMetricsClient
            this.formatErrorFunction = options.formatErrorFunction || formatError
            this.collectErrorMetricsFunction = options.collectErrorMetricsFunction || this.defaultCollectErrorMetrics
            this.schemaValidationFunction = options.schemaValidationFunction || validateSchema
            this.parseFunction = options.parseFunction || parse
            this.validationRules = options.validationRules
            this.validationTypeInfo = options.validationTypeInfo
            this.validationOptions = options.validationOptions
            this.removeValidationRecommendations = options.removeValidationRecommendations === undefined ? true : options.removeValidationRecommendations
            this.validateSchemaFunction = options.validateFunction || validate
            this.rootValue = options.rootValue
            this.contextValue = options.contextValue
            this.fieldResolver = options.fieldResolver
            this.typeResolver = options.typeResolver
            this.executeFunction = options.executeFunction || execute
            this.extensionFunction = options.extensionFunction || this.defaultExtensions
            this.shouldUpdateSchemaFunction = options.shouldUpdateSchemaFunction || this.defaultShouldUpdateSchema
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
                    this.logger.warn('Schema validation failed with errors. Please check the GraphQL schema and fix potential issues.')
                    for(const error of this.schemaValidationErrors) {
                        this.logger.error('A schema validation error occurred: ', error)
                        this.metricsClient.increaseErrors('SchemaValidationError')
                    }
                }
            }
        } else {
            this.logger.warn('Schema update was rejected because condition set in "shouldUpdateSchema" check was not fulfilled.')
        }

        this.metricsClient.setAvailability(this.isValidSchema(this.schema) ? 1 : 0)
    }

    /** Defines whether a schema update should be executed. Default behaviour: If schema is undefined return false.
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
        //Increase request throughput
        this.metricsClient.increaseRequestThroughput(request)

        // Reject requests that do not use GET and POST methods.
        if (request.method !== 'GET' && request.method !== 'POST') {
            return this.sendResponse(response,
                {errors: [new GraphQLError('GraphQL server only supports GET and POST requests.')]},
                405,
                { Allow: 'GET, POST' })
        }

        // Reject requests if schema is invalid
        if (!this.schema || !this.isValidSchema(this.schema)) {
            this.metricsClient.setAvailability(0)
            return this.sendInvalidSchemaResponse(request, response)
        } else {
            this.metricsClient.setAvailability(1)
        }

        // Extract graphql request information (query, variables, operationName) from request
        const requestInformation = await this.requestInformationExtractor.extractInformationFromRequest(request)
        this.logDebugIfEnabled(`Extracted request information is ${JSON.stringify(requestInformation)}`)
        if (!requestInformation.query && requestInformation.error) {
            return this.sendGraphQLErrorWithStatusCodeResponse(request, response, requestInformation.error)
        } else if (!requestInformation.query) {  // Reject request if no query parameter is provided
            return this.sendMissingQueryResponse(request, response)
        }

        // Parse given GraphQL source into a document (parse(query) function)
        let documentAST: DocumentNode
        try {
            documentAST = this.parseFunction(new Source(requestInformation.query, 'GraphQL request'))
        } catch (syntaxError: unknown) {
            return this.sendSyntaxErrorResponse(request, response, syntaxError as GraphQLError)
        }
        this.logDebugIfEnabled(`Parsing query into document succeeded with document: ${JSON.stringify(documentAST)}`)

        // Validate document against schema (validate(schema, document, rules) function). Return 400 for errors
        const validationErrors = this.validateSchemaFunction(this.schema, documentAST, this.validationRules, this.validationTypeInfo, this.validationOptions)
        if (validationErrors.length > 0) {
            this.logDebugIfEnabled(`One or more validation errors occurred: ${JSON.stringify(validationErrors)}`)
            return this.sendValidationErrorResponse(request, response, this.removeValidationRecommendationsFromErrors(validationErrors))
        }

        // Reject request if get method is used for non-query(mutation) requests. Check with getOperationAST(document, operationName) function. Return 405 if thats the case
        const operationAST = getOperationAST(documentAST, requestInformation.operationName)
        if (request.method === 'GET' && operationAST && operationAST.operation !== 'query') {
            return this.sendMutationNotAllowedForGetResponse(request, response, operationAST.operation)
        }

        // Perform execution (execute(schema, document, variables, operationName, resolvers) function). Return 400 if errors are available
        try {
            const executionResult = await this.executeFunction(this.schema, documentAST, this.rootValue, this.contextValue || request, requestInformation.variables, requestInformation.operationName, this.fieldResolver, this.typeResolver)

            const extensionsResult = this.extensionFunction(request, requestInformation, executionResult)
            if (extensionsResult) {
                executionResult.extensions = extensionsResult
            }
            //Return execution result
            this.logDebugIfEnabled(`Create response from data ${JSON.stringify(executionResult)}`)
            return this.sendResponse(response, executionResult)
        } catch (e) {
            this.logDebugIfEnabled(`A GraphQL execution error occurred: ${JSON.stringify(e)}`)
            return this.sendGraphQLExecutionErrorResponse(request, response, e as GraphQLError)
        }
    }

    sendResponse(response: Response,
        executionResult: ExecutionResult,
        statusCode = 200,
        customHeaders: { [key: string]: string } = {} ): void {

        this.logDebugIfEnabled(`Preparing response with executionResult ${JSON.stringify(executionResult)}, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}`)
        if (executionResult.errors) {
            executionResult.errors.map(this.formatErrorFunction)
            for (const error of executionResult.errors) {
                this.collectErrorMetricsFunction(error)
            }
        }
        response.statusCode = statusCode
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        if (customHeaders != null) {
            for (const [key, value] of Object.entries(customHeaders)) {
                this.logDebugIfEnabled(`Set custom header ${key} to ${value}`)
                response.setHeader(key, String(value))
            }
        }

        response.end(Buffer.from(JSON.stringify(executionResult), 'utf8'))
    }

    logDebugIfEnabled(message: string): void {
        if (this.debug) {
            this.logger.debug(message)
        }
    }

    /** Sends a fitting response if the schema used by the GraphQL server is invalid */
    sendInvalidSchemaResponse(request: Request, response: Response): void {
        return this.sendResponse(response,
            {errors: [new GraphQLError('Request cannot be processed. Schema in GraphQL server is invalid.')]},
            500)
    }

    /** Sends a fitting response if there is no query available in the request */
    sendMissingQueryResponse(request: Request, response: Response): void {
        return this.sendResponse(response,
            {errors: [new GraphQLError('Request cannot be processed. No query was found in parameters or body.')]},
            400)
    }

    /** Sends a fitting response if a syntax error occurred during document parsing */
    sendSyntaxErrorResponse(request: Request, response: Response, syntaxError: GraphQLError): void {
        return this.sendResponse(response,
            {errors: [syntaxError]},
            400)
    }

    /** Sends a fitting response if a validation error response occurred during schema validation */
    sendValidationErrorResponse(request: Request, response: Response, errors: readonly GraphQLError[]): void {
        return this.sendResponse(response,
            {errors: errors},
            400)
    }

    /** Sends a fitting response if a mutation is requested in a GET request */
    sendMutationNotAllowedForGetResponse(request: Request, response: Response, operation: OperationTypeNode): void {
        return this.sendResponse(response,
            {errors: [new GraphQLError(`Operation ${operation} is only allowed in POST requests`)]},
            405,
            {Allow: 'POST'})
    }

    /** Sends a fitting response if a syntax error occurred during document parsing */
    sendGraphQLExecutionErrorResponse(request: Request, response: Response, error: GraphQLError): void {
        return this.sendResponse(response,
            {errors: [error]},
            400)
    }

    /** Sends an error response using information from an GraphQLErrorWithStatusCode error
     * @param {Request} request - The initial request
     * @param {Response} response - The response to send
     * @param {GraphQLErrorWithStatusCode} error - An error that occurred while executing a function
     */
    sendGraphQLErrorWithStatusCodeResponse(request: Request, response: Response, error: GraphQLErrorWithStatusCode): void {
        return this.sendResponse(response,
            {errors: [error.graphQLError]},
            error.statusCode)
    }

    // Removes validation recommendations matching the defined recommendation text
    removeValidationRecommendationsFromErrors(validationErrors: ReadonlyArray<GraphQLError>): ReadonlyArray<GraphQLError> {
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

    /** Default extension function that can be used to fill extensions field of GraphQL response. Can be set in options.
     * @param {Request} request - The initial request
     * @param {GraphQLRequestInfo} requestInfo - The extracted requestInfo
     * @param {ExecutionResult} executionResult - The executionResult created by execute function
     * @returns {MaybePromise<undefined | { [key: string]: unknown }>} A key-value map to be added as extensions in response
     */
    defaultExtensions(request: Request, requestInfo: GraphQLRequestInfo, executionResult: ExecutionResult): MaybePromise<undefined | { [key: string]: unknown }> {
        this.logDebugIfEnabled(`Calling defaultExtensions for request ${request}, requestInfo ${JSON.stringify(requestInfo)} and executionResult ${JSON.stringify(executionResult)}`)
        return undefined
    }

    /** Default collect error metrics function. Can be set in options.
     * @param {GraphQLFormattedError} error - The extracted requestInfo
     * @param {Request} request - The initial request
     */
    defaultCollectErrorMetrics(error: GraphQLError, request?: Request): void {
        this.logDebugIfEnabled(`Calling defaultCollectErrorMetrics with request ${request} and error ${error}`)
        this.metricsClient.increaseErrors(error.name, request)
    }


}
