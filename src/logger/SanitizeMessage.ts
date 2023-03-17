export const VARIABLES_IN_MESSAGE_REGEX = new RegExp(/got invalid value (.*); Field/gm)

/**
 * Removes sensible information that might occur when
 * variables are used in log messages from the message.
 * @param {string} logMessage - The original log message
 * @returns {string} The sanitized message. Sensible parts will
 * be overwritten with the text REMOVED BY SANITIZER
 */
export function sanitizeMessage(logMessage: string): string {
    let foundVariable
    if (logMessage && (foundVariable = VARIABLES_IN_MESSAGE_REGEX.exec(logMessage))) {
        return logMessage.replace(foundVariable[1], 'REMOVED BY SANITIZER')
    }
    return logMessage
}