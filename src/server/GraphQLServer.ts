import {
    DocumentNode,
    getOperationAST,
    GraphQLError,
    GraphQLSchema,
    Source,
    validate,
} from 'graphql'
import {
    GraphQLServerOptions,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    GraphQLServerRequest,
    GraphQLServerResponse,
    isAggregateError,
    determineGraphQLOrFetchError,
    determineValidationOrIntrospectionDisabledError,
    DefaultGraphQLServerOptions,
    removeValidationRecommendationsFromErrors,
    increaseFetchOrGraphQLErrorMetric,
    GraphQLRequestInfo,
    GraphQLErrorWithInfo,
    GraphQLExecutionResult,
} from '..'

const requestCouldNotBeProcessed = 'Request could not be processed: '
const defaultOptions = new DefaultGraphQLServerOptions()

export class GraphQLServer {
    protected options = new DefaultGraphQLServerOptions()
    protected schemaValidationErrors: ReadonlyArray<GraphQLError> = []

    constructor(options?: GraphQLServerOptions) {
        this.setOptions(options)
    }

    setOptions(newOptions?: GraphQLServerOptions): void {
        if (newOptions) {
            this.options = {
                logger: newOptions.logger || defaultOptions.logger,
                requestInformationExtractor:
                    newOptions.requestInformationExtractor
                    || defaultOptions.requestInformationExtractor,
                responseHandler:
                    newOptions.responseHandler
                    || defaultOptions.responseHandler,
                metricsClient: newOptions.metricsClient || defaultOptions.metricsClient,
                formatErrorFunction: newOptions.formatErrorFunction
                    || defaultOptions.formatErrorFunction,
                collectErrorMetricsFunction:
                    newOptions.collectErrorMetricsFunction
                    || defaultOptions.collectErrorMetricsFunction,
                schemaValidationFunction:
                    newOptions.schemaValidationFunction
                    || defaultOptions.schemaValidationFunction,
                parseFunction: newOptions.parseFunction || defaultOptions.parseFunction,
                defaultValidationRules:
                    newOptions.defaultValidationRules
                    || defaultOptions.defaultValidationRules,
                customValidationRules:
                    newOptions.customValidationRules
                    || defaultOptions.customValidationRules,
                validationTypeInfo: newOptions.validationTypeInfo,
                validationOptions: newOptions.validationOptions,
                removeValidationRecommendations:
                    newOptions.removeValidationRecommendations === undefined
                        ? true
                        : newOptions.removeValidationRecommendations,
                reassignAggregateError:
                    newOptions.reassignAggregateError === undefined
                        ? false
                        : newOptions.reassignAggregateError,
                validateFunction: newOptions.validateFunction || validate,
                rootValue: newOptions.rootValue,
                contextFunction: newOptions.contextFunction || defaultOptions.contextFunction,
                fieldResolver: newOptions.fieldResolver,
                typeResolver: newOptions.typeResolver,
                executeFunction: newOptions.executeFunction || defaultOptions.executeFunction,
                extensionFunction: newOptions.extensionFunction || defaultOptions.extensionFunction,
                shouldUpdateSchemaFunction:
                    newOptions.shouldUpdateSchemaFunction
                    || defaultOptions.shouldUpdateSchemaFunction,

            }
            this.setSchema(newOptions.schema)
        }
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

    async handleRequest(request: GraphQLServerRequest,
        response: GraphQLServerResponse): Promise<void> {
        const {
            contextFunction,
            logger,
            metricsClient,
            responseHandler,
            formatErrorFunction,
        } = this.options

        const context = contextFunction(request, response, logger)
        metricsClient.increaseRequestThroughput(context)
        const requestInformation = await this.getRequestInformation(request, context)
        if ('graphQLError' in requestInformation) {
            return responseHandler.sendErrorResponse(requestInformation, {
                request,
                response,
                context,
                logger,
                formatErrorFunction
            })
        }

        const result = await this.executeRequestWithInfo(requestInformation,
            response,
            request.method,
            context)

        if ('graphQLError' in result) {
            return responseHandler.sendErrorResponse(result, {
                request,
                response,
                context,
                logger,
                formatErrorFunction
            })
        } else {
            const graphQLResult = result as GraphQLExecutionResult
            return responseHandler.sendResponse({
                executionResult: graphQLResult.executionResult,
                request,
                response,
                context,
                logger,
                formatErrorFunction,
                statusCode: graphQLResult.statusCode,
                customHeaders: graphQLResult.customHeaders
            })
        }
    }

    protected async getRequestInformation(request: GraphQLServerRequest,
        context: unknown): Promise<GraphQLRequestInfo | GraphQLErrorWithInfo> {
        const {
            logger,
            metricsClient,
            responseHandler,
            collectErrorMetricsFunction,
            requestInformationExtractor,
        } = this.options

        // Reject requests that do not use GET and POST methods.
        if (request.method !== 'GET' && request.method !== 'POST') {
            logger.error(requestCouldNotBeProcessed,
                responseHandler.methodNotAllowedError.graphQLError,
                METHOD_NOT_ALLOWED_ERROR,
                context)
            collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                responseHandler.methodNotAllowedError,
                context,
                logger,
                metricsClient)
            return responseHandler.methodNotAllowedError
        }

        logger.info(
            `Incoming request with url ${request.url} ` +
            `and content-type ${JSON.stringify(request.headers['content-type'])}`,
            context
        )

        // Extract graphql request information (query, variables, operationName) from request
        const requestInformation =
            await requestInformationExtractor.extractInformationFromRequest(request)
        logger.logDebugIfEnabled(
            `Extracted request information is ${JSON.stringify(requestInformation)}`,
            context
        )
        return requestInformation
    }

    protected async executeRequestWithInfo(requestInformation: GraphQLRequestInfo,
        response: GraphQLServerResponse,
        requestMethod = 'POST',
        context?: unknown): Promise<GraphQLExecutionResult | GraphQLErrorWithInfo> {
        const {
            logger,
            metricsClient,
            responseHandler,
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
            logger.error(requestCouldNotBeProcessed,
                responseHandler.invalidSchemaError.graphQLError,
                INVALID_SCHEMA_ERROR,
                context)
            collectErrorMetricsFunction(INVALID_SCHEMA_ERROR,
                responseHandler.invalidSchemaError,
                context,
                logger,
                metricsClient)
            return responseHandler.invalidSchemaError
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
            }
        }
        // Reject request if no query parameter is provided
        else if (!requestInformation.query) {
            logger.error(requestCouldNotBeProcessed,
                responseHandler.missingQueryParameterError.graphQLError,
                MISSING_QUERY_PARAMETER_ERROR,
                context)
            collectErrorMetricsFunction(MISSING_QUERY_PARAMETER_ERROR,
                responseHandler.missingQueryParameterError,
                context,
                logger,
                metricsClient)
            return responseHandler.missingQueryParameterError
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
                statusCode: 400
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
                    errors: !removeValidationRecommendations ? validationErrors
                        : removeValidationRecommendationsFromErrors(validationErrors)
                },
                statusCode: 400
            }
        }

        /**
         * Reject request if get method is used for non-query(mutation) requests.
         * Check with getOperationAST(document, operationName) function.
         * Return 405 if that is the case
         */
        const operationAST = getOperationAST(documentAST, requestInformation.operationName)
        if (requestMethod === 'GET' && operationAST && operationAST.operation !== 'query') {
            logger.error(requestCouldNotBeProcessed,
                responseHandler.onlyQueryInGetRequestsError.graphQLError,
                METHOD_NOT_ALLOWED_ERROR,
                context)
            collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                responseHandler.onlyQueryInGetRequestsError,
                context,
                logger,
                metricsClient)
            return responseHandler.onlyQueryInGetRequestsError
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
                statusCode: 200
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
                statusCode: 400
            }
        }
    }
}
