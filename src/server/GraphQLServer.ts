import {
    DocumentNode,
    getOperationAST,
    GraphQLError,
    GraphQLSchema,
    Source,
} from 'graphql'
import {
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    GraphQLServerRequest,
    GraphQLServerResponse,
    GraphQLRequestInfo,
    GraphQLExecutionResult,
    MetricsClient,
}  from '@sgohlke/graphql-server-base'
import {
    GraphQLServerOptions,
    isAggregateError,
    determineGraphQLOrFetchError,
    determineValidationOrIntrospectionDisabledError,
    DefaultGraphQLServerOptions,
    removeValidationRecommendationsFromErrors,
    increaseFetchOrGraphQLErrorMetric,
    getFirstErrorFromExecutionResult,
    SimpleMetricsClient,
} from '..'

const requestCouldNotBeProcessed = 'Request could not be processed: '
const defaultOptions = new DefaultGraphQLServerOptions()

export class GraphQLServer {
    protected options = new DefaultGraphQLServerOptions()
    protected schemaValidationErrors: ReadonlyArray<GraphQLError> = []

    constructor(optionsParameter?: GraphQLServerOptions) {
        this.setOptions(optionsParameter)
    }

    setOptions(newOptions?: GraphQLServerOptions): void {
        this.options = {...defaultOptions, ...newOptions}
        this.setMetricsClient(newOptions?.metricsClient ?? new SimpleMetricsClient())
        this.setSchema(newOptions?.schema)
    }

    /**
     * Sets a metrics client for to be used in the GraphQLServer.
     * @param {MetricsClient} metricsClient - The metrics client to use in the GraphQLServer
     */
    setMetricsClient(metricsClient: MetricsClient): void {
        this.options.metricsClient = metricsClient
        this.options.metricsClient.setAvailability(this.isValidSchema(this.options.schema) ? 1 : 0)
    }

    getSchema(): GraphQLSchema | undefined {
        return this.options.schema
    }

    isValidSchema(schema?: GraphQLSchema): boolean {
        return schema ? this.schemaValidationErrors.length === 0 : false
    }

    setSchema(schema?: GraphQLSchema): void {
        this.options.logger.info('Trying to set graphql schema')
        this.options.logger.logDebugIfEnabled(`Schema is  ${JSON.stringify(schema)}`)
        if (this.options.shouldUpdateSchemaFunction(schema)) {
            this.options.schema = schema
            // Validate schema
            if (this.options.schema) {
                this.schemaValidationErrors =
                    this.options.schemaValidationFunction(this.options.schema)
                if (this.schemaValidationErrors.length > 0) {
                    this.options.logger.warn('Schema validation failed with errors. ' +
                        'Please check the GraphQL schema and fix potential issues.')
                    for (const error of this.schemaValidationErrors) {
                        this.options.logger.error('A schema validation error occurred: ',
                            error,
                            SCHEMA_VALIDATION_ERROR)
                        this.options.collectErrorMetricsFunction(SCHEMA_VALIDATION_ERROR,
                            error,
                            undefined,
                            this.options.logger,
                            this.options.metricsClient)
                    }
                }
            }
        } else {
            this.options.logger.warn('Schema update was rejected because condition' +
                ' set in "shouldUpdateSchema" check was not fulfilled.')
        }
        this.options.metricsClient.setAvailability(this.isValidSchema(this.options.schema) ? 1 : 0)
    }

    getSchemaValidationErrors():  ReadonlyArray<GraphQLError> | undefined {
        return this.schemaValidationErrors
    }

    // Gets the Content-Type of the metrics for use in the response headers
    getMetricsContentType(): string {
        return this.options.metricsClient.getMetricsContentType()
    }

    // Gets the metrics for use in the response body.
    async getMetrics(): Promise<string> {
        return this.options.metricsClient.getMetrics()
    }

    /**
     * Executes a given request with requestInformation and returns an execution result
     * @param {GraphQLRequestInfo} requestInformation - The request information
     * @returns {GraphQLExecutionResult} The execution result
     */
    async executeRequest(requestInformation: GraphQLRequestInfo): Promise<GraphQLExecutionResult> {
        const {
            loggerContextFunction,
            logger,
            metricsClient,
        } = this.options

        const context = loggerContextFunction(logger, this.options)
        metricsClient.increaseRequestThroughput(context)
        return await this.executeRequestWithInfo(requestInformation, context)
    }

    /**
     * Executes a given request with requestInformation and sends a response
     * @param {GraphQLRequestInfo} requestInformation - The request information
     * @param {GraphQLServerResponse} response - The server response
     */
    async executeRequestAndSendResponse(requestInformation: GraphQLRequestInfo,
        response: GraphQLServerResponse): Promise<void>  {
        const {
            formatErrorFunction,
            loggerContextFunction,
            logger,
            metricsClient,
            sendResponse
        } = this.options

        const context = loggerContextFunction(logger, this.options)
        metricsClient.increaseRequestThroughput(context)
        const result = await this.executeRequestWithInfo(requestInformation,
            context)
        return sendResponse({
            executionResult: result.executionResult,
            response,
            context,
            logger,
            formatErrorFunction,
            statusCode: result.statusCode,
            customHeaders: result.customHeaders
        })
    }

    /**
     * Executes a given request and returns an execution result
     * @param {GraphQLServerRequest} request - The server request
     * @returns {GraphQLExecutionResult} The execution result
     */
    async handleRequest(request: GraphQLServerRequest): Promise<GraphQLExecutionResult> {
        const {
            requestContextFunction,
            logger,
            metricsClient,
        } = this.options

        const context = requestContextFunction(request, logger, this.options)
        metricsClient.increaseRequestThroughput(context)
        const requestInformation = this.getRequestInformation(request, context)
        if ('executionResult' in requestInformation) {
            return {
                executionResult: requestInformation.executionResult,
                statusCode: requestInformation.statusCode,
                customHeaders: requestInformation.customHeaders
            }
        }
        return await this.executeRequestWithInfo(requestInformation,
            context,
            request.method)
    }

    /**
     * Executes a given request and sends a response
     * @param {GraphQLServerRequest} request - The server request
     * @param {GraphQLServerResponse} response - The server response
     */
    async handleRequestAndSendResponse(request: GraphQLServerRequest,
        response: GraphQLServerResponse): Promise<void> {
        const {
            requestResponseContextFunction,
            logger,
            metricsClient,
            sendResponse,
            formatErrorFunction,
        } = this.options

        const context = requestResponseContextFunction(request, response, logger, this.options)
        metricsClient.increaseRequestThroughput(context)
        const requestInformation = this.getRequestInformation(request, context)
        if ('executionResult' in requestInformation) {
            return sendResponse({
                executionResult: requestInformation.executionResult,
                request,
                response,
                context,
                logger,
                formatErrorFunction,
                statusCode: requestInformation.statusCode,
                customHeaders: requestInformation.customHeaders
            })
        }

        const result = await this.executeRequestWithInfo(requestInformation,
            context,
            request.method)
        return sendResponse({
            executionResult: result.executionResult,
            request,
            response,
            context,
            logger,
            formatErrorFunction,
            statusCode: result.statusCode,
            customHeaders: result.customHeaders
        })
    }

    protected getRequestInformation(request: GraphQLServerRequest,
        context: unknown): GraphQLRequestInfo | GraphQLExecutionResult {
        const {
            logger,
            metricsClient,
            methodNotAllowedResponse,
            collectErrorMetricsFunction,
            extractInformationFromRequest,
        } = this.options

        // Reject requests that do not use GET and POST methods.
        if (request.method !== 'GET' && request.method !== 'POST') {
            const response = methodNotAllowedResponse(request.method)
            const error = getFirstErrorFromExecutionResult(response)
            logger.error(requestCouldNotBeProcessed,
                error,
                METHOD_NOT_ALLOWED_ERROR,
                context)
            collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                error,
                context,
                logger,
                metricsClient)
            return response
        }

        // Extract graphql request information (query, variables, operationName) from request
        const requestInformation =
            extractInformationFromRequest(request)
        logger.logDebugIfEnabled(
            `Extracted request information is ${JSON.stringify(requestInformation)}`,
            context
        )
        return requestInformation
    }

    protected async executeRequestWithInfo(requestInformation: GraphQLRequestInfo,
        context?: unknown,
        requestMethod?: string): Promise<GraphQLExecutionResult> {
        const {
            logger,
            metricsClient,
            invalidSchemaResponse,
            missingQueryParameterResponse,
            onlyQueryInGetRequestsResponse,
            collectErrorMetricsFunction,
            schema,
            parseFunction,
            validateFunction,
            defaultValidationRules,
            customValidationRules,
            validationOptions,
            validationTypeInfo,
            executeFunction,
            rootValue,
            fieldResolver,
            typeResolver,
            extensionFunction,
            reassignAggregateError,
            removeValidationRecommendations
        } = this.options

        // Reject requests if schema is invalid
        if (!schema || !this.isValidSchema(schema)) {
            metricsClient.setAvailability(0)
            const error = getFirstErrorFromExecutionResult(invalidSchemaResponse)
            logger.error(requestCouldNotBeProcessed,
                error,
                INVALID_SCHEMA_ERROR,
                context)
            collectErrorMetricsFunction(INVALID_SCHEMA_ERROR,
                error,
                context,
                logger,
                metricsClient)
            return {...invalidSchemaResponse, ...requestInformation}
        } else {
            metricsClient.setAvailability(1)
        }

        if (!requestInformation.query && requestInformation.error) {
            logger.error(requestCouldNotBeProcessed,
                requestInformation.error.graphQLError,
                GRAPHQL_ERROR,
                context)
            collectErrorMetricsFunction(GRAPHQL_ERROR,
                requestInformation.error,
                context,
                logger,
                metricsClient)
            return {
                executionResult: {errors: [requestInformation.error.graphQLError]},
                statusCode: requestInformation.error.statusCode,
                requestInformation: requestInformation
            }
        }
        // Reject request if no query parameter is provided
        else if (!requestInformation.query) {
            const error =
                getFirstErrorFromExecutionResult(missingQueryParameterResponse)
            logger.error(requestCouldNotBeProcessed,
                error,
                MISSING_QUERY_PARAMETER_ERROR,
                context)
            collectErrorMetricsFunction(MISSING_QUERY_PARAMETER_ERROR,
                error,
                context,
                logger,
                metricsClient)
            return {...missingQueryParameterResponse, ...requestInformation}
        }

        // Parse given GraphQL source into a document (parse(query) function)
        let documentAST: DocumentNode
        try {
            documentAST = parseFunction(new Source(requestInformation.query,
                'GraphQL request'))
        } catch (syntaxError: unknown) {
            logger.error(requestCouldNotBeProcessed,
                syntaxError as GraphQLError,
                SYNTAX_ERROR,
                context)
            collectErrorMetricsFunction(SYNTAX_ERROR,
                syntaxError,
                context,
                logger,
                metricsClient)
            return {
                executionResult: {errors: [syntaxError as GraphQLError]},
                statusCode: 400,
                requestInformation: requestInformation,
            }
        }
        logger.logDebugIfEnabled(
            `Parsing query into document succeeded with document: ${JSON.stringify(documentAST)}`,
            context
        )

        /**
         * Validate document against schema (
         * validate(schema, document, rules) function). Return 400 for errors
         */
        const validationErrors = validateFunction(schema,
            documentAST,
            [...defaultValidationRules, ...customValidationRules],
            validationOptions,
            validationTypeInfo)
        if (validationErrors.length > 0) {
            logger.logDebugIfEnabled(
                `One or more validation errors occurred: ${JSON.stringify(validationErrors)}`,
                context
            )
            for (const validationError of validationErrors) {
                const errorClassName =
                    determineValidationOrIntrospectionDisabledError(validationError)
                logger.error('While processing the request ' +
                    'the following validation error occurred: ',
                validationError,
                errorClassName,
                context)
                collectErrorMetricsFunction(errorClassName,
                    validationError,
                    context,
                    logger,
                    metricsClient)
            }
            return {
                executionResult: {
                    errors: removeValidationRecommendations
                        ? removeValidationRecommendationsFromErrors(validationErrors)
                        : validationErrors
                },
                statusCode: 400,
                requestInformation: requestInformation,
            }
        }

        /**
         * Reject request if get method is used for non-query(mutation) requests.
         * Check with getOperationAST(document, operationName) function.
         * Return 405 if that is the case
         */
        const operationAST = getOperationAST(documentAST, requestInformation.operationName)
        if (requestMethod === 'GET' && operationAST && operationAST.operation !== 'query') {
            const response = onlyQueryInGetRequestsResponse(operationAST.operation)
            const error =
                getFirstErrorFromExecutionResult(response)
            logger.error(requestCouldNotBeProcessed,
                error,
                METHOD_NOT_ALLOWED_ERROR,
                context)
            collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                error,
                context,
                logger,
                metricsClient)
            return {...response, ...requestInformation}
        }

        /**
         * Perform execution
         * (execute(schema, document, variables, operationName, resolvers) function).
         * Return 400 if errors are available
         */
        try {
            const executionResult = await executeFunction({
                schema: schema,
                document: documentAST,
                rootValue: rootValue,
                contextValue: context,
                variableValues: requestInformation.variables,
                operationName: requestInformation.operationName,
                fieldResolver: fieldResolver,
                typeResolver: typeResolver
            })

            const extensionsResult = extensionFunction(
                requestInformation,
                executionResult,
                logger,
                context
            )
            if (extensionsResult) {
                executionResult.extensions = extensionsResult
            }

            // Collect error metrics for execution result
            if (executionResult.errors && executionResult.errors.length > 0) {
                for (const error of executionResult.errors) {
                    if (reassignAggregateError
                        && error.originalError
                        && isAggregateError(error.originalError)) {
                        logger.logDebugIfEnabled('Error is AggregateError and ' +
                            'reassignAggregateError feature is enabled. AggregateError ' +
                            'will be reassigned to original errors field.',
                        context)
                        executionResult.errors = error.originalError.errors
                    }

                    logger.error('While processing the request ' +
                        'the following error occurred: ',
                    error,
                    determineGraphQLOrFetchError(error),
                    context)
                    increaseFetchOrGraphQLErrorMetric(error,
                        context,
                        logger,
                        metricsClient,
                        collectErrorMetricsFunction)
                }
            }

            // Return execution result
            logger.logDebugIfEnabled(
                `Create response from data ${JSON.stringify(executionResult)}`,
                context
            )
            return {
                executionResult,
                statusCode: 200,
                requestInformation: requestInformation,
            }
        } catch (error: unknown) {
            logger.error('While processing the request ' +
                'a GraphQL execution error occurred',
                error as GraphQLError,
                determineGraphQLOrFetchError(error),
                context)
            increaseFetchOrGraphQLErrorMetric(error,
                context,
                logger,
                metricsClient,
                collectErrorMetricsFunction)
            return {
                executionResult: {errors: [error as GraphQLError]},
                statusCode: 400,
                requestInformation: requestInformation,
            }
        }
    }
}
