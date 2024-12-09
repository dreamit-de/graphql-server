/* eslint-disable import/no-internal-modules */
/**
 * A GraphQL server implementation written in NodeJS/Typescript.
 * It uses the standard graphql library to receive GraphQL
 * requests and send back appropriate responses.
 */
export { AggregateError, isAggregateError } from './error/AggregateError'
export { determineGraphQLOrFetchError } from './error/DetermineGraphQLOrFetchError'
export { determineValidationOrIntrospectionDisabledError } from './error/DetermineValidationOrIntrospectionDisabledError'
export {
    recommendationText,
    removeValidationRecommendationsFromErrors,
} from './error/RemoveValidationRecommendationsFromErrors'

export { createLogEntry } from './logger/CreateLogEntry'
export { createISOTimestamp, createTimestamp } from './logger/CreateTimestamp'
export { JsonLogger } from './logger/JsonLogger'
export { LogEntry } from './logger/LogEntry'
export { LogEntryInput } from './logger/LogEntryInput'
export { LogLevel } from './logger/LogLevel'
export { NoLogger } from './logger/NoLogger'
export {
    VARIABLES_IN_MESSAGE_REGEX,
    sanitizeMessage,
} from './logger/SanitizeMessage'
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

export { getFirstErrorFromExecutionResult } from './response/GraphQLExecutionResult'
export { sendResponse } from './response/SendResponse'
export { StandaloneResponseParameters } from './response/StandaloneResponseParameters'

export {
    DefaultGraphQLServerOptions,
    defaultCollectErrorMetrics,
    defaultContextFunction,
    defaultExecutionResultErrorMessage,
    defaultExtensions,
    defaultFormatErrorFunction,
    defaultGraphqlExecutionErrorMessage,
    defaultMethodNotAllowedResponse,
    defaultMissingQueryParameterResponse,
    defaultOnlyQueryInGetRequestsResponse,
    defaultResponseEndChunkFunction,
    defaultShouldUpdateSchema,
    defaultValidationErrorMessage,
    fallbackTextLogger,
    invalidSchemaResponse,
} from './server/DefaultGraphQLServerOptions'
export { getRequestInformation } from './server/GetRequestInformation'
export { GraphQLServer } from './server/GraphQLServer'
export { GraphQLServerOptions } from './server/GraphQLServerOptions'
