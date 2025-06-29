import type {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    MetricsClient,
    ResponseFormat,
} from '@dreamit/graphql-server-base'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import {
    FETCH_ERROR,
    GRAPHQL_ERROR,
    INVALID_SCHEMA_ERROR,
    METHOD_NOT_ALLOWED_ERROR,
    MISSING_QUERY_PARAMETER_ERROR,
    SCHEMA_VALIDATION_ERROR,
    SYNTAX_ERROR,
    isAggregateError,
    isGraphQLServerRequest,
} from '@dreamit/graphql-server-base'
import type { DocumentNode, GraphQLSchema } from 'graphql'
// eslint-disable-next-line @typescript-eslint/no-duplicate-imports
import { GraphQLError, Source, getOperationAST } from 'graphql'
import { determineGraphQLOrFetchError } from '../error/DetermineGraphQLOrFetchError'
import { determineValidationOrIntrospectionDisabledError } from '../error/DetermineValidationOrIntrospectionDisabledError'
import { removeValidationRecommendationsFromErrors } from '../error/RemoveValidationRecommendationsFromErrors'
import { increaseFetchOrGraphQLErrorMetric } from '../metrics/IncreaseFetchOrGraphQLErrorMetric'
import { SimpleMetricsClient } from '../metrics/SimpleMetricsClient'
import { requestCouldNotBeProcessed } from '../request/RequestConstants'
import { extractResponseFormatFromAcceptHeader } from '../response/ExtractResponseFormatFromAcceptHeader'
import { getFirstErrorFromExecutionResult } from '../response/GraphQLExecutionResult'
import { getRequestInformation } from '../server/GetRequestInformation'
import { defaultGraphQLServerOptions } from './DefaultGraphQLServerOptions'
import type { GraphQLServerOptions } from './GraphQLServerOptions'

export class GraphQLServer {
    options: GraphQLServerOptions = defaultGraphQLServerOptions
    schemaValidationErrors: readonly GraphQLError[] = []

    constructor(optionsParameter?: Partial<GraphQLServerOptions>) {
        this.setOptions(optionsParameter)
    }

    setOptions(newOptions?: Partial<GraphQLServerOptions>): void {
        this.options = { ...defaultGraphQLServerOptions, ...newOptions }
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
        const { contextFunction, logger } = this.options
        const context = contextFunction({ serverOptions: this.options })

        logger.info('Trying to set graphql schema', context)
        logger.debug(`Schema is ${JSON.stringify(schema)}`, context)
        if (this.options.shouldUpdateSchemaFunction(schema)) {
            this.options.schema = schema
            // Validate schema
            if (this.options.schema) {
                this.schemaValidationErrors =
                    this.options.schemaValidationFunction(this.options.schema)
                if (this.schemaValidationErrors.length > 0) {
                    logger.warn(
                        'Schema validation failed with errors. Please check the GraphQL schema and fix potential issues.',
                        context,
                    )
                    for (const error of this.schemaValidationErrors) {
                        logger.error(
                            'A schema validation error occurred: ',
                            context,
                            error,
                            SCHEMA_VALIDATION_ERROR,
                        )
                        this.options.collectErrorMetricsFunction({
                            context,
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
                context,
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
            returnNotAcceptableForUnsupportedResponseFormat,
        } = this.options

        const context = contextFunction({
            request: isGraphQLServerRequest(request) ? request : undefined,
            response,
            serverOptions: this.options,
        })
        metricsClient.increaseRequestThroughput(context)

        let responseFormat: ResponseFormat = 'JSON'
        // Check request accept header to identify what response format to use
        if (isGraphQLServerRequest(request)) {
            const acceptHeader = request.headers['accept']
            // Second condition is negated as JSON should not be returned if returnNotAcceptableForUnsupportedResponseFormat is true
            responseFormat = extractResponseFormatFromAcceptHeader(
                acceptHeader,
                !returnNotAcceptableForUnsupportedResponseFormat,
            )
            if (
                returnNotAcceptableForUnsupportedResponseFormat &&
                responseFormat === 'UNSUPPORTED'
            ) {
                const errorMessage = `Request has unsupported response format in Accept header: ${acceptHeader}. Supported formats are: 'application/graphql-response+json', 'application/json'.`
                const error = new GraphQLError(errorMessage, {})
                logger.error(
                    errorMessage,
                    context,
                    error,
                    'NOT_ACCEPTABLE_ERROR',
                )
                const result: GraphQLExecutionResult = {
                    customHeaders: {
                        accept: 'application/graphql-response+json, application/json',
                    },
                    executionResult: {
                        errors: [error],
                    },
                    statusCode: 406,
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
                        responseFormat,
                        responseStandardSchema,
                        statusCode: result.statusCode,
                    })
                }
                return result
            }
        }

        const requestInformation = isGraphQLServerRequest(request)
            ? await getRequestInformation(request, context, this.options)
            : request
        if ('query' in requestInformation) {
            context.query = requestInformation.query
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
                    responseFormat,
                    responseStandardSchema,
                    statusCode: result.statusCode,
                })
            }
            return result
        }

        let result = await this.executeRequestWithInfo(
            requestInformation as GraphQLRequestInfo,
            context,
            responseFormat,
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
                responseFormat,
                responseStandardSchema,
                statusCode: result.statusCode,
            })
        }
        return result
    }

    async executeRequestWithInfo(
        requestInformation: GraphQLRequestInfo,
        context: Record<string, unknown>,
        responseFormat: ResponseFormat,
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
                context,
                error,
                INVALID_SCHEMA_ERROR,
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
                context,
                requestInformation.error.graphQLError,
                GRAPHQL_ERROR,
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
                context,
                error,
                MISSING_QUERY_PARAMETER_ERROR,
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
                context,
                syntaxError as GraphQLError,
                SYNTAX_ERROR,
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
                statusCode: responseFormat === 'GRAPHQL-RESPONSE' ? 400 : 200,
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
                    context,
                    validationError,
                    errorName,
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
                statusCode: responseFormat === 'GRAPHQL-RESPONSE' ? 400 : 200,
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
                context,
                error,
                METHOD_NOT_ALLOWED_ERROR,
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
                        context,
                        error,
                        graphqlOrFetchError,
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
                context,
                error as GraphQLError,
                determineGraphQLOrFetchError(error),
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
