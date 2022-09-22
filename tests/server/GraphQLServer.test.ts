import {
    GraphQLError,
    GraphQLSchema
} from 'graphql'
import {
    DefaultResponseHandler,
    GraphQLServer
} from '../../src'
import {
    initialSchemaWithOnlyDescription
} from '../ExampleSchemas'

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer({
        schema: initialSchemaWithOnlyDescription,
        responseHandler: new DefaultResponseHandler(new GraphQLError('doesnotmatter', {}),
            new GraphQLError('doesnotmatter', {}),
            new GraphQLError('doesnotmatter', {}),
            new GraphQLError('doesnotmatter', {}))
    })
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should update schema when calling GraphQLServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription})
    const updatedSchema = new GraphQLSchema({description:'updated'})
    graphqlServer.setSchema(updatedSchema)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('updated')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should not update schema when given schema is undefined', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchemaWithOnlyDescription})
    graphqlServer.setSchema()
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
    expectRootQueryNotDefined(graphqlServer)
})

test('Should update schema when given schema is undefined ' +
    'and shouldUpdateSchemaFunction is true', () => {
    const graphqlServer = new GraphQLServer({
        schema: initialSchemaWithOnlyDescription
        , shouldUpdateSchemaFunction: (): boolean => true
    })
    graphqlServer.setSchema()
    const schema = graphqlServer.getSchema()
    expect(schema).toBeUndefined()
})

function expectRootQueryNotDefined(graphqlServer: GraphQLServer): void {
    const schemaValidationErrors = graphqlServer.getSchemaValidationErrors()
    expect(schemaValidationErrors?.length).toBe(1)
    expect(schemaValidationErrors?.[0].message).toBe('Query root type must be provided.')
}
