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
    GraphQLErrorWithStatusCode,
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
} from '..'

export interface GraphQLRequestInfo {
    query?: string
    variables?: Readonly<Record<string, unknown>>
    operationName?: string
    error?: GraphQLErrorWithStatusCode
}

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
            collectErrorMetricsFunction,
            schema,
            requestInformationExtractor,
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
            formatErrorFunction,
            removeValidationRecommendations
        } = this.options
        const context = contextFunction(request, response, logger)

        // Increase request throughput
        metricsClient.increaseRequestThroughput(request, context)

        // Reject requests that do not use GET and POST methods.
        if (request.method !== 'GET' && request.method !== 'POST') {
            logger.error(requestCouldNotBeProcessed,
                responseHandler.methodNotAllowedError,
                METHOD_NOT_ALLOWED_ERROR,
                request,
                context)
            collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                responseHandler.methodNotAllowedError,
                request,
                context,
                logger,
                metricsClient)
            return responseHandler.sendMethodNotAllowedResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction
            })
        }

        logger.info(
            `Incoming request with url ${request.url} ` +
            `and content-type ${JSON.stringify(request.headers['content-type'])}`,
            request,
            context
        )

        // Reject requests if schema is invalid
        if (!schema || !this.isValidSchema(schema)) {
            metricsClient.setAvailability(0)
            logger.error(requestCouldNotBeProcessed,
                responseHandler.invalidSchemaError,
                INVALID_SCHEMA_ERROR,
                request,
                context)
            collectErrorMetricsFunction(INVALID_SCHEMA_ERROR,
                responseHandler.invalidSchemaError,
                request,
                context,
                logger,
                metricsClient)
            return responseHandler.sendInvalidSchemaResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction
            })
        } else {
            metricsClient.setAvailability(1)
        }

        // Extract graphql request information (query, variables, operationName) from request
        const requestInformation =
            await requestInformationExtractor.extractInformationFromRequest(request)
        logger.logDebugIfEnabled(
            `Extracted request information is ${JSON.stringify(requestInformation)}`,
            request,
            context
        )
        if (!requestInformation.query && requestInformation.error) {
            logger.error(requestCouldNotBeProcessed,
                requestInformation.error.graphQLError,
                GRAPHQL_ERROR,
                request,
                context)
            collectErrorMetricsFunction(GRAPHQL_ERROR,
                requestInformation.error,
                request,
                context,
                logger,
                metricsClient)
            return responseHandler.sendResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction,
                executionResult: {errors: [requestInformation.error.graphQLError]},
                statusCode: requestInformation.error.statusCode
            })
        }
        // Reject request if no query parameter is provided
        else if (!requestInformation.query) {
            logger.error(requestCouldNotBeProcessed,
                responseHandler.missingQueryParameterError,
                MISSING_QUERY_PARAMETER_ERROR,
                request,
                context)
            collectErrorMetricsFunction(MISSING_QUERY_PARAMETER_ERROR,
                responseHandler.missingQueryParameterError,
                request,
                context,
                logger,
                metricsClient)
            return responseHandler.sendMissingQueryResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction
            })
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
                request,
                context)
            collectErrorMetricsFunction(SYNTAX_ERROR,
                syntaxError,
                request,
                context,
                logger,
                metricsClient)

            return responseHandler.sendResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction,
                executionResult: {errors: [syntaxError as GraphQLError]},
                statusCode: 400
            })
        }
        logger.logDebugIfEnabled(
            `Parsing query into document succeeded with document: ${JSON.stringify(documentAST)}`,
            request,
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
                request,
                context
            )
            for (const validationError of validationErrors) {
                const errorClassName =
                    determineValidationOrIntrospectionDisabledError(validationError)
                logger.error('While processing the request ' +
                    'the following validation error occurred: ',
                validationError,
                errorClassName,
                request,
                context)
                collectErrorMetricsFunction(errorClassName,
                    validationError,
                    request,
                    context,
                    logger,
                    metricsClient)
            }
            return responseHandler.sendResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction,
                executionResult: {
                    errors: !removeValidationRecommendations ? validationErrors
                        : removeValidationRecommendationsFromErrors(validationErrors)
                },
                statusCode: 400
            })
        }

        /**
         * Reject request if get method is used for non-query(mutation) requests.
         * Check with getOperationAST(document, operationName) function.
         * Return 405 if that is the case
         */
        const operationAST = getOperationAST(documentAST, requestInformation.operationName)
        if (request.method === 'GET' && operationAST && operationAST.operation !== 'query') {
            logger.error(requestCouldNotBeProcessed,
                responseHandler.onlyQueryInGetRequestsError,
                METHOD_NOT_ALLOWED_ERROR,
                request,
                context)
            collectErrorMetricsFunction(METHOD_NOT_ALLOWED_ERROR,
                responseHandler.onlyQueryInGetRequestsError,
                request,
                context,
                logger,
                metricsClient)
            return responseHandler.sendMutationNotAllowedForGetResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction
            })
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

            const extensionsResult = extensionFunction(request,
                requestInformation,
                executionResult,
                logger)
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
                        request,
                        context)
                        executionResult.errors = error.originalError.errors
                    }

                    logger.error('While processing the request ' +
                        'the following error occurred: ',
                    error,
                    determineGraphQLOrFetchError(error),
                    request,
                    context)
                    increaseFetchOrGraphQLErrorMetric(error,
                        request,
                        context,
                        logger,
                        metricsClient,
                        collectErrorMetricsFunction)
                }
            }

            // Return execution result
            logger.logDebugIfEnabled(
                `Create response from data ${JSON.stringify(executionResult)}`,
                request,
                context
            )
            return responseHandler.sendResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction,
                executionResult,
                statusCode: 200
            })
        } catch (error: unknown) {
            logger.error('While processing the request ' +
                'a GraphQL execution error occurred',
            error as GraphQLError,
            determineGraphQLOrFetchError(error),
            request,
            context)
            increaseFetchOrGraphQLErrorMetric(error,
                request,
                context,
                logger,
                metricsClient,
                collectErrorMetricsFunction)
            return responseHandler.sendResponse({
                request,
                response,
                context,
                logger,
                formatErrorFunction,
                executionResult: {errors: [error as GraphQLError]},
                statusCode: 400
            })
        }
    }
}
