# graphql-server

A GraphQL server implementation written in NodeJS/Typescript. It uses the standard graphql library to receive GraphQL
requests and send back appropriate responses.

## Installation

```sh
npm install --save @dreamit/graphql-server
```

TypeScript declarations are provided within the project.

## Compatibility

The following table shows which version of [graphql-js][1] and [@sgohlke/graphql-server-base][12] are compatible with which version of
`@dreamit/graphql-server`. As `@dreamit/graphql-server` defines them as peerDependency you might want to
choose a fitting version used in your project and by other libraries depending
on them.

| graphql-js version | graphql-server version |  graphql-server-base version |                                       Github branch                                        | Development Status |
|--------------------|:----------------------:|:----------------------:|:------------------------------------------------------------------------------------------:|:------------------:|
| ~~^15.2.0~~        |        ~~1.x~~         |        ~~n.a.~~        | [~~legacy-graphql15~~](https://github.com/dreamit-de/graphql-server/tree/legacy-graphql15) |    end of life     |
| ^16.0.0            |          2.x           |          n.a.          |   [legacy-server-v2](https://github.com/dreamit-de/graphql-server/tree/legacy-server-v2)   |    maintenance     |
| ^16.0.0            |          3.x           |          ^1.0          |                    [main](https://github.com/dreamit-de/graphql-server)                    |       active       |

## Features

- Creates GraphQL responses
- Can be used with many webservers (see [Webserver compatibility](#webserver-compatibility)).
- Uses out-of-the-box default options to ease use and keep code short
- Provides hot reloading for schema and options
- Provides out-of-the-box metrics for GraphQLServer
- Uses only 3 peerDependencies: [graphql-js][1] version 16, [graphql-prom-metrics][11] version 1 and [graphql-server-base][12] (no other production
  dependencies)

## Core Functions

`GraphQLServer` provides four core functions that can be used to create a result or send a response with a given request
information or server request depending on the needs. For the most common use case, usage as webserver middleware,
`handleRequestAndSendResponse` can be used.

| **Request / Response**      | **Return GraphQLExecutionResult** | **Send server response**              |
|-----------------------------|-----------------------------------|---------------------------------------|
| **Use request information** | `async executeRequest`            | `async executeRequestAndSendResponse` |
| **Use server request**      | `async handleRequest`             | `async handleRequestAndSendResponse`  |

### Use cases

The core functions can be used for many use cases. The following part lists some use cases with a short description. It
is possible to use more than one core function with a single `GraphQLServer` instance, e.g. when using a webserver with
websockets or messaging.

- `handleRequestAndSendResponse`: Use as webserver middleware. Create an instance of `GraphQLServer` and use the request
  and response provided by the webserver as parameters for this function. You might need to wrap one or both values,
  see [Webserver compatibility](#webserver-compatibility)
- `executeRequest`: Use for flexible GraphQL execution, e.g. for websockets or messaging. Create an instance
  of `GraphQLServer` and given a `GraphQLRequestInfo` the request can be executed and the returned
  `GraphQLExecutionResult` can be used for multiple purposes like sending a message or responding to a websocket
  request.
- `handleRequest`: Use as alternative webserver middleware or if custom actions should be done before sending back a
  response. Create an instance of `GraphQLServer` and use the request provided by the webserver as parameter for this
  function. You might need request values, see [Webserver compatibility](#webserver-compatibility). The returned
  `GraphQLExecutionResult` can be used to execute custom logic with the result and/or prepare or send a response.
- `executeRequestAndSendResponse`: Use if a `GraphQLRequestInfo` is available and a response should be sent from this
  request.

## Usage as webserver middleware

You can create a new instance of `GraphQLServer` with the options necessary for your tasks. The
`handleRequestAndSendResponse` function of the `GraphQLServer` can be integrated with many fitting webservers.

**Note regarding POST requests:**

graphql-server version 3 tries to extract the request information from the `request.body` field. Some webserver
frameworks like [Express][2] might need a fitting body parser in order to populate this `body` field.

- parse body as `string/text` (recommended): graphql-server will handle reading content and parsing it to JSON.
- parse body as `object/JSON`: graphql-server will read JSON and try to assign it to matching fields. This might cause
  FetchErrors if the body contains invalid JSON. We recommend using text parsers instead so graphql-server can respond
  with a fitting GraphQL error response if JSON is invalid.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema})
graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequestAndSendResponse(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

`GraphQLServer` provides default values and behaviour out of the box. It is recommended to at least provide a `schema`
so the request won't be rejected because of a missing/invalid schema. When using it with a local schema it is
recommended to provide a `rootValue` to return a fitting value. Examples for these requests can be found in the
integration test in the `GraphQLServer.integration.test.ts` class in the `tests/server` folder.

## Schema validation and disabling Introspection

Validation rules can be used to define how the `GraphQLServer` should behave when validating the request against the
given schema. To ease the use `GraphQLServer` uses the `specifiedRules` from [graphql-js][1] library. If you don't want
to use the default validation rules you can overwrite them by setting `defaultValidationRules` option to `[]`.

**Warning!**
Setting both `defaultValidationRules` and `customValidationRules` options to `[]` will disable validation. This might
result in unexpected responses that are hard to use for API users or frontends.

```typescript
import {NoSchemaIntrospectionCustomRule} from 'graphql'

const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({
    schema: someExampleSchema,
    defaultValidationRules: []
})
graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequestAndSendResponse(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

If you want to define custom validation rules you can use the `customValidationRules` option (e.g. to handle
introspection like shown in the example below).

Introspection can be used to get information about the available schema. While this may be useful in development
environments and public APIs you should consider disabling it for production if e.g. your API is only used with a
specific matching frontend.

Introspection can be disabled by adding the `NoSchemaIntrospectionCustomRule` from the [graphql-js][1] library to the
`customValidationRules` option.

```typescript
import {NoSchemaIntrospectionCustomRule} from 'graphql'

const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({
    schema: someExampleSchema,
    customValidationRules: [NoSchemaIntrospectionCustomRule]
})
graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequestAndSendResponse(req, res)
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
graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequestAndSendResponse(req, res)
})
graphQLServerExpress.all('/updateme', (req, res) => {
    const updatedSchema = someMagicHappened()
    customGraphQLServer.setSchema(updatedSchema)
    return res.status(200)
        .send()
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## Metrics

There are 2 builtin `MetricsClient` implementations available.

- **SimpleMetricsClient**: Used as fallback `MetricsClient` if library detects that cpu usage cannot be
  read. Provides GraphQLServer related metrics without relying on [prom-client][3] library and does not provide NodeJS
  metrics like cpu and memory usage.
- **NoMetricsClient**: Does not collect any metrics. Can be used to disable metrics collection/increase performance.

As migration help to the `@dreamit/graphql-server` v4 version the default `MetricsClient` uses `PromMetricsClient` 
from [graphql-prom-metrics][11]
- **PromMetricsClient**: Used as default `MetricsClient` if no specific client is set. Uses [prom-client][3] library
  to provide NodeJS metrics like cpu and memory usage as well as GraphQLServer related metrics.

**Warning!**:
If you are using **PromMetricsClient** you should avoid creating multiple **GraphQLServer** instances that all use 
the **PromMetricsClient**. Because of the usage of a global object in the [prom-client][3] library this might result 
in unexpected behavior or malfunction. You can set another metrics client like **SimpleMetricsClient** 
by calling **GraphQLServer setOptions()** or **GraphQLServer setMetricsClient()**.   

The **SimpleMetricsClient** provides three custom metrics for the GraphQL server:

- **graphql_server_availability**: Availability gauge with status 0 (unavailable) and 1 (available)
- **graphql_server_request_throughput**: The number of incoming requests
- **graphql_server_errors**: The number of errors that are encountered while running the GraphQLServer. The counter uses
  the *errorName* field as label so errors could be differentiated. At the moment the following labels are available and
  initialised with 0:
    - FetchError
    - GraphQLError
    - SchemaValidationError
    - MethodNotAllowedError
    - InvalidSchemaError
    - MissingQueryParameterError
    - ValidationError
    - SyntaxError
    - IntrospectionDisabledError

A simple metrics endpoint can be created by using `getMetricsContentType` and `getMetrics` functions from
the `GraphQLServer` instance. In the example below a second route is used to return metrics data.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({schema: someExampleSchema})
graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequestAndSendResponse(req, res)
})
graphQLServerExpress.get('/metrics', async(req, res) => {
    return res.contentType(customGraphQLServer.getMetricsContentType())
        .send(await customGraphQLServer.getMetrics());
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
graphQLServerExpress.use(bodyParser.text({type: '*/*'}))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequestAndSendResponse(req, res)
})
graphQLServerExpress.listen({port: graphQLServerPort})
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## Webserver compatibility

The `GraphQLServer.handleRequestAndSendResponse` function works with webservers that provide a fitting request and
response object that matches `GraphQLServerRequest` and `GraphQLServerResponse` interface. As [Express][2] (since
version 2.x) matches both no further adjustment is necessary. If one or both objects do not match `GraphQLServerRequest`
and `GraphQLServerResponse`
it might still be possible to map the webserver request and response objects to these interfaces.

In the following table a list of webserver frameworks/versions can be found that are able to run `GraphQLServer`.
The `Version` column shows the version of the webserver framework we tested `GraphQLServer` version 3 with.  
If the request, response and/or core function has to be mapped it is noted in the `Mapping` column. There are some code
examples on how
to adjust the request/response to be able to use `GraphQLServer.handleRequest` with the webserver.

| Framework/Module | Version |        Mapping         |                                                           Example                                                           | 
|------------------|:-------:|:----------------------:|:---------------------------------------------------------------------------------------------------------------------------:|
| [AdonisJS][6]    |   5.8   |   request, response    |                  [AdonisJS example](https://github.com/sgohlke/adonisjs-example/blob/main/start/routes.ts)                  |
| [Express][2]     | > = 2.x |          none          | [GraphQLServer test](https://github.com/dreamit-de/graphql-server/blob/main/tests/server/GraphQLServer.integration.test.ts) |
| [fastify][4]     |   4.7   |        response        |                    [Fastify example](https://github.com/sgohlke/fastify-example/blob/main/src/index.ts)                     |
| [hapi][10]       |  20.2   | request, handleRequest |                       [hapi example](https://github.com/sgohlke/hapi-example/blob/main/src/index.ts)                        |
| [Koa][5]         |  2.13   |        response        |                        [Koa example](https://github.com/sgohlke/koa-example/blob/main/src/index.ts)                         |
| [Next.js][7]     |  12.3   |          none          |                 [Next.js example](https://github.com/sgohlke/nextjs-example/blob/main/pages/api/graphql.ts)                 |
| [Nitro][8]       |   0.5   |        request         |                 [Nitro example](https://github.com/sgohlke/nitro-example/blob/main/routes/graphql.post.ts)                  |
| [NodeJS http][9] |  16.17  |        request         |                [NodeJS http example](https://github.com/sgohlke/nodejs-http-example/blob/main/src/index.ts)                 |

**`GraphQLServerRequest` and `GraphQLServerResponse` interfaces**

```typescript
export interface GraphQLServerRequest {
    headers: IncomingHttpHeaders,
    url?: string,
    body?: unknown,
    method?: string;
}

export interface GraphQLServerResponse {
    statusCode: number,
    setHeader(name: string, value: number | string | ReadonlyArray<string>): this
    end(chunk: unknown, callback?: () => void): this
    removeHeader(name: string): void;
}
```

## Working with context functions

`GraphQLServer`, like many GraphQL libraries, uses context functions to create a context object that is available during
the whole request execution process. This can for example be used to inject information about request headers or adjust
responses. An example can be found in the `CustomResponseHandler.integration.test.ts` class in the test/server folder.

The following three context functions are available and used by different core functions depending on if a request or
response or both objects are available.
**Deprecation Warning:**
For accessing the Logger please use the field `serverOptions.logger` instead of `logger`. The logger parameter might be
removed in the next major version.

- `requestResponseContextFunction`: Used by `handleRequestAndSendResponse`. Has server options, logger, request and
  response object
  available.
- `requestContextFunction`: Used by `handleRequest`. Has server options, logger and request object available .
- `loggerContextFunction`: Used by `executeRequest` and `executeRequestAndSendResponse`. Only has server options and
  logger available.

## Available options

The `GraphQLServer` accepts the following options. Note that all options are optional and can be overwritten by calling
the `setOptions` function of the `GraphQLServer` instance.

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
  can return a `ReadonlyArray<GraphQLError>` or an empty array if no errors occurred/should be returned. By
  default `validateSchema` from [graphql-js][1] library is called.
- **`parseFunction`**: Function that is called to create a `DocumentNode` with the extracted query in the request
  information. Given a `source` and `ParseOptions` it should return a `DocumentNode`. By default `parse`
  from [graphql-js][1] library is called.
- **`defaultValidationRules`**: Default validation rules that are used when `validateSchemaFunction` is called.
  Both `defaultValidationRules` and `customValidationRules` will be merged together when `validateSchemaFunction`
  is called. By default `specifiedRules` from [graphql-js][1] are used. Can be overwritten if no or other default rules
  should be used.
- **`customValidationRules`**: Custom validation rules that are used when `validateSchemaFunction` is called.
  Both `defaultValidationRules` and `customValidationRules` will be merged together when `validateSchemaFunction`
  is called. By default, an empty array is set. Can be overwritten to add additional rules
  like `NoSchemaIntrospectionCustomRule`.
- **`validationTypeInfo`**: Validation type info that is used when `validateSchemaFunction` is called.
- **`validationOptions`**: Validation options containing `{ maxErrors?: number }` that is used
  when `validateSchemaFunction` is called.
- **`removeValidationRecommendations`**: If `true` removes validation recommendations like "users not found. Did you
  mean user?". For non-production environments it is usually safe to allow recommendations. For production environments
  when not providing access to third-party users it is considered good practice to remove these recommendations so users
  can not circumvent disabled introspection request by using recommendations to explore the schema.
- **`validateFunction`**: Validation function that validates the extracted request against the available schema. By
  default `validate` from [graphql-js][1] library is called.
- **`rootValue`**: Root value that is used when `executeFunction` is called. Can be used to define resolvers that handle
  how defined queries and/or mutations should be resolved (e.g. fetch object from database and return entity).
- **`fieldResolver`**: Field resolver function that is used when `executeFunction` is called. Default is undefined, if
  custom logic is necessary it can be added.
- **`typeResolver`**: Type resolver function that is used when `executeFunction` is called. Default is undefined, if
  custom logic is necessary it can be added.
- **`executeFunction`**: Execute function that executes the parsed `DocumentNode` (created in `parseFunction`) using
  given schema, values and resolvers. Returns a Promise or value of an `ExecutionResult`. By default `execute`
  from [graphql-js][1] library is called.
- **`extensionFunction`**: Extension function that can be used to add additional information to the `extensions` field
  of the response. Given a `Request`, `GraphQLRequestInfo` and `ExecutionResult` it should return undefined or an ObjMap
  of key-value-pairs that are added to the`extensions` field. By default `defaultExtensions`
  is used and returns undefined.
- **`reassignAggregateError`**: If `true` and the `ExecutionResult` created by the `executeFunction` contains
  an `AggregateError`
  (e.g. an error containing a comma-separated list of errors in the message and an `originalError` containing multiple
  errors)
  this function will reassign the `originalError.errors` to the `ExecutionResult.errors` field. This is helpful if
  another application creates `AggregateErrors` while the initiator of the request (e.g. a Frontend app) does not expect
  or know how to handle `AggregateErrors`.

### Context functions

**Deprecation Warning:**
For accessing the Logger please use the field `serverOptions.logger` instead of `logger`. The logger parameter might be
removed in the next major version.

- **`requestResponseContextFunction`**: Given a `GraphQLServerRequest`, `GraphQLServerResponse`, `Logger` and
  `GraphQLServerOptions` this function is used to create a context value that is used when `executeFunction` is called.
  Default implementation is `defaultRequestResponseContextFunction`.
  Can be used to extract information from the request and/or response and return them as context.
  This is often used to extract headers like 'Authorization' and set them in the execute function.
  `defaultRequestResponseContextFunction` just returns the whole initial `GraphQLServerRequest` object.
- **`requestContextFunction`**: Given a `GraphQLServerRequest`, `Logger` and `GraphQLServerOptions` this function is
  used
  to create a context value that is used when `executeFunction` is called.
  Default implementation is `defaultRequestContextFunction`.
  Can be used to extract information from the request and return them as context.
  This is often used to extract headers like 'Authorization' and set them in the execute function.
  `defaultRequestContextFunction` just returns the whole initial `GraphQLServerRequest` object.
- **`loggerContextFunction`**: Given a `Logger` and `GraphQLServerOptions` this function is used
  to create a context value that is used when `executeFunction` is called.
  Default implementation is `defaultLoggerContextFunction`.
  Can be used to during the request execution process to read or write information as context.
  `defaultLoggerContextFunction` just returns an empty `{}` object.

### Metrics options

- **`collectErrorMetricsFunction:`**: Given an error name as string, `Error`, request and request context this function
  can be used to trigger collecting error metrics. Default implementation is `defaultCollectErrorMetrics` that increase
  the error counter for the given errorName or Error by 1.

### Technical components

- **`logger`**: Logger to be used in the GraphQL server. `TextLogger` and `JsonLogger` are available in the module. Own
  Logger can be created by implementing `Logger` interface.
- **`requestInformationExtractor`**: The `RequestInformationExtractor` used to extract information from the `Request`
  and return a `Promise<GraphQLRequestInfo>`. By default, the `DefaultRequestInformationExtractor` is used that tries to
  extract the information from the body (using `request.body` field) and URL params of the request. Own Extractor can be
  created by implementing `RequestInformationExtractor` interface.
- **`responseHandler`**: The `ResponseHandler` used to send a fitting response being either a `data` or `error`response.
  By default, the `DefaultResponseHandler` is used that tries to create and send a response using the functions provided
  by the given `GraphQLServerResponse`. Own ResponseHandler can be created by implementing `ResponseHandler` interface.
- **`metricsClient`**: The `MetricsClient` used to collect metrics from the GraphQLServer. By default,
  the `PromMetricsClient` from [graphql-prom-metrics][11] is used that collects default NodeJS and three custom metrics 
  using [prom-client][3] library. Own MetricsClient can be used by implementing `MetricsClient` interface.

## Customise and extend GraphQLServer

To make it easier to customise and extend the GraphQLServer classes and class functions are public. This makes extending
a class and overwriting logic easy.

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

[5]: https://koajs.com/

[6]: https://adonisjs.com/

[7]: https://nextjs.org/

[8]: https://nitro.unjs.io/

[9]: https://nodejs.org/dist/latest-v16.x/docs/api/http.html

[10]: https://hapi.dev/

[11]: https://github.com/sgohlke/graphql-prom-metrics

[12]: https://github.com/sgohlke/graphql-server-base
