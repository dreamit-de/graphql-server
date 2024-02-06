# graphql-server

A GraphQL server implementation written in NodeJS/Typescript. It uses the standard graphql library to receive GraphQL
requests and send back appropriate responses.

## Installation

```sh
npm install --save @dreamit/graphql-server
```

TypeScript declarations are provided within the project.

## Compatibility

The following table shows which version of [graphql-js][1] and [@dreamit/graphql-server-base][12] are compatible with which version of
`@dreamit/graphql-server`. As `@dreamit/graphql-server` defines them as peerDependency you might want to
choose a fitting version used in your project and by other libraries depending
on them.

| graphql-js version | graphql-server version | graphql-server-base version |                                       Github branch                                        | Development Status |
| ------------------ | :--------------------: | :-------------------------: | :----------------------------------------------------------------------------------------: | :----------------: |
| ~~^15.2.0~~        |        ~~1.x~~         |          ~~n.a.~~           | [~~legacy-graphql15~~](https://github.com/dreamit-de/graphql-server/tree/legacy-graphql15) |    end of life     |
| ~~^16.0.0~~        |        ~~2.x~~         |          ~~n.a.~~           | [~~legacy-server-v2~~](https://github.com/dreamit-de/graphql-server/tree/legacy-server-v2) |    end of life     |
| ^16.0.0            |          3.x           |           ^1.0.1            |   [legacy-server-v3](https://github.com/dreamit-de/graphql-server/tree/legacy-server-v3)   |    maintenance     |
| ^16.0.0            |          4.x           |            ^2.0             |                    [main](https://github.com/dreamit-de/graphql-server)                    |       active       |

## Features

-   Creates GraphQL responses
-   Can be used with many webservers (see [Webserver compatibility](#webserver-compatibility)).
-   Uses out-of-the-box default options to ease use and keep code short
-   Provides hot reloading for schema and options
-   Provides out-of-the-box metrics for GraphQLServer
-   Uses only 2 peerDependencies: [graphql-js][1] version 16 and [graphql-server-base][12] version 2 (no other production
    dependencies)

## Handling and executing requests

`GraphQLServer` provides the function `handleRequest` to handle and execute requests.
Depending on the provided parameters different actions will be executed in order to send or return the `ExecutionResult`

-   request: If the request is a `GraphQLServerRequest` the `extractInformationFromRequest` function will be used to
    extract information from the request (url and/or body) and be available as `GraphQLRequestInfo`. If the request already
    is a `GraphQLRequestInfo` this information will be used without extracting information from the server request.
-   response: If a response is provided (i.e. not undefined), a response will be sent using `sendResponse` function and
    the `GraphQLExecutionResult` will be returned. If response is undefined, no response will be sent and
    the `GraphQLExecutionResult` will be returned.

```typescript
class GraphQLServer {
    async handleRequest(
        request: GraphQLServerRequest | GraphQLRequestInfo,
        response?: GraphQLServerResponse,
    ): Promise<GraphQLExecutionResult> {}
}
```

### Use cases

The `handleRequest` function can be used for many use cases. The following part lists some use cases with a short
description. It is possible to use `handleRequest` with different parameters with a single `GraphQLServer` instance,
e.g. when using a webserver with websockets or messaging.

-   `handleRequest` with `GraphQLServerRequest` and `GraphQLServerResponse`: Use as webserver middleware.
    Create an instance of `GraphQLServer` and use the request
    and response provided by the webserver as parameters. You might need to wrap one or both values,
    see [Webserver compatibility](#webserver-compatibility)
-   `handleRequest` with `GraphQLRequestInfo`: Use for flexible GraphQL execution, e.g. for websockets or messaging.
    Create an instance of `GraphQLServer` and given a `GraphQLRequestInfo` the request can be executed and the returned
    `GraphQLExecutionResult` can be used for multiple purposes like sending a message or responding to a websocket
    request.
-   `handleRequest` with `GraphQLServerRequest`: Use as alternative webserver middleware or if custom actions should be
    done before sending back a response. Create an instance of `GraphQLServer` and use the request provided by the
    webserver as parameter for this function. You might need request values,
    see [Webserver compatibility](#webserver-compatibility). The returned `GraphQLExecutionResult` can be used to execute
    custom logic with the result and/or prepare or send a response.
-   `handleRequest` with `GraphQLRequestInfo` and `GraphQLServerResponse`: Use if a `GraphQLRequestInfo` is available and
    a response should be sent from this request.

## Usage as webserver middleware

You can create a new instance of `GraphQLServer` with the options necessary for your tasks. The
`handleRequest` function of the `GraphQLServer` can be integrated with many fitting webservers.

**Note regarding POST requests:**

graphql-server version 3 and higher try to extract the request information from the `request.body` field. Some webserver
frameworks like [Express][2] might need a fitting body parser in order to populate this `body` field.

-   parse body as `string/text` (recommended): graphql-server will handle reading content and parsing it to JSON.
-   parse body as `object/JSON`: graphql-server will read JSON and try to assign it to matching fields. This might cause
    FetchErrors if the body contains invalid JSON. We recommend using text parsers instead so graphql-server can respond
    with a fitting GraphQL error response if JSON is invalid.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({ schema: someExampleSchema })
graphQLServerExpress.use(bodyParser.text({ type: '*/*' }))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({ port: graphQLServerPort })
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
import { NoSchemaIntrospectionCustomRule } from 'graphql'

const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({
    schema: someExampleSchema,
    defaultValidationRules: [],
})
graphQLServerExpress.use(bodyParser.text({ type: '*/*' }))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({ port: graphQLServerPort })
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
import { NoSchemaIntrospectionCustomRule } from 'graphql'

const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({
    schema: someExampleSchema,
    customValidationRules: [NoSchemaIntrospectionCustomRule],
})
graphQLServerExpress.use(bodyParser.text({ type: '*/*' }))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({ port: graphQLServerPort })
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
const customGraphQLServer = new GraphQLServer({ schema: someExampleSchema })
graphQLServerExpress.use(bodyParser.text({ type: '*/*' }))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.all('/updateme', (req, res) => {
    const updatedSchema = someMagicHappened()
    customGraphQLServer.setSchema(updatedSchema)
    return res.status(200).send()
})
graphQLServerExpress.listen({ port: graphQLServerPort })
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## Metrics

There are 2 builtin `MetricsClient` implementations available.

-   **SimpleMetricsClient**: Used as default `MetricsClient`. Provides GraphQLServer related metrics without but does not provide NodeJS metrics like cpu and memory usage.
-   **NoMetricsClient**: Does not collect any metrics. Can be used to disable metrics collection/increase performance.

The **SimpleMetricsClient** provides three custom metrics for the GraphQL server:

-   **graphql_server_availability**: Availability gauge with status 0 (unavailable) and 1 (available)
-   **graphql_server_request_throughput**: The number of incoming requests
-   **graphql_server_errors**: The number of errors that are encountered while running the GraphQLServer. The counter uses
    the _errorName_ field as label so errors could be differentiated. At the moment the following labels are available and
    initialized with 0:
    -   FetchError
    -   GraphQLError
    -   SchemaValidationError
    -   MethodNotAllowedError
    -   InvalidSchemaError
    -   MissingQueryParameterError
    -   ValidationError
    -   SyntaxError
    -   IntrospectionDisabledError

A simple metrics endpoint can be created by using `getMetricsContentType` and `getMetrics` functions from
the `GraphQLServer` instance. In the example below a second route is used to return metrics data.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
const customGraphQLServer = new GraphQLServer({ schema: someExampleSchema })
graphQLServerExpress.use(bodyParser.text({ type: '*/*' }))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.get('/metrics', async (req, res) => {
    return res
        .contentType(customGraphQLServer.getMetricsContentType())
        .send(await customGraphQLServer.getMetrics())
})
graphQLServerExpress.listen({ port: graphQLServerPort })
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## CORS requests

The `GraphQLServer` does not handle CORS requests on its own. It is recommended to handle this on the webserver level,
e.g. by using `cors` library with an [Express][2] webserver like in the example below.

```typescript
const graphQLServerPort = 3592
const graphQLServerExpress = express()
graphQLServerExpress.use(cors())
const customGraphQLServer = new GraphQLServer({ schema: someExampleSchema })
graphQLServerExpress.use(bodyParser.text({ type: '*/*' }))
graphQLServerExpress.all('/graphql', (req, res) => {
    return customGraphQLServer.handleRequest(req, res)
})
graphQLServerExpress.listen({ port: graphQLServerPort })
console.info(`Starting GraphQL server on port ${graphQLServerPort}`)
```

## Webserver compatibility

The `handleRequest` function works with webservers that provide a fitting request and
response object that matches `GraphQLServerRequest` and `GraphQLServerResponse` interface. As [Express][2] (since
version 2.x) matches both no further adjustment is necessary. If one or both objects do not match `GraphQLServerRequest`
and `GraphQLServerResponse`
it might still be possible to map the webserver request and response objects to these interfaces.

In the following table a list of webserver frameworks/versions can be found that are able to run `GraphQLServer`.
The `Version` column shows the version of the webserver framework we tested `GraphQLServer` version 4 with.  
If the request and/or response has to be mapped it is noted in the `Mapping` column. There is a code
examples on how to use `handleRequest` without providing a `GraphQLServerResponse` and sending the response with the
functionality provided by the webserver.

| Framework/Module | Version |       Mapping        |                                             Example                                             |
| ---------------- | :-----: | :------------------: | :---------------------------------------------------------------------------------------------: |
| [AdonisJS][6]    |   5.9   |  request, response   |  [AdonisJS example](https://github.com/dreamit-de/adonisjs-example/blob/main/start/routes.ts)   |
| [Express][2]     | > = 2.x |         none         |     [Express example](https://github.com/dreamit-de/express-example/blob/main/src/index.ts)     |
| [fastify][4]     |  4.15   |       response       |     [Fastify example](https://github.com/dreamit-de/fastify-example/blob/main/src/index.ts)     |
| [hapi][10]       | 21.3.1  | request, no response |        [hapi example](https://github.com/dreamit-de/hapi-example/blob/main/src/index.ts)        |
| [Koa][5]         | 2.14.1  |       response       |         [Koa example](https://github.com/dreamit-de/koa-example/blob/main/src/index.ts)         |
| [Next.js][7]     | 13.1.6  |         none         | [Next.js example](https://github.com/dreamit-de/nextjs-example/blob/main/pages/api/graphql.ts)  |
| [Nitro][8]       |  2.3.3  |       request        |  [Nitro example](https://github.com/dreamit-de/nitro-example/blob/main/routes/graphql.post.ts)  |
| [NodeJS http][9] |  18.14  |       request        | [NodeJS http example](https://github.com/dreamit-de/nodejs-http-example/blob/main/src/index.ts) |
| [Socket.IO][13]  |  4.6.1  |       response       |   [Socket.IO example](https://github.com/dreamit-de/socketio-example/blob/main/src/index.ts)    |
| [gRPC][14]       | 1.8.14  |     no response      |      [gRPC example](https://github.com/dreamit-de/grpc-server-example/blob/main/server.js)      |
| [Deno][15]       | 0.181.0 | request, no response |     [Deno HTTP example](https://github.com/dreamit-de/deno-graphql/blob/main/webserver.ts)      |

**`GraphQLServerRequest` and `GraphQLServerResponse` interfaces**

The `GraphQLServerRequest` and `GraphQLServerResponse` are available in the [@dreamit/graphql-server-base][12] module.
This allows extensions such as custom `Logger` or `MetricsClient` implementations to implement these interfaces without
defining `@dreamit/graphql-server` as dependency.

```typescript
export interface GraphQLServerRequest {
    headers: IncomingHttpHeaders
    url?: string
    body?: unknown
    method?: string
}

export interface GraphQLServerResponse {
    statusCode: number
    setHeader(
        name: string,
        value: number | string | ReadonlyArray<string>,
    ): this
    end(chunk: unknown, callback?: () => void): this
    removeHeader(name: string): void
}
```

## Working with context function

`GraphQLServer`, like many GraphQL libraries, uses a context function to create a context object that is available
during the whole request execution process. This can for example be used to inject information about request headers
or adjust responses. An example can be found in the `CustomSendResponse.integration.test.ts` class in the test/server folder.

```typescript
export interface GraphQLServerOptions {
    readonly contextFunction?: (contextParameters: {
        serverOptions: GraphQLServerOptions
        request?: GraphQLServerRequest
        response?: GraphQLServerResponse
    }) => unknown
}
```

## Available options

The `GraphQLServer` accepts the following options. Note that all options are optional and can be overwritten by calling
the `setOptions` function of the `GraphQLServer` instance.

### GraphQL related options

-   **`schema`**: The schema that is used to handle the request and send a response. If undefined the `GraphQLServer` will
    reject responses with a GraphQL error response with status code 500.
-   **`shouldUpdateSchemaFunction`**: Function that can be used to determine whether a schema update should be executed.
-   **`formatErrorFunction`**: Function that can be used to format occurring GraphQL errors. Given a `GraphQLError` it
    should return a `GraphQLFormattedError`. By default `defaultFormatErrorFunction` is called that uses `error.toJSON` to
    format the error.
-   **`schemaValidationFunction`**: Function that is called when a schema is set or updated. Given a `GraphQLSchema` it
    can return a `ReadonlyArray<GraphQLError>` or an empty array if no errors occurred/should be returned. By
    default `validateSchema` from [graphql-js][1] library is called.
-   **`parseFunction`**: Function that is called to create a `DocumentNode` with the extracted query in the request
    information. Given a `source` and `ParseOptions` it should return a `DocumentNode`. By default `parse`
    from [graphql-js][1] library is called.
-   **`defaultValidationRules`**: Default validation rules that are used when `validateSchemaFunction` is called.
    Both `defaultValidationRules` and `customValidationRules` will be merged together when `validateSchemaFunction`
    is called. By default `specifiedRules` from [graphql-js][1] are used. Can be overwritten if no or other default rules
    should be used.
-   **`customValidationRules`**: Custom validation rules that are used when `validateSchemaFunction` is called.
    Both `defaultValidationRules` and `customValidationRules` will be merged together when `validateSchemaFunction`
    is called. By default, an empty array is set. Can be overwritten to add additional rules
    like `NoSchemaIntrospectionCustomRule`.
-   **`validationTypeInfo`**: Validation type info that is used when `validateSchemaFunction` is called.
-   **`validationOptions`**: Validation options containing `{ maxErrors?: number }` that is used
    when `validateSchemaFunction` is called.
-   **`removeValidationRecommendations`**: If `true` removes validation recommendations like "users not found. Did you
    mean user?". For non-production environments it is usually safe to allow recommendations. For production environments
    when not providing access to third-party users it is considered good practice to remove these recommendations so users
    can not circumvent disabled introspection request by using recommendations to explore the schema.
-   **`validateFunction`**: Validation function that validates the extracted request against the available schema. By
    default `validate` from [graphql-js][1] library is called.
-   **`rootValue`**: Root value that is used when `executeFunction` is called. Can be used to define resolvers that handle
    how defined queries and/or mutations should be resolved (e.g. fetch object from database and return entity).
-   **`fieldResolver`**: Field resolver function that is used when `executeFunction` is called. Default is undefined, if
    custom logic is necessary it can be added.
-   **`typeResolver`**: Type resolver function that is used when `executeFunction` is called. Default is undefined, if
    custom logic is necessary it can be added.
-   **`executeFunction`**: Execute function that executes the parsed `DocumentNode` (created in `parseFunction`) using
    given schema, values and resolvers. Returns a Promise or value of an `ExecutionResult`. By default `execute`
    from [graphql-js][1] library is called.
-   **`extensionFunction`**: Extension function that can be used to add additional information to the `extensions` field
    of the response. Given a `GraphQLRequestInfo`, `ExecutionResult`, `GraphQLServerOptions` and context it should return undefined or an ObjMap
    of key-value-pairs that are added to the`extensions` field. By default `defaultExtensions`
    is used and returns undefined.
-   **`reassignAggregateError`**: If `true` and the `ExecutionResult` created by the `executeFunction` contains
    an `AggregateError`
    (e.g. an error containing a comma-separated list of errors in the message and an `originalError` containing multiple
    errors)
    this function will reassign the `originalError.errors` to the `ExecutionResult.errors` field. This is helpful if
    another application creates `AggregateErrors` while the initiator of the request (e.g. a Frontend app) does not expect
    or know how to handle `AggregateErrors`.

### Context function

-   **`contextFunction`**: Given `GraphQLServerOptions`, `GraphQLServerRequest` and `GraphQLServerResponse` this function is used to create a context value that is available in the whole request flow.
    Default implementation is `defaultContextFunction` that returns the given `GraphQLServerRequest`.
    Can be used to extract information from the request and/or response and return them as context.
    This is often used to extract headers like 'Authorization' and set them in the execute function.

### Error messages

-   **`executionResultErrorMessage:`**: Error message that is used in logging if a response contains an `errors` element.
-   **`fetchErrorMessage:`**: If provided and not set to undefined, used as fixed error message if a FetchError occurs.
-   **`graphqlExecutionErrorMessage:`**: Error message that is used in logging if an error is thrown when `execute` function is called.
-   **`validationErrorMessage:`**: Error message that is used in logging if one or more errors occurred when calling the `validate` function.

### Error responses

-   **`methodNotAllowedResponse:`**: Function given a method as `string` returns an error that the used method is not allowed by `GraphQLServer`.
-   **`invalidSchemaResponse:`**: Default error that is returned with set schema is invalid.
-   **`missingQueryParameterResponse:`**: Default error that is returned if no query is available in the `GraphQLRequestInfo`.
-   **`onlyQueryInGetRequestsResponse:`**: Function given an operation as `string` returns an error that the used operation is not allowed for `GET` requests.

### Metrics options

-   **`collectErrorMetricsFunction:`**: Given an error name as string, error as `unknown`, `GraphQLServerOptions` and context as `unknown` this function
    can be used to trigger collecting error metrics. Default implementation is `defaultCollectErrorMetrics` that increase
    the error counter for the given errorName or Error by 1.

### Technical components

-   **`logger`**: Logger to be used in the GraphQL server. `TextLogger` and `JsonLogger` as well as `NoStacktraceTextLogger` and `NoStacktraceJsonLogger` (useful for tests without the need for a stacktrace) and `NoLogger` (useful if no logging should be done but logger is required) are available in the module. Own
    Logger can be created by implementing `Logger` interface.
-   **`extractInformationFromRequest`**: Function that can be used to extract information from the `GraphQLServerRequest`
    and return a `Promise<GraphQLRequestInfo>`. By default, the `extractInformationFromRequest` function is used that tries to
    extract the information from the body (using `request.body` field) and URL params of the request.
-   **`sendResponse`**: Function used to send a fitting response being either a `data` or `error` response.
    By default, the `sendResponse` is used that tries to create and send a response using the functions provided
    by the given `GraphQLServerResponse`.
-   **`metricsClient`**: The `MetricsClient` used to collect metrics from the GraphQLServer. By default,
    the `SimpleMetricsClient` is used that collects three custom metrics. Own MetricsClient can be used by implementing `MetricsClient` interface.
-   **`responseEndChunkFunction`**: Function used to adjust the chunk/body before it is used in the `response.end` function call in the `sendResponse` function. By default it stringifies the ExecutionResult and creates a Buffer from this string.

## Customize and extend GraphQLServer

To make it easier to customize and extend the `GraphQLServer` classes and class functions are public. This makes extending
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
[4]: https://www.fastify.io/
[5]: https://koajs.com/
[6]: https://adonisjs.com/
[7]: https://nextjs.org/
[8]: https://nitro.unjs.io/
[9]: https://nodejs.org/dist/latest-v16.x/docs/api/http.html
[10]: https://hapi.dev/
[12]: https://github.com/dreamit-de/graphql-server-base
[13]: https://socket.io/
[14]: https://grpc.io/
[15]: https://deno.land/
