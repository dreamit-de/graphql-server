/**
 * @deprecated Do not use this, Polynomial regular expression
 */
export const VARIABLES_IN_MESSAGE_REGEX = /got invalid value (.*); Field/gm

/**
 * Removes sensible information that might occur when
 * variables are used in log messages from the message.
 * @param {string} logMessage - The original log message
 * @returns {string} The sanitized message. Sensible parts will
 * be overwritten with the text REMOVED BY SANITIZER
 */
export function sanitizeMessage(logMessage: string): string {
    if (
        logMessage.includes('got invalid value') &&
        logMessage.includes('; Field')
    ) {
        return (
            logMessage.slice(0, logMessage.indexOf('got invalid value') + 18) +
            'REMOVED BY SANITIZER' +
            logMessage.slice(logMessage.indexOf('; Field'))
        )
    }
    return logMessage
}
