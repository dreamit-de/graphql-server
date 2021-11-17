import {GraphQLSchema} from 'graphql'
import express, {Express} from 'express'
import {Server} from 'http'
import {GraphQLServer} from '../src/'
import fetch from 'cross-fetch'
import {JsonLogger} from '../src/logger/JsonLogger';

const initialSchema = new GraphQLSchema({description:'initial'})
const graphQLServerPort = 3000
let graphQLServer: Server


beforeAll(async () => {
    graphQLServer = setupGraphQLServer().listen({port: graphQLServerPort})
    console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
})

afterAll(async () => {
    await graphQLServer.close()
})

test('Should get simple default response from GraphQL server', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: 'doesnotmatter'})
    const responseObject = await response.json()
    expect(responseObject.data.response).toBe('hello world')
})


function setupGraphQLServer(): Express {
    const graphQLServerExpress = express()
    const logger = new JsonLogger('test-logger', 'myTestService')
    const customGraphQLServer = new GraphQLServer({schema: initialSchema, logger: logger, debug: true})
    graphQLServerExpress.post('/graphql', (req, res) => {
        return customGraphQLServer.handleRequest(req, res)
    })
    return graphQLServerExpress
}
