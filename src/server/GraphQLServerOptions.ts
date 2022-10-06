import {
    Logger,
    RequestInformationExtractor,
    GraphQLRequestInfo,
    MetricsClient,
    GraphQLServerRequest,
    GraphQLServerResponse,
    ResponseHandler
} from '..'
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

import {ValidationRule} from 'graphql/validation/ValidationContext'
import {TypeInfo} from 'graphql/utilities/TypeInfo'
import {Maybe} from 'graphql/jsutils/Maybe'
import {
    GraphQLFieldResolver,
    GraphQLTypeResolver
} from 'graphql/type/definition'
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue'
import {ObjMap} from 'graphql/jsutils/ObjMap'


export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly requestInformationExtractor?: RequestInformationExtractor
    readonly responseHandler?: ResponseHandler
    readonly metricsClient?: MetricsClient
    readonly schema?: GraphQLSchema | undefined
    readonly shouldUpdateSchemaFunction?: (schema?: GraphQLSchema) => boolean
    readonly formatErrorFunction?: (error: GraphQLError) => GraphQLFormattedError
    readonly collectErrorMetricsFunction?: (errorName: string,
                                            error?: unknown,
                                            context?: unknown,
                                            logger?: Logger,
                                            metricsClient?: MetricsClient) => void
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
    readonly rootValue?: unknown | undefined
    readonly contextFunction?: (request: GraphQLServerRequest,
        response: GraphQLServerResponse, logger?: Logger) => unknown
    readonly fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    readonly typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    readonly executeFunction?: (arguments_: ExecutionArgs)
        => PromiseOrValue<ExecutionResult>
    readonly extensionFunction?: (requestInformation: GraphQLRequestInfo,
                                  executionResult: ExecutionResult,
                                  logger?: Logger,
                                  context?: unknown)
        => ObjMap<unknown> | undefined
}
