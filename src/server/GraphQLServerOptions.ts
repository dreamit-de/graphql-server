import {Logger} from '../logger/Logger';
import {GraphQLSchema} from 'graphql';

export interface GraphQLServerOptions {
    readonly logger?: Logger
    readonly debug?: boolean
    schema?: GraphQLSchema | undefined
}
