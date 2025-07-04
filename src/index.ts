/* eslint-disable import/no-internal-modules */
/**
 * A GraphQL server implementation written in NodeJS/Typescript.
 * It uses the standard graphql library to receive GraphQL
 * requests and send back appropriate responses.
 */
export { determineGraphQLOrFetchError } from './error/DetermineGraphQLOrFetchError'
export { determineValidationOrIntrospectionDisabledError } from './error/DetermineValidationOrIntrospectionDisabledError'
export {
    recommendationText,
    removeValidationRecommendationsFromErrors,
} from './error/RemoveValidationRecommendationsFromErrors'

export { createLogEntry } from './logger/CreateLogEntry'
export { createISOTimestamp } from './logger/CreateTimestamp'
export { JsonLogger } from './logger/JsonLogger'
export { sanitizeMessage } from './logger/SanitizeMessage'
export { TextLogger } from './logger/TextLogger'
export { truncateLogMessage } from './logger/TruncateLogMessage'
// Note: Stacktrace logger need their base class to be exported first before referencing it.
export { NoStacktraceJsonLogger } from './logger/NoStacktraceJsonLogger'
export { NoStacktraceTextLogger } from './logger/NoStacktraceTextLogger'

export { increaseFetchOrGraphQLErrorMetric } from './metrics/IncreaseFetchOrGraphQLErrorMetric'
export { NoMetricsClient } from './metrics/NoMetricsClient'
export { SimpleMetricsClient } from './metrics/SimpleMetricsClient'

export {
    extractInformationFromBody,
    extractInformationFromRequest,
    extractInformationFromUrlParameters,
} from './request/ExtractInformationFromRequest'
export { getContentType } from './request/GetContentType'
export { requestCouldNotBeProcessed } from './request/RequestConstants'

export { extractResponseFormatFromAcceptHeader } from './response/ExtractResponseFormatFromAcceptHeader'
export { getFirstErrorFromExecutionResult } from './response/GraphQLExecutionResult'
export { sendResponse } from './response/SendResponse'
export type { StandaloneResponseParameters } from './response/StandaloneResponseParameters'

export {
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultExecutionResultErrorMessage,
    defaultExtensions,
    defaultFormatErrorFunction,
    defaultGraphQLServerOptions,
    defaultGraphqlExecutionErrorMessage,
    defaultMethodNotAllowedResponse,
    defaultMissingQueryParameterResponse,
    defaultOnlyQueryInGetRequestsResponse,
    defaultResponseEndChunkFunction,
    defaultShouldUpdateSchema,
    defaultValidationErrorMessage,
    fallbackTextLogger,
    invalidSchemaResponse,
    noOpStandardSchema,
} from './server/DefaultGraphQLServerOptions'
export { getRequestInformation } from './server/GetRequestInformation'
export { GraphQLServer } from './server/GraphQLServer'
export type { GraphQLServerOptions } from './server/GraphQLServerOptions'
export { getResponseSchemaValidationErrors } from './validation/GetResponseSchemaValidationErrors'
