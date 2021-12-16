import express, {Express} from 'express'
import {Server} from 'http'
import {GraphQLServer} from '../src/'
import fetch from 'cross-fetch'
import {JsonLogger} from '../src/logger/JsonLogger'
import {userRequest,
    userQuery,
    userSchema} from './ExampleSchemas'
import {GraphQLError} from 'graphql'
import {generateGetParamsFromGraphQLRequestInfo} from './TestHelpers'

const graphQLServerPort = 3000
const logger = new JsonLogger('test-logger', 'myTestService')
let customGraphQLServer: GraphQLServer
let graphQLServer: Server


beforeAll(async () => {
    graphQLServer = setupGraphQLServer().listen({port: graphQLServerPort})
    console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
})

afterAll(async () => {
    await graphQLServer.close()
})

test('Should get default response from GraphQL server', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: `{"query":"${userQuery}"}`, headers: {
        'Content-Type': 'application/json'
    }})
    const responseObject = await response.json()
    expect(responseObject.data.response).toBe('hello world')
})

test('Should get error response from GraphQL server if query does not match expected query format', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"unknown"}', headers: {
        'Content-Type': 'application/json'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Syntax Error: Unexpected Name "unknown".')
})

test('Should get error response from GraphQL server if body does not contain query information', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"aField":"aValue"}', headers: {
        'Content-Type': 'application/json'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Request cannot be processed. No query was found in parameters or body.')
})

test('Should get error response from GraphQL server if body contains invalid json', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":{"unknown"}', headers: {
        'Content-Type': 'application/json'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('POST body contains invalid JSON.')
})

test('Should get error response from GraphQL server if content type cannot be processed', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"unknown"}', headers: {
        'Content-Type': 'application/specialapp'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe( 'POST body contains invalid content type: application/specialapp.')
})

test('Should get error response from GraphQL server if a validation error occurrs ', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"query users{ users { userIdABC userName } }"}', headers: {
        'Content-Type': 'application/json'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe( 'Cannot query field "userIdABC" on type "User". Did you mean "userId" or "userName"?')
})

test('Should get error response from GraphQL server if charset could not be processed', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"unknown"}', headers: {
        'Content-Type': 'application/json; charset=utf-4711'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Unsupported charset "UTF-4711".')
})

test('Should get error response from GraphQL server if request contains gzip encoding but body does not match', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"unknown"}', headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Invalid request body: Error: incorrect header check.')
})

test('Should get error response from GraphQL server if request contains deflate encoding but body does not match', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"unknown"}', headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'deflate'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Invalid request body: Error: incorrect header check.')
})

test('Should get error response from GraphQL server if request contains unknown encoding', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"unknown"}', headers: {
        'Content-Type': 'application/json',
        'Content-Encoding': 'rar'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Unsupported content-encoding "rar".')
})

test('Should get error response from GraphQL server if content type is not set', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"query":"unknown"}', headers: {
        'Content-Type': ''
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Content type could not be parsed.')
})

test('Should get simple default response from GraphQL server when using GET request', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql?${generateGetParamsFromGraphQLRequestInfo(userRequest)}`)
    const responseObject = await response.json()
    expect(responseObject.data.response).toBe('hello world')
})

test('Should get an error response from GraphQL server when content type is not defined', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql?aField=aValue` )
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Invalid request. Request header content-type is undefined.')
})

test('Should get simple default response from GraphQL server when using urlencoded request', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: generateGetParamsFromGraphQLRequestInfo(userRequest), headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }})
    const responseObject = await response.json()
    expect(responseObject.data.response).toBe('hello world')
})

test('Should get error response from GraphQL server when using urlencoded request with no query provided', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: '{"unknown":"unknown"}', headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    }})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Request cannot be processed. No query was found in parameters or body.')
})

test('Should get simple default response from GraphQL server for application graphql request', async () => {
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: userQuery, headers: {
        'Content-Type': 'application/graphql'
    }})
    const responseObject = await response.json()
    expect(responseObject.data.response).toBe('hello world')
})

test('Should get error response from GraphQL server if invalid schema is used', async () => {
    //Change options to use schema validation function that always returns a validation error
    customGraphQLServer.setOptions({schema: userSchema, logger: logger, debug: true, schemaValidationFunction: () => [new GraphQLError('Schema is not valid!')] })
    const response = await fetch(`http://localhost:${graphQLServerPort}/graphql`, {method: 'POST', body: 'doesnotmatter'})
    const responseObject = await response.json()
    expect(responseObject.errors[0].message).toBe('Request cannot be processed. Schema in GraphQL server is invalid.')
    customGraphQLServer.setOptions({schema: userSchema, logger: logger, debug: true})
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
    customGraphQLServer = new GraphQLServer({schema: userSchema, logger: logger, debug: true})
    graphQLServerExpress.all('/graphql', (req, res) => {
        return customGraphQLServer.handleRequest(req, res)
    })
    return graphQLServerExpress
}

