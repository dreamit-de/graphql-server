import {GraphQLSchema} from 'graphql';

export class GraphQLServer {

    private schema: GraphQLSchema

    constructor(schema: GraphQLSchema) {
        this.schema = schema
    }

    getSchema(): GraphQLSchema {
        return this.schema
    }

    updateSchema(schema: GraphQLSchema): void {
        this.schema = schema
    }
}
