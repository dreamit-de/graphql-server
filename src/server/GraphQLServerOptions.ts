import {Logger} from '../logger/Logger';
import {GraphQLError,
    GraphQLSchema} from 'graphql';
import {GraphQLRequestInformationExtractor} from './GraphQLRequestInformationExtractor';

export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly debug?: boolean
    requestInformationExtractor?: GraphQLRequestInformationExtractor
    schema?: GraphQLSchema | undefined
    schemaValidationFunction?: (schema: GraphQLSchema) => ReadonlyArray<GraphQLError>
}
