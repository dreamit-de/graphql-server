import {GraphQLSchema} from 'graphql'
import {GraphQLServer} from '../../src'
import {
    initialSchemaWithOnlyDescription
} from '../ExampleSchemas';

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription})
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should update schema when calling GraphQLServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription, debug: true})
    const updatedSchema = new GraphQLSchema({description:'updated'})
    graphqlServer.setSchema(updatedSchema)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('updated')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should not update schema when given schema is undefined', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription, debug: true})
    graphqlServer.setSchema(undefined)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

function expectRootQueryNotDefined(graphqlServer: GraphQLServer): void {
    const schemaValidationErrors = graphqlServer.getSchemaValidationErrors()
    expect(schemaValidationErrors?.length).toBe(1)
    expect(schemaValidationErrors?.[0].message).toBe('Query root type must be provided.')
}