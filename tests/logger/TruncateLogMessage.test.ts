/* eslint-disable max-len */
import { LogLevel, truncateLogMessage } from '~/src'

const timeoutMessage =
    '{"stack":"Error: 14 UNAVAILABLE: No connection established}'

test.each`
    message           | truncatedText | truncateLimit | expectedLogMessage
    ${timeoutMessage} | ${undefined}  | ${undefined}  | ${`${timeoutMessage}`}
    ${timeoutMessage} | ${undefined}  | ${20}         | ${'{"stack":_TRUNCATED_'}
    ${timeoutMessage} | ${'_TRUNC_'}  | ${20}         | ${'{"stack":"Err_TRUNC_'}
    ${timeoutMessage} | ${undefined}  | ${2}          | ${'{"'}
    ${timeoutMessage} | ${undefined}  | ${2000}       | ${`${timeoutMessage}`}
    ${timeoutMessage} | ${undefined}  | ${48}         | ${`${timeoutMessage}`}
    ${timeoutMessage} | ${undefined}  | ${47}         | ${'{"stack":"Error: 14 UNAVAILABLE: No _TRUNCATED_'}
`(
    'expects the log message to be truncated correctly for given $message , $truncatedText and $truncateLimit',
    ({ message, truncatedText, truncateLimit, expectedLogMessage }) => {
        const logEntry = truncateLogMessage(
            {
                level: LogLevel.info,
                logger: 'test-logger',
                message,
                serviceName: 'test-service',
                timestamp: 'doesnotmatter',
            },
            truncateLimit,
            truncatedText,
        )
        expect(logEntry.message).toBe(expectedLogMessage)
    },
)
