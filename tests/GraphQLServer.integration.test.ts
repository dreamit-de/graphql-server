import {GraphQLSchema} from 'graphql'
import express, {Express} from 'express'
import {Server} from 'http'
import {GraphQLServer} from '../src/'
import fetch from 'cross-fetch'
import {JsonLogger} from '../src/logger/JsonLogger';

const initialSchema = new GraphQLSchema({description:'initial'})
const graphQLServerPort = 3000
const logger = new JsonLogger('test-logger', 'myTestService')
let customGraphQLServer: GraphQLServer;
let graphQLServer: Server


beforeAll(async () => {
    graphQLServer = setupGraphQLServer().listen({port: graphQLServerPort})
    console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
})

afterAll(async () => {
    await graphQLServer.close()
})

test('Should get simple default response from GraphQL server if validation errors are ignored', async () => {
    //Change options to use schema validation function that always returns empty array, i.e. ignores validation errors
    customGraphQLServer.setOptions({schema: initialSchema, logger: logger, debug: true, schemaValidationFunction: () => [] })
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: 'doesnotmatter'})
    const responseObject = await response.json()
    expect(responseObject.data.response).toBe('hello world')
    customGraphQLServer.setOptions({schema: initialSchema, logger: logger, debug: true})
})

test('Should get error response from GraphQL server if invalid schema is used', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: 'doesnotmatter'})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Request cannot be processed. Schema in GraphQL server is invalid.')
})

test('Should get error response from GraphQL server if invalid method is used', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'PUT', body: 'doesnotmatter'})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('GraphQL server only supports GET and POST requests.')
    const allowResponseHeader = response.headers.get('Allow')
    expect(allowResponseHeader).toBe('GET, POST')
})

function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    customGraphQLServer = new GraphQLServer({schema: initialSchema, logger: logger, debug: true})
    graphQLServerExpress.all('/graphql', (req, res) => {
        return customGraphQLServer.handleRequest(req, res)
    })
    return graphQLServerExpress
}
