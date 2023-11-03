import {
    DocumentNode,
    ExecutionArgs,
    ExecutionResult,
    GraphQLError,
    GraphQLFormattedError,
    GraphQLSchema,
    ParseOptions,
    Source
} from 'graphql'
import {
    GraphQLExecutionResult,
    GraphQLRequestInfo,
    GraphQLServerRequest,
    GraphQLServerResponse,
    Logger,
    MetricsClient,
    ResponseParameters
} from '@dreamit/graphql-server-base'
import {
    GraphQLFieldResolver,
    GraphQLTypeResolver
} from 'graphql/type/definition'
import {Maybe} from 'graphql/jsutils/Maybe'
import {ObjMap} from 'graphql/jsutils/ObjMap'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'
import {TypeInfo} from 'graphql/utilities/TypeInfo'
import {ValidationRule} from 'graphql/validation/ValidationContext'

/**
 * Interface for creating new GraphQLServer instances.
 * Fields are all optional, but it is recommended to set the fields necessary to execute the
 * expected functionality, e.g. schema and rootValue for basic GraphQL request execution.
 */
export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly extractInformationFromRequest?: (request: GraphQLServerRequest) => GraphQLRequestInfo
    readonly sendResponse?: (responseParameters: ResponseParameters) => void
    readonly metricsClient?: MetricsClient
    readonly schema?: GraphQLSchema
    readonly shouldUpdateSchemaFunction?: (schema?: GraphQLSchema) => boolean
    readonly formatErrorFunction?: (error: GraphQLError) => GraphQLFormattedError
    readonly collectErrorMetricsFunction?: (errorParameters: {errorName: string,
                                            error: unknown,
                                            serverOptions: GraphQLServerOptions,
                                            context?: unknown}) => void
    readonly schemaValidationFunction?: (schema: GraphQLSchema) => ReadonlyArray<GraphQLError>
    readonly parseFunction?: (source: string | Source, options?: ParseOptions) => DocumentNode
    readonly defaultValidationRules?:  ReadonlyArray<ValidationRule>
    readonly customValidationRules?: ReadonlyArray<ValidationRule>
    readonly validationTypeInfo?: TypeInfo
    readonly validationOptions?: { maxErrors?: number }
    readonly removeValidationRecommendations?: boolean
    readonly reassignAggregateError?: boolean
    readonly validateFunction?: (schema: GraphQLSchema,
                        documentAST: DocumentNode,
                        rules?: ReadonlyArray<ValidationRule>,
                        options?: { maxErrors?: number },
                        typeInfo?: TypeInfo,
                        ) => ReadonlyArray<GraphQLError>
    readonly rootValue?: unknown
    readonly contextFunction?: (contextParameters: {
        serverOptions: GraphQLServerOptions,
        request?: GraphQLServerRequest,
        response?: GraphQLServerResponse,
    }) => unknown
    readonly fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    readonly typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    readonly executeFunction?: (arguments_: ExecutionArgs)
        => PromiseOrValue<ExecutionResult>
    readonly extensionFunction?: (
        extensionParameters: {
            requestInformation: GraphQLRequestInfo,
            executionResult: ExecutionResult,
            serverOptions: GraphQLServerOptions,
            context?: unknown
        }) => ObjMap<unknown> | undefined
    readonly methodNotAllowedResponse?: (method?: string) => GraphQLExecutionResult
    readonly invalidSchemaResponse?: GraphQLExecutionResult
    readonly missingQueryParameterResponse?: (method?: string) => GraphQLExecutionResult
    readonly onlyQueryInGetRequestsResponse?: (operation?: string) => GraphQLExecutionResult
    readonly validationErrorMessage?: string
    readonly executionResultErrorMessage?: string
    readonly graphqlExecutionErrorMessage?: string
    readonly responseEndChunkFunction?: (executionResult: ExecutionResult | undefined) => unknown
}
