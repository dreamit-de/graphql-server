# graphql-server

A GraphQL server implementation written in NodeJS/Typescript. It uses the standard graphql library to receive 
GraphQL requests and send back appropriate responses.

## Installation

```sh
npm install --save @dreamit/graphql-server
```

TypeScript declarations are provided within the project.

## Compatibility

The following table shows which version of [graphql-js][1] library is compatible with which version of
`@dreamit/graphql-server`. As `@dreamit/graphql-server` defines [graphql-js][1] as peerDependency you might want
to choose a fitting version according to the [graphql-js][1] version used in your project and by other libraries depending
on [graphql-js][1].

| graphql-js version | graphql-server Version | Github branch  |
| ------------- |:-------------:| -----:|
| ^15.2.0 | 1.x | [legacy-graphql15](https://github.com/dreamit-de/graphql-server/tree/legacy-graphql15)|
| ^16.0.0 | 2.x | [main](https://github.com/dreamit-de/graphql-server)  |

## Features

- Creates GraphQL responses for (GraphQL) requests
- Can be use with fitting webservers that provide a matching `GraphQLServerRequest` and `GraphQLServerResponse` object
  (e.g. [Express][2]).
- Uses out-of-the-box default options to ease use and keep code short
- Provides hot reloading for schema and options
- Provides out-of-the-box metrics for GraphQLServer
- Uses and is compatible with [graphql-js][1] library version 15 (graphqlserver 1.x) and 16 (graphqlserver 2.x) .

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

## Schema validation and disabling Introspection

Validation rules can be used to define how the `GraphQLServer` should behave when validating the request against the given
schema. 
To ease the use `GraphQLServer` uses the `specifiedRules` from [graphql-js][1] library. If you don't want to use the default
validation rules you can overwrite them by setting `defaultValidationRules` option to `[]`.

**Warning!**
Setting both `defaultValidationRules` and `customValidationRules` options to `[]` will disable validation. This might 
result in unexpected responses that are hard to use for API users or frontends.

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

Introspection can be disabled by adding the `NoSchemaIntrospectionCustomRule` from the [graphql-js][1] library to the
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

The implementation uses [prom-client][3] library to provide default NodeJS metrics as well as three custom metrics for the
GraphQL server:
- **graphql_server_availability**: Availability gauge with status 0 (unavailable) and 1 (available)
- **graphql_server_request_throughput**: The number of incoming requests
- **graphql_server_errors**: The number of errors that are encountered while running the GraphQLServer. The counter uses
the *errorName* field as label so errors could be differentiated. At the moment the following labels are available
and initialised with 0:
  - FetchError
  - GraphQLError
  - SchemaValidationError
  - MethodNotAllowedError
  - InvalidSchemaError
  - MissingQueryParameterError
  - ValidationError
  - SyntaxError

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
e.g. by using `cors` library with an [Express][2] webserver like in the example below. 

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

## Webserver framework compatibility

The `GraphQLServer.handleRequest` function works with webservers that provide a fitting request and response object 
that match `GraphQLServerRequest` and `GraphQLServerResponse` interfaces. As [Express][2] version 2.x  matches both no
further adjustment is necessary. 

If one or both objects do not match `GraphQLServerRequest` and `GraphQLServerResponse` it might still be possible
to implement these interfaces and map the webserver framework to the graphql-server implementations. An example how to
support [fastify][4] can be found in the [fastify-example](https://github.com/sgohlke/fastify-example/blob/main/src/FastifyGraphQLServer.ts)

## Available options

The `GraphQLServer` accepts the following options. Note that all options are optional and can be overwritten by 
calling the `setOptions` function of the `GraphQLServer` instance.

### Application behaviour

- **`debug`**: If `true` additional log output will be created.

### GraphQL related options

- **`schema`**: The schema that is used to handle the request and send a response. If undefined the `GraphQLServer` will
reject responses with a GraphQL error response with status code 500. 
- **`shouldUpdateSchemaFunction`**: Function that can be used to determine whether a schema update should be executed. 
- **`formatErrorFunction`**: Function that can be used to format occurring GraphQL errors. Given a `GraphQLError` it
should return a `GraphQLFormattedError`. By default `defaultFormatErrorFunction` is called that uses `error.toJSON` to
format the error.
- **`schemaValidationFunction`**: Function that is called when a schema is set or updated. Given a `GraphQLSchema` it
  can return a `ReadonlyArray<GraphQLError>` or an empty array if no errors occurred/should be returned. 
By default `validateSchema` from [graphql-js][1] library is called.
- **`parseFunction`**: Function that is called to create a `DocumentNode` with the extracted query in the 
request information. Given a `source` and `ParseOptions` it should return a `DocumentNode`.
    By default `parse` from [graphql-js][1] library is called.
- **`defaultValidationRules`**: Default validation rules that are used when `validateSchemaFunction` is called. 
Both `defaultValidationRules` and `customValidationRules` will be merged together when `validateSchemaFunction` 
is called. By default `specifiedRules` from [graphql-js][1] are used. 
Can be overwritten if no or other default rules should be used.
- **`customValidationRules`**: Custom validation rules that are used when `validateSchemaFunction` is called.
Both `defaultValidationRules` and `customValidationRules` will be merged together when `validateSchemaFunction` 
is called. By default, an empty array is set. Can be overwritten to add additional rules 
like `NoSchemaIntrospectionCustomRule`.
- **`validationTypeInfo`**: Validation type info that is used when `validateSchemaFunction` is called.
- **`validationOptions`**: Validation options containing `{ maxErrors?: number }` that is used 
when `validateSchemaFunction` is called.
- **`removeValidationRecommendations`**: If `true` removes validation recommendations like "users not found. 
Did you mean user?". For non-production environments it is usually safe to allow recommendations. 
For production environments when not providing access to third-party users it is considered good practice to remove 
these recommendations so users can not circumvent disabled introspection request by using recommendations to explore 
the schema.
- **`validateFunction`**: Validation function that validates the extracted request against the available schema. 
By default `validate` from [graphql-js][1] library is called. 
- **`rootValue`**: Root value that is used when `executeFunction` is called. Can be used to define resolvers that
handle how defined queries and/or mutations should be resolved (e.g. fetch object from database and return entity).
- **`contextFunction`**: Given a `Request` and `Response` this function is used to create a context value
that is used when `executeFunction` is called. Default implementation is `defaultContextFunction`. Can be used to 
extract information from the request and/or response and return them as context. This is often used to extract headers
like 'Authorization' and set them in the execute function. `defaultContextFunction` just returns the whole initial
`Request` object.
- **`fieldResolver`**: Field resolver function that is used when `executeFunction` is called. Default is undefined,
if custom logic is necessary it can be added.
- **`typeResolver`**: Type resolver function that is used when `executeFunction` is called. Default is undefined,
  if custom logic is necessary it can be added.
- **`executeFunction`**: Execute function that executes the parsed `DocumentNode` (created in `parseFunction`) using
given schema, values and resolvers. Returns a Promise or value of an `ExecutionResult`. 
By default `execute` from [graphql-js][1] library is called.
- **`extensionFunction`**: Extension function that can be used to add additional information to 
the `extensions` field of the response. Given a `Request`, `GraphQLRequestInfo` and `ExecutionResult` it should return
undefined or an ObjMap of key-value-pairs that are added to the`extensions` field. By default `defaultCollectErrorMetrics` 
is used and returns undefined.
- **`reassignAggregateError`**: If `true` and the `ExecutionResult` created by the `executeFunction` contains an `AggregateError`
  (e.g. an error containing a comma-separated list of errors in the message and an `originalError` containing multiple errors)
this function will reassign the `originalError.errors` to the `ExecutionResult.errors` field. This is helpful if another
application creates `AggregateErrors` while the initiator of the request (e.g. a Frontend app) does not expect or know how
to handle `AggregateErrors`.

### Metrics options
- **`collectErrorMetricsFunction:`**: Given an error name as string, `Error` and request this function can be used
to trigger collecting error metrics. Default implementation is `defaultCollectErrorMetrics` that increase
the error counter for the given errorName or Error by 1.

### Technical components
- **`logger`**: Logger to be used in the GraphQL server. `TextLogger` and `JsonLogger` are available in the module.
  Own Logger can be created by implementing `Logger` interface.
- **`requestInformationExtractor`**: The `RequestInformationExtractor` used to extract information from the `Request`
  and return a `Promise<GraphQLRequestInfo>`. By default, the `DefaultRequestInformationExtractor` is used that tries to
  extract the information from the body and URL params of the request. Own Extractor can be created by
  implementing `RequestInformationExtractor` interface.
- **`metricsClient`**: The `MetricsClient` used to collect metrics from the GraphQLServer. By default, 
the `DefaultMetricsClient` is used that collects default NodeJS and three custom metrics using [prom-client][3] library.
Own MetricsClient can be used by implementing `MetricsClient` interface.

## Customise and extend GraphQLServer

To make it easier to customise and extend the GraphQLServer classes and class functions are public. This makes
extending a class and overwriting logic easy.

In the example below the logic of `TextLogger` is changed to add the text "SECRETAPP" in front of every log output. 

```typescript
export class SecretApplicationTextLogger extends TextLogger {
  prepareLogOutput(logEntry: LogEntry): string {
    return `SECRETAPP - ${super.prepareLogOutput(logEntry)}`
  }
}
```

## Contact
If you have questions or issues please visit our [Issue page](https://github.com/dreamit-de/graphql-server/issues) 
and open a new issue if there are no fitting issues for your topic yet.

## License
graphql-server is under [MIT-License](./LICENSE).

[1]: https://github.com/graphql/graphql-js
[2]: https://expressjs.com/
[3]: https://github.com/siimon/prom-client
[4]: https://www.fastify.io/
