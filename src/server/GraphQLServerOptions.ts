import {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    Logger,
    MetricsClient,
    ResponseParameters,
    StandardSchemaV1,
} from '@dreamit/graphql-server-base'
import {
    DocumentNode,
    ExecutionArgs,
    ExecutionResult,
    GraphQLError,
    GraphQLFieldResolver,
    GraphQLFormattedError,
    GraphQLSchema,
    GraphQLTypeResolver,
    ParseOptions,
    Source,
    TypeInfo,
    ValidationRule,
} from 'graphql'
import { StandaloneResponseParameters } from '../response/StandaloneResponseParameters'

/**
 * Interface for creating new GraphQLServer instances.
 */
export interface GraphQLServerOptions {
    // required fields
    logger: Logger
    extractInformationFromRequest: (
        request: GraphQLServerRequest,
    ) => Promise<GraphQLRequestInfo>
    sendResponse: (responseParameters: ResponseParameters) => void
    metricsClient: MetricsClient
    shouldUpdateSchemaFunction: (schema?: GraphQLSchema) => boolean
    formatErrorFunction: (error: GraphQLError) => GraphQLFormattedError
    collectErrorMetricsFunction: (errorParameters: {
        errorName: string
        error: unknown
        serverOptions: GraphQLServerOptions
        context: Record<string, unknown>
    }) => void
    schemaValidationFunction: (schema: GraphQLSchema) => readonly GraphQLError[]
    parseFunction: (
        source: string | Source,
        options?: ParseOptions,
    ) => DocumentNode
    defaultValidationRules: readonly ValidationRule[]
    customValidationRules: readonly ValidationRule[]
    removeValidationRecommendations: boolean
    reassignAggregateError: boolean
    validateFunction: (
        schema: GraphQLSchema,
        documentAST: DocumentNode,
        rules?: readonly ValidationRule[],
        options?: { maxErrors?: number },
        typeInfo?: TypeInfo,
    ) => readonly GraphQLError[]
    contextFunction: (contextParameters: {
        serverOptions: GraphQLServerOptions
        request?: GraphQLServerRequest
        response?: GraphQLServerResponse
    }) => Record<string, unknown>
    executeFunction: (
        arguments_: ExecutionArgs,
    ) => Promise<ExecutionResult> | ExecutionResult
    extensionFunction: (extensionParameters: {
        requestInformation: GraphQLRequestInfo
        executionResult: ExecutionResult
        serverOptions: GraphQLServerOptions
        context: Record<string, unknown>
    }) => Record<string, unknown> | undefined
    methodNotAllowedResponse: (method?: string) => GraphQLExecutionResult
    invalidSchemaResponse: GraphQLExecutionResult
    missingQueryParameterResponse: (method?: string) => GraphQLExecutionResult
    onlyQueryInGetRequestsResponse: (
        operation?: string,
    ) => GraphQLExecutionResult
    validationErrorMessage: string
    executionResultErrorMessage: string
    graphqlExecutionErrorMessage: string
    responseEndChunkFunction: (
        executionResult: ExecutionResult | undefined,
    ) => unknown
    responseStandardSchema: StandardSchemaV1
    // optional fields
    adjustGraphQLExecutionResult?: (
        parameters: StandaloneResponseParameters,
    ) => GraphQLExecutionResult
    fieldResolver?: null | undefined | GraphQLFieldResolver<unknown, unknown>
    fetchErrorMessage?: string
    rootValue?: unknown
    schema?: GraphQLSchema
    typeResolver?: null | undefined | GraphQLTypeResolver<unknown, unknown>
    validationOptions?: { maxErrors?: number }
    validationTypeInfo?: TypeInfo
}
