import {Logger} from '../logger/Logger';
import {GraphQLError,
    GraphQLSchema} from 'graphql';

export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly debug?: boolean
    schema?: GraphQLSchema | undefined
    schemaValidationFunction?: (schema: GraphQLSchema) => ReadonlyArray<GraphQLError>
}
