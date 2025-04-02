import {
    FETCH_ERROR,
    GRAPHQL_ERROR,
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    MetricsClient,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    isAggregateError,
    isGraphQLServerRequest,
} from '@dreamit/graphql-server-base'
import {
    DocumentNode,
    GraphQLError,
    GraphQLSchema,
    Source,
    getOperationAST,
} from 'graphql'
import { determineGraphQLOrFetchError } from '../error/DetermineGraphQLOrFetchError'
import { determineValidationOrIntrospectionDisabledError } from '../error/DetermineValidationOrIntrospectionDisabledError'
import { removeValidationRecommendationsFromErrors } from '../error/RemoveValidationRecommendationsFromErrors'
import { increaseFetchOrGraphQLErrorMetric } from '../metrics/IncreaseFetchOrGraphQLErrorMetric'
import { SimpleMetricsClient } from '../metrics/SimpleMetricsClient'
import { requestCouldNotBeProcessed } from '../request/RequestConstants'
import { getFirstErrorFromExecutionResult } from '../response/GraphQLExecutionResult'
import { getRequestInformation as getRequestInformationFunction } from '../server/GetRequestInformation'
import { DefaultGraphQLServerOptions } from './DefaultGraphQLServerOptions'
import { GraphQLServerOptions } from './GraphQLServerOptions'

const defaultOptions = new DefaultGraphQLServerOptions()

export class GraphQLServer {
    options: DefaultGraphQLServerOptions = new DefaultGraphQLServerOptions()
    schemaValidationErrors: readonly GraphQLError[] = []

    constructor(optionsParameter?: GraphQLServerOptions) {
        this.setOptions(optionsParameter)
    }

    setOptions(newOptions?: GraphQLServerOptions): void {
        this.options = { ...defaultOptions, ...newOptions }
        this.setMetricsClient(
            newOptions?.metricsClient ?? new SimpleMetricsClient(),
        )
        this.setSchema(newOptions?.schema)
    }

    /**
     * Sets a metrics client for to be used in the GraphQLServer.
     * @param {MetricsClient} metricsClient - The metrics client to use in the GraphQLServer
     */
    setMetricsClient(metricsClient: MetricsClient): void {
        this.options.metricsClient = metricsClient
        this.options.metricsClient.setAvailability(
            this.isValidSchema(this.options.schema) ? 1 : 0,
        )
    }

    getSchema(): GraphQLSchema | undefined {
        return this.options.schema
    }

    isValidSchema(schema?: GraphQLSchema): boolean {
        return schema ? this.schemaValidationErrors.length === 0 : false
    }

    setSchema(schema?: GraphQLSchema): void {
        const logger = this.options.logger
        logger.info('Trying to set graphql schema')
        logger.debug(`Schema is  ${JSON.stringify(schema)}`)
        if (this.options.shouldUpdateSchemaFunction(schema)) {
            this.options.schema = schema
            // Validate schema
            if (this.options.schema) {
                this.schemaValidationErrors =
                    this.options.schemaValidationFunction(this.options.schema)
                if (this.schemaValidationErrors.length > 0) {
                    logger.warn(
                        'Schema validation failed with errors. Please check the GraphQL schema and fix potential issues.',
                    )
                    for (const error of this.schemaValidationErrors) {
                        logger.error(
                            'A schema validation error occurred: ',
                            error,
                            SCHEMA_VALIDATION_ERROR,
                        )
                        this.options.collectErrorMetricsFunction({
                            error,
                            errorName: SCHEMA_VALIDATION_ERROR,
                            serverOptions: this.options,
                        })
                    }
                }
            }
        } else {
            logger.warn(
                'Schema update was rejected because condition set in "shouldUpdateSchema" check was not fulfilled.',
            )
        }
        this.options.metricsClient.setAvailability(
            this.isValidSchema(this.options.schema) ? 1 : 0,
        )
    }

    getSchemaValidationErrors(): ReadonlyArray<GraphQLError> | undefined {
        return this.schemaValidationErrors
    }

    // Gets the Content-Type of the metrics for use in the response headers
    getMetricsContentType(): string {
        return this.options.metricsClient.getMetricsContentType()
    }

    // Gets the metrics for use in the response body.
    async getMetrics(): Promise<string> {
        return await this.options.metricsClient.getMetrics()
    }

    /**
     * Executes a given request and returns an execution result
     * @param {GraphQLServerRequest | GraphQLRequestInfo} request -
     * The server request or request information
     * @param {GraphQLServerResponse} response - If set sends a response, else not
     * @returns {GraphQLExecutionResult} The execution result
     */
    async handleRequest(
        request: GraphQLServerRequest | GraphQLRequestInfo,
        response?: GraphQLServerResponse,
    ): Promise<GraphQLExecutionResult> {
        const {
            adjustGraphQLExecutionResult,
            contextFunction,
            formatErrorFunction,
            logger,
            metricsClient,
            sendResponse,
            responseEndChunkFunction,
            responseStandardSchema,
        } = this.options

        const context = contextFunction({
            request: isGraphQLServerRequest(request) ? request : undefined,
            response,
            serverOptions: this.options,
        })
        metricsClient.increaseRequestThroughput(context)
        const requestInformation = isGraphQLServerRequest(request)
            ? this.getRequestInformation(request, context)
            : request
        if ('query' in requestInformation && context && context !== request) {
            const contextAsRecord = context as Record<string, unknown>
            contextAsRecord.query = requestInformation.query
        }
        if (
            isGraphQLServerRequest(request) &&
            'executionResult' in requestInformation
        ) {
            let result: GraphQLExecutionResult = {
                customHeaders: requestInformation.customHeaders,
                executionResult: requestInformation.executionResult,
                statusCode: requestInformation.statusCode,
            }

            if (adjustGraphQLExecutionResult) {
                result = adjustGraphQLExecutionResult({
                    context,
                    executionResult: result,
                    formatErrorFunction,
                    logger,
                    request: request,
                })
            }

            if (response && isGraphQLServerRequest(request)) {
                sendResponse({
                    context,
                    customHeaders: result.customHeaders,
                    executionResult: result.executionResult,
                    formatErrorFunction,
                    logger,
                    request,
                    response,
                    responseEndChunkFunction,
                    responseStandardSchema,
                    statusCode: result.statusCode,
                })
            }
            return result
        }

        let result = await this.executeRequestWithInfo(
            requestInformation as GraphQLRequestInfo,
            context,
            isGraphQLServerRequest(request) ? request.method : undefined,
        )

        if (adjustGraphQLExecutionResult) {
            result = adjustGraphQLExecutionResult({
                context,
                executionResult: result,
                formatErrorFunction,
                logger,
                request: isGraphQLServerRequest(request) ? request : undefined,
            })
        }

        if (response) {
            sendResponse({
                context,
                customHeaders: result.customHeaders,
                executionResult: result.executionResult,
                formatErrorFunction,
                logger,
                request: isGraphQLServerRequest(request) ? request : undefined,
                response,
                responseEndChunkFunction,
                responseStandardSchema,
                statusCode: result.statusCode,
            })
        }
        return result
    }

    /**
     * Extracts the request information from a given request
     * @deprecated Use getRequestInformation function instead
     * @param {GraphQLServerRequest} request - The server request
     * @param {unknown} context - The context to be used
     * @returns {GraphQLRequestInfo | GraphQLExecutionResult} The request information
     * or an execution result if an error occurred
     */
    getRequestInformation(
        request: GraphQLServerRequest,
        context: unknown,
    ): GraphQLRequestInfo | GraphQLExecutionResult {
        return getRequestInformationFunction(request, context, this.options)
    }

    async executeRequestWithInfo(
        requestInformation: GraphQLRequestInfo,
        context?: unknown,
        requestMethod?: string,
    ): Promise<GraphQLExecutionResult> {
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
            removeValidationRecommendations,
            validationErrorMessage,
            executionResultErrorMessage,
            graphqlExecutionErrorMessage,
            fetchErrorMessage,
        } = this.options

        // Reject requests if schema is invalid
        if (!schema || !this.isValidSchema(schema)) {
            metricsClient.setAvailability(0)
            const error = getFirstErrorFromExecutionResult(
                invalidSchemaResponse,
            )
            logger.error(
                requestCouldNotBeProcessed,
                error,
                INVALID_SCHEMA_ERROR,
                context,
            )
            collectErrorMetricsFunction({
                context,
                error,
                errorName: INVALID_SCHEMA_ERROR,
                serverOptions: this.options,
            })
            return { ...invalidSchemaResponse, ...requestInformation }
        } else {
            metricsClient.setAvailability(1)
        }

        if (!requestInformation.query && requestInformation.error) {
            logger.error(
                requestCouldNotBeProcessed,
                requestInformation.error.graphQLError,
                GRAPHQL_ERROR,
                context,
            )
            collectErrorMetricsFunction({
                context,
                error: requestInformation.error,
                errorName: GRAPHQL_ERROR,
                serverOptions: this.options,
            })
            return {
                executionResult: {
                    errors: [requestInformation.error.graphQLError],
                },
                requestInformation: requestInformation,
                statusCode: requestInformation.error.statusCode,
            }
        }
        // Reject request if no query parameter is provided
        else if (!requestInformation.query) {
            const response = missingQueryParameterResponse(requestMethod)
            const error = getFirstErrorFromExecutionResult(response)
            logger.error(
                requestCouldNotBeProcessed,
                error,
                MISSING_QUERY_PARAMETER_ERROR,
                context,
            )
            collectErrorMetricsFunction({
                context,
                error,
                errorName: MISSING_QUERY_PARAMETER_ERROR,
                serverOptions: this.options,
            })
            return { ...response, ...requestInformation }
        }

        // Parse given GraphQL source into a document (parse(query) function)
        let documentAST: DocumentNode
        try {
            documentAST = parseFunction(
                new Source(requestInformation.query, 'GraphQL request'),
            )
        } catch (syntaxError: unknown) {
            logger.error(
                requestCouldNotBeProcessed,
                syntaxError as GraphQLError,
                SYNTAX_ERROR,
                context,
            )
            collectErrorMetricsFunction({
                context,
                error: syntaxError,
                errorName: SYNTAX_ERROR,
                serverOptions: this.options,
            })
            return {
                executionResult: { errors: [syntaxError as GraphQLError] },
                requestInformation: requestInformation,
                statusCode: 400,
            }
        }
        logger.debug(
            `Parsing query into document succeeded with document: ${JSON.stringify(documentAST)}`,
            context,
        )

        /**
         * Validate document against schema (
         * validate(schema, document, rules) function). Return 400 for errors
         */
        const validationErrors = validateFunction(
            schema,
            documentAST,
            [...defaultValidationRules, ...customValidationRules],
            validationOptions,
            validationTypeInfo,
        )
        if (validationErrors.length > 0) {
            logger.debug(
                `One or more validation errors occurred: ${JSON.stringify(validationErrors)}`,
                context,
            )
            for (const validationError of validationErrors) {
                const errorName =
                    determineValidationOrIntrospectionDisabledError(
                        validationError,
                    )
                logger.error(
                    validationErrorMessage,
                    validationError,
                    errorName,
                    context,
                )
                collectErrorMetricsFunction({
                    context,
                    error: validationError,
                    errorName,
                    serverOptions: this.options,
                })
            }
            return {
                executionResult: {
                    errors: removeValidationRecommendations
                        ? removeValidationRecommendationsFromErrors(
                              validationErrors,
                          )
                        : validationErrors,
                },
                requestInformation: requestInformation,
                statusCode: 400,
            }
        }

        /**
         * Reject request if get method is used for non-query(mutation) requests.
         * Check with getOperationAST(document, operationName) function.
         * Return 405 if that is the case
         */
        const operationAST = getOperationAST(
            documentAST,
            requestInformation.operationName,
        )
        if (
            requestMethod === 'GET' &&
            operationAST &&
            operationAST.operation !== 'query'
        ) {
            const response = onlyQueryInGetRequestsResponse(
                operationAST.operation,
            )
            const error = getFirstErrorFromExecutionResult(response)
            logger.error(
                requestCouldNotBeProcessed,
                error,
                METHOD_NOT_ALLOWED_ERROR,
                context,
            )
            collectErrorMetricsFunction({
                context,
                error,
                errorName: METHOD_NOT_ALLOWED_ERROR,
                serverOptions: this.options,
            })
            return { ...response, ...requestInformation }
        }

        /**
         * Perform execution
         * (execute(schema, document, variables, operationName, resolvers) function).
         * Return 400 if errors are available
         */
        try {
            const executionResult = await executeFunction({
                contextValue: context,
                document: documentAST,
                fieldResolver: fieldResolver,
                operationName: requestInformation.operationName,
                rootValue: rootValue,
                schema: schema,
                typeResolver: typeResolver,
                variableValues: requestInformation.variables,
            })

            const extensionsResult = extensionFunction({
                context,
                executionResult,
                requestInformation,
                serverOptions: this.options,
            })
            if (extensionsResult) {
                executionResult.extensions = extensionsResult
            }

            // Collect error metrics for execution result
            if (executionResult.errors && executionResult.errors.length > 0) {
                for (const error of executionResult.errors) {
                    if (
                        reassignAggregateError &&
                        error.originalError &&
                        isAggregateError(error.originalError)
                    ) {
                        logger.debug(
                            'Error is AggregateError and reassignAggregateError feature is enabled. AggregateError will be reassigned to original errors field.',
                            context,
                        )
                        executionResult.errors = error.originalError.errors
                    }

                    const graphqlOrFetchError =
                        determineGraphQLOrFetchError(error)
                    if (
                        graphqlOrFetchError === FETCH_ERROR &&
                        fetchErrorMessage !== undefined
                    ) {
                        error.message = fetchErrorMessage
                    }

                    logger.error(
                        executionResultErrorMessage,
                        error,
                        graphqlOrFetchError,
                        context,
                    )
                    increaseFetchOrGraphQLErrorMetric(
                        error,
                        this.options,
                        context,
                    )
                }
            }

            // Return execution result
            logger.debug(
                `Create response from data ${JSON.stringify(executionResult)}`,
                context,
            )
            return {
                executionResult,
                requestInformation: requestInformation,
                statusCode: 200,
            }
        } catch (error: unknown) {
            logger.error(
                graphqlExecutionErrorMessage,
                error as GraphQLError,
                determineGraphQLOrFetchError(error),
                context,
            )
            increaseFetchOrGraphQLErrorMetric(error, this.options, context)
            return {
                executionResult: { errors: [error as GraphQLError] },
                requestInformation: requestInformation,
                statusCode: 400,
            }
        }
    }
}
