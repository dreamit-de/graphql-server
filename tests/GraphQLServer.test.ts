import {GraphQLSchema} from 'graphql';
import {GraphQLServer} from '../src/GraphQLServer';

const initialSchema = new GraphQLSchema({description:'initial'});

test('Should create schema on GraphlServer class creation', () => {
    const graphqlServer = new GraphQLServer(initialSchema)
    expect(graphqlServer.getSchema().description).toBe('initial')
});

test('Should update schema when calling GraphlServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer(initialSchema)
    const updatedSchema = new GraphQLSchema({description:'updated'})
    graphqlServer.updateSchema(updatedSchema)
    expect(graphqlServer.getSchema().description).toBe('updated')
});
