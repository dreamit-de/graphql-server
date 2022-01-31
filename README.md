# graphql-server

A GraphQL server implementation written in NodeJS/Typescript. It uses the standard graphql library to receive 
GraphQL requests and send back appropriate responses.

## Installation

```sh
npm install --save @dreamit/graphql-server
```

TypeScript declarations are provided within the project.

## Features

- Creates GraphQL responses for (GraphQL) requests
- Can be use with fitting webservers that provide a matching `Request` and `Response` object
  (e.g. ExpressJS).
- Uses out-of-the-box default options to ease use and keep code short
- Provides hot reloading for schema and options
- Provides out-of-the-box metrics for GraphQLServer
- Uses and is compatible to `graphql-js` library version 14 and 15.

## Usage

You can create a new instance of `GraphQLServer` with the options necessary for your tasks. The `handleRequest` function of 
the `GraphQLServer` can be integrated with many fitting webservers.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema})
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

`GraphQLServer` provides default values and behaviour out of the box. It is recommended to at least provide a `schema` 
so the request won't be rejected because of a missing/invalid schema. When using it with a local schema it is 
recommended to provide a `rootValue` to return a fitting value. Examples for these requests can be found in the 
integration test in the `GraphQLServer.integration.test.ts` class in the `tests` folder. 

## Schema Validation and Disable introspection

Validation rules can be used to define how the `GraphQLServer` should behave when validating the request against the given
schema. 
To ease the use `GraphQLServer` uses the `specifiedRules` from `graphql-js` library. If you don't want to use the default
validation rules you can overwrite them by setting `defaultValidationRules` option to `[]`.

**Warning!**
Setting both `defaultValidationRules` and `customValidationRules` options to `[]` will disable validation. This might 
result in unexpected responses that are hard to use for requestors like API users or frontends.

```typescript
import {NoSchemaIntrospectionCustomRule} from 'graphql'

const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema, defaultValidationRules: []})
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

If you want to define custom validation rules you can use the `customValidationRules` option (e.g. to 
handle introspection like shown in the example below).

Introspection can be used to get information about the available schema. While this may be useful in development 
environments and public APIs you should consider disabling it for production if e.g. your API is only used with a 
specific matching frontend.

Introspection can be disabled by adding the `NoSchemaIntrospectionCustomRule` from the `graphql-js` library to the
`customValidationRules` option.

```typescript
import {NoSchemaIntrospectionCustomRule} from 'graphql'

const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema, customValidationRules: [NoSchemaIntrospectionCustomRule]})
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## Schema hot reload

Hot reload of the GraphQL schema can be used to update the existing schema to a new version without restarting the 
GraphQL server, webserver or whole application. When setting a new schema it will be used for the next incoming request
while the old schema will be used for requests that are being processed at the moment. Hot reloading is especially 
useful for remote schemas that are processed in another application like a webservice.

The schema can be changed simply by calling `setSchema` in the `GraphQLServer` instance. In the example below a second 
route is used to trigger a schema update.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema})
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.all('/updateme', (req, res) => {
  const updatedSchema = someMagicHappened()
  customGraphQLServer.setSchema(updatedSchema)
  return res.status(200).send()
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## Metrics

The implementation uses `prom-client` library to provide default NodeJS metrics as well as three custom metrics for the
GraphQL server:
- **graphql_server_availability**: Availability gauge with status 0 (unavailable) and 1 (available)
- **graphql_server_request_throughput**: The number of incoming requests
- **graphql_server_errors**: The number of errors that are encountered while running the GraphQLServer. The counter uses
the *errorName* field as label so errors could be differentiated. Default label for schema validation errors is 
"SchemaValidationError", "GraphQLError" for graphql errors and the error name if another type of error occurs.

A simple metrics endpoint can be created by using `getMetricsContentType` and `getMetrics` functions from 
the `GraphQLServer` instance. In the example below a second route is used to return metrics data.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema})
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.get('/metrics', async (req, res) => {
  return res.contentType(customGraphQLServer.getMetricsContentType()).send(await customGraphQLServer.getMetrics());
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## CORS requests

The `GraphQLServer` does not handle CORS requests on its own. It is recommended to handle this on the webserver level,
e.g. by using `cors` library with an ExpressJS webserver like in the example below. 

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
graphQLServerExpress.use(cors())
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema})
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## Available Options

The `GraphQLServer` accepts the following options. Note that all options are optional and can be overwritten by 
calling the `setOptions` function of the `GraphQLServer` instance.

### Application behaviour

- **`debug`**: If `true` additional log output will be created.

### GraphQL related options

- **`schema`**: The schema that is used to handle the request and send a response. If undefined the `GraphQLServer` will
reject responses with a GraphQL error response with status code 500.
- **`formatErrorFunction`**: Function that can be used to format occurring GraphQL errors. Given a `GraphQLError` it
should return a `GraphQLFormattedError`. By default `formatError` from `graphql-js` library is called.
- **`schemaValidationFunction`**: Function that is called when a schema is set or updated. Given a `GraphQLSchema` it
  can return a `ReadonlyArray<GraphQLError>` or an empty array if no errors occurred/should be returned. 
By default `validateSchema` from `graphql-js` library is called.
- **`parseFunction`**: Function that is called to create a `DocumentNode` with the extracted query in the 
request information. Given a `source` and `ParseOptions` it should return a `DocumentNode`.
    By default `parse` from `graphql-js` library is called.
- **`validationRules`**: Validation rules that are used when `validateSchemaFunction` is called. Can be used e.g. to 
check whether the request contains an introspection query that should be rejected.
- **`validationTypeInfo`**: Validation type info that is used when `validateSchemaFunction` is called.
- **`validationOptions`**: Validation options containing `{ maxErrors?: number }` that is used 
when `validateSchemaFunction` is called.
- **`removeValidationRecommendations`**: If `true` removes validation recommendations like "users not found. 
Did you mean user?". For non-production environments it is usually safe to allow recommendations. 
For production environments when not providing access to third-party users it is considered good practice to remove 
these recommendations so users can not circumvent disabled introspection request by using recommendations to explore 
the schema.
- **`validateFunction`**: Validation function that validates the extracted request against the available schema. 
By default `validate` from `graphql-js` library is called. 


### Technical components
- **`logger`**: Logger to be used in the GraphQL server. `TextLogger` and `JsonLogger` are available in the module.
  Own Logger can be used by implementing `Logger` interface.
- **`requestInformationExtractor`**: The `RequestInformationExtractor` used to extract information from the `Request`
  and return a `Promise<GraphQLRequestInfo>`. By default, the `DefaultRequestInformationExtractor` is used that tries to
  extract the information from the body and URL params of the request. Own Extractor can be used by
  implementing `RequestInformationExtractor` interface.
- **`metricsClient`**: The `MetricsClient` used to collect metrics from the GraphQLServer. By default, 
the `DefaultMetricsClient` is used that collects default NodeJS and three custom metrics using `prom-client` library.
Own MetricsClient can be used by implementing `MetricsClient` interface.

## To be added as Options descriptions

readonly shouldUpdateSchemaFunction?: (schema?: GraphQLSchema) => boolean

readonly collectErrorMetricsFunction?: (error: GraphQLError, request?: Request) => void

readonly rootValue?: unknown | undefined

readonly contextValue?: unknown

readonly fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>

readonly typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>

readonly executeFunction?: (schema: GraphQLSchema,
document: DocumentNode,
rootValue?: unknown,
contextValue?: unknown,
variableValues?: Maybe<{ [key: string]: unknown }>,
operationName?: Maybe<string>,
fieldResolver?: Maybe<GraphQLFieldResolver<unknown, unknown>>,
typeResolver?: Maybe<GraphQLTypeResolver<unknown, unknown>>) => PromiseOrValue<ExecutionResult>


readonly extensionFunction?: (request: Request, requestInformation: GraphQLRequestInfo, executionResult: ExecutionResult) => MaybePromise<undefined | { [key: string]: unknown }>
