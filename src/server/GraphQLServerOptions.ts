import {Logger} from '../logger/Logger';
import {
    DocumentNode,
    ExecutionResult,
    GraphQLError,
    GraphQLSchema,
    ParseOptions,
    Source
} from 'graphql';
import {RequestInformationExtractor} from './RequestInformationExtractor';
import {ValidationRule} from 'graphql/validation/ValidationContext';
import {TypeInfo} from 'graphql/utilities/TypeInfo';
import {Maybe} from 'graphql/jsutils/Maybe';
import {GraphQLFieldResolver,
    GraphQLTypeResolver} from 'graphql/type/definition';
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue';

export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly debug?: boolean
    readonly requestInformationExtractor?: RequestInformationExtractor
    readonly schema?: GraphQLSchema | undefined
    readonly schemaValidationFunction?: (schema: GraphQLSchema) => ReadonlyArray<GraphQLError>
    readonly  parseFunction?: (source: string | Source, options?: ParseOptions) => DocumentNode
    readonly validationRules?: ReadonlyArray<ValidationRule>
    readonly validationTypeInfo?: TypeInfo
    readonly validationOptions?: { maxErrors?: number }
    readonly removeValidationRecommendations?: boolean
    readonly validateFunction?: (schema: GraphQLSchema,
                        documentAST: DocumentNode,
                        rules?: ReadonlyArray<ValidationRule>,
                        typeInfo?: TypeInfo,
                        options?: { maxErrors?: number },) => ReadonlyArray<GraphQLError>
    readonly rootValue?: unknown | undefined
    readonly contextValue?: unknown
    readonly fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    readonly typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    readonly executeFunction?: (schema: GraphQLSchema,
                       document: DocumentNode,
                       rootValue?: unknown,
                       contextValue?: unknown,
                       variableValues?: Maybe<{ [key: string]: unknown }>,
                       operationName?: Maybe<string>,
                       fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>,
                       typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>) => PromiseOrValue<ExecutionResult>
}
