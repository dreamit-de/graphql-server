import {
    DocumentNode,
    ExecutionResult,
    GraphQLError,
    GraphQLSchema,
    parse,
    ParseOptions,
    Source,
    validateSchema
} from 'graphql'
import {IncomingMessage,
    ServerResponse} from 'http'
import {Logger} from '../logger/Logger'
import {GraphQLServerOptions} from './GraphQLServerOptions'
import {TextLogger} from '../logger/TextLogger'
import {GraphQLErrorWithStatusCode} from './GraphQLErrorWithStatusCode'
import {GraphQLRequestInformationExtractor} from './GraphQLRequestInformationExtractor'

export type Request = IncomingMessage & { url: string,  body?: unknown }
export type Response = ServerResponse & { json?: (data: unknown) => void }

export interface GraphQLRequestInfo {
    query?: string
    variables?: { readonly [name: string]: unknown }
    operationName?: string
    error?: GraphQLErrorWithStatusCode
}

const fallbackTextLogger = new TextLogger('fallback-logger', 'fallback-service')
const defaultRequestInformationExtractor = new GraphQLRequestInformationExtractor()

export class GraphQLServer {
    private logger: Logger = fallbackTextLogger
    private debug = false
    private requestInformationExtractor = defaultRequestInformationExtractor
    private schema?: GraphQLSchema
    private schemaValidationFunction: (schema: GraphQLSchema) => ReadonlyArray<GraphQLError> = validateSchema
    private schemaValidationErrors: ReadonlyArray<GraphQLError> = []
    private parseFunction: (source: string | Source, options?: ParseOptions) => DocumentNode = parse

    constructor(options?: GraphQLServerOptions) {
        this.setOptions(options)
    }

    setOptions(options?: GraphQLServerOptions): void {
        if (options) {
            this.logger = options.logger || fallbackTextLogger
            this.debug = options.debug || false
            this.requestInformationExtractor = options.requestInformationExtractor || defaultRequestInformationExtractor
            this.schemaValidationFunction = options.schemaValidationFunction || validateSchema
            this.parseFunction = options.parseFunction || parse
            this.setSchema(options.schema)
        }
    }

    getSchema(): GraphQLSchema | undefined {
        return this.schema
    }

    setSchema(schema?: GraphQLSchema): void {
        this.logger.info('Trying to update graphql schema')
        this.logDebugIfEnabled(`Schema is  ${JSON.stringify(schema)}`)
        if (this.shouldUpdateSchema(schema)) {
            this.schema = schema
            // Validate schema
            if (this.schema) {
                this.schemaValidationErrors = this.schemaValidationFunction(this.schema)
                if (this.schemaValidationErrors.length > 0) {
                    this.logger.warn('Schema validation failed with errors. Please check the GraphQL schema and fix potential issues.')
                    for(const error of this.schemaValidationErrors) {
                        this.logger.error('A schema validation error occurred: ', error)
                    }
                }
            }
        } else {
            this.logger.warn('Schema update was rejected because condition set in "shouldUpdateSchema" check was not fulfilled.')
        }
    }

    /** Defines whether a schema update should be executed. Default behaviour: If schema is undefined return false.
     * @param {GraphQLSchema} schema - The new schema to use as updated schema.
     * @returns {boolean} True if schema should be updated, false if not
     */
    shouldUpdateSchema(schema?: GraphQLSchema): boolean {
        return !!schema
    }

    getSchemaValidationErrors():  ReadonlyArray<GraphQLError> | undefined {
        return this.schemaValidationErrors
    }

    async handleRequest(request: Request, response: Response): Promise<void> {
        // Reject requests that do not use GET and POST methods.
        if (request.method !== 'GET' && request.method !== 'POST') {
            return this.sendResponse(response,
                {errors: [new GraphQLError('GraphQL server only supports GET and POST requests.')]},
                405,
                { Allow: 'GET, POST' })
        }

        // Reject requests if schema is invalid
        if (!this.schema || this.schemaValidationErrors.length > 0) {
            return this.sendInvalidSchemaResponse(request, response)
        }

        // Extract graphql request information (query, variables, operationName) from request
        const requestInformation = await this.requestInformationExtractor.extractInformationFromRequest(request)
        this.logger.info(`Request information is ${JSON.stringify(requestInformation)}`)
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

        // Reject request if get method is used for non-query(mutation) requests. Check with getOperationAST(document, operationName) function. Return 405 if thats the case

        // Perform execution (execute(schema, document, variables, operationName, resolvers) function). Return 400 if errors are available

        // Handle extensionFunction if one is provided

        // Set status code to 500 if status is 200 and data is empty

        // Format errors if custom formatError functions is provided.


        //Prepare example response
        const exampleResponseData = {response:'hello world'}
        this.logDebugIfEnabled(`Create response from data ${JSON.stringify(exampleResponseData)}`)
        return this.sendResponse(response, {data: exampleResponseData})
    }

    sendResponse(response: Response,
        executionResult: ExecutionResult,
        statusCode = 200,
        customHeaders: { [key: string]: string } = {} ): void {

        this.logDebugIfEnabled(`Preparing response with executionResult ${JSON.stringify(executionResult)}, status code ${statusCode} and custom headers ${JSON.stringify(customHeaders)}`)
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


}
