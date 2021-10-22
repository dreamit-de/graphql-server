import {GraphQLSchema} from 'graphql';
import {GraphQLServer} from '../../src';

const initialSchema = new GraphQLSchema({description:'initial'});

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer(initialSchema)
    expect(graphqlServer.getSchema().description).toBe('initial')
});

test('Should update schema when calling GraphQLServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer(initialSchema)
    const updatedSchema = new GraphQLSchema({description:'updated'})
    graphqlServer.updateSchema(updatedSchema)
    expect(graphqlServer.getSchema().description).toBe('updated')
});
