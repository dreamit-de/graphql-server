import {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    Logger,
    MetricsClient,
    ResponseParameters,
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
import { StandardSchemaV1 } from '../validation/StandardSchemaV1'

/**
 * Interface for creating new GraphQLServer instances.
 * Fields are all optional, but it is recommended to set the fields necessary to execute the
 * expected functionality, e.g. schema and rootValue for basic GraphQL request execution.
 */
export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly extractInformationFromRequest?: (
        request: GraphQLServerRequest,
    ) => GraphQLRequestInfo
    readonly sendResponse?: (responseParameters: ResponseParameters) => void
    readonly metricsClient?: MetricsClient
    readonly schema?: GraphQLSchema
    readonly shouldUpdateSchemaFunction?: (schema?: GraphQLSchema) => boolean
    readonly formatErrorFunction?: (
        error: GraphQLError,
    ) => GraphQLFormattedError
    readonly collectErrorMetricsFunction?: (errorParameters: {
        errorName: string
        error: unknown
        serverOptions: GraphQLServerOptions
        context?: unknown
    }) => void
    readonly schemaValidationFunction?: (
        schema: GraphQLSchema,
    ) => readonly GraphQLError[]
    readonly parseFunction?: (
        source: string | Source,
        options?: ParseOptions,
    ) => DocumentNode
    readonly defaultValidationRules?: readonly ValidationRule[]
    readonly customValidationRules?: readonly ValidationRule[]
    readonly validationTypeInfo?: TypeInfo
    readonly validationOptions?: { maxErrors?: number }
    readonly removeValidationRecommendations?: boolean
    readonly reassignAggregateError?: boolean
    readonly validateFunction?: (
        schema: GraphQLSchema,
        documentAST: DocumentNode,
        rules?: readonly ValidationRule[],
        options?: { maxErrors?: number },
        typeInfo?: TypeInfo,
    ) => readonly GraphQLError[]
    readonly rootValue?: unknown
    readonly contextFunction?: (contextParameters: {
        serverOptions: GraphQLServerOptions
        request?: GraphQLServerRequest
        response?: GraphQLServerResponse
    }) => unknown
    readonly fieldResolver?:
        | null
        | undefined
        | GraphQLFieldResolver<unknown, unknown>
    readonly typeResolver?:
        | null
        | undefined
        | GraphQLTypeResolver<unknown, unknown>
    readonly executeFunction?: (
        arguments_: ExecutionArgs,
    ) => Promise<ExecutionResult> | ExecutionResult
    readonly extensionFunction?: (extensionParameters: {
        requestInformation: GraphQLRequestInfo
        executionResult: ExecutionResult
        serverOptions: GraphQLServerOptions
        context?: unknown
    }) => Record<string, unknown> | undefined
    readonly methodNotAllowedResponse?: (
        method?: string,
    ) => GraphQLExecutionResult
    readonly invalidSchemaResponse?: GraphQLExecutionResult
    readonly missingQueryParameterResponse?: (
        method?: string,
    ) => GraphQLExecutionResult
    readonly onlyQueryInGetRequestsResponse?: (
        operation?: string,
    ) => GraphQLExecutionResult
    readonly validationErrorMessage?: string
    readonly executionResultErrorMessage?: string
    readonly graphqlExecutionErrorMessage?: string
    readonly responseEndChunkFunction?: (
        executionResult: ExecutionResult | undefined,
    ) => unknown
    readonly fetchErrorMessage?: string
    readonly adjustGraphQLExecutionResult?: (
        parameters: StandaloneResponseParameters,
    ) => GraphQLExecutionResult
    readonly responseStandardSchema?: StandardSchemaV1
}
