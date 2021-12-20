import {Logger} from '../logger/Logger';
import {
    DocumentNode,
    ExecutionResult,
    GraphQLError,
    GraphQLSchema,
    ParseOptions,
    Source
} from 'graphql';
import {GraphQLRequestInformationExtractor} from './GraphQLRequestInformationExtractor';
import {ValidationRule} from 'graphql/validation/ValidationContext';
import {TypeInfo} from 'graphql/utilities/TypeInfo';
import {Maybe} from 'graphql/jsutils/Maybe';
import {GraphQLFieldResolver,
    GraphQLTypeResolver} from 'graphql/type/definition';
import {PromiseOrValue} from 'graphql/jsutils/PromiseOrValue';

export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly debug?: boolean
    requestInformationExtractor?: GraphQLRequestInformationExtractor
    schema?: GraphQLSchema | undefined

    schemaValidationFunction?: (schema: GraphQLSchema) => ReadonlyArray<GraphQLError>
    parseFunction?: (source: string | Source, options?: ParseOptions) => DocumentNode
    validationRules?: ReadonlyArray<ValidationRule>
    validationTypeInfo?: TypeInfo
    validationOptions?: { maxErrors?: number }
    validateFunction?: (schema: GraphQLSchema,
                        documentAST: DocumentNode,
                        rules?: ReadonlyArray<ValidationRule>,
                        typeInfo?: TypeInfo,
                        options?: { maxErrors?: number },) => ReadonlyArray<GraphQLError>
    rootValue?: unknown | undefined
    contextValue?: unknown
    fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>
    typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>
    executeFunction?: (schema: GraphQLSchema,
                       document: DocumentNode,
                       rootValue?: unknown,
                       contextValue?: unknown,
                       variableValues?: Maybe<{ [key: string]: unknown }>,
                       operationName?: Maybe<string>,
                       fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>,
                       typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>) => PromiseOrValue<ExecutionResult>
}
