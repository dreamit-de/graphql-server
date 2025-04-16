/**
 * Removes sensible information that might occur when
 * variables are used in log messages from the message.
 * @param {string} logMessage - The original log message
 * @returns {string} The sanitized message. Sensible parts will
 * be overwritten with the text REMOVED BY SANITIZER
 */
function sanitizeMessage(logMessage: string): string {
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

export { sanitizeMessage }
