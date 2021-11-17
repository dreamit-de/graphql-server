import {GraphQLSchema} from 'graphql'
import {GraphQLServer} from '../../src'
import {TextLogger} from '../../src/logger/TextLogger';

const initialSchema = new GraphQLSchema({description:'initial'})
const logger = new TextLogger('test-logger', 'myTestService')

test('Should create schema on GraphQLServer class creation', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchema, logger: logger})
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
})

test('Should update schema when calling GraphQLServer updateGraphQLSchema function', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchema, logger: logger, debug: true})
    const updatedSchema = new GraphQLSchema({description:'updated'})
    graphqlServer.updateSchema(updatedSchema)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('updated')
})

test('Should not update schema when given schema is undefined', () => {
    const graphqlServer = new GraphQLServer({schema: initialSchema, logger: logger, debug: true})
    graphqlServer.updateSchema(undefined)
    const schema = graphqlServer.getSchema()
    expect(schema).toBeDefined()
    expect(schema?.description).toBe('initial')
})
