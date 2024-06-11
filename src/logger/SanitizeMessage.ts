export const VARIABLES_IN_MESSAGE_REGEX: RegExp = new RegExp(
    /got invalid value (.*); Field/gm,
)

/**
 * Removes sensible information that might occur when
 * variables are used in log messages from the message.
 * @param {string} logMessage - The original log message
 * @returns {string} The sanitized message. Sensible parts will
 * be overwritten with the text REMOVED BY SANITIZER
 */
export function sanitizeMessage(logMessage: string): string {
    const foundVariable = VARIABLES_IN_MESSAGE_REGEX.exec(logMessage)
    if (!foundVariable) return logMessage

    /**
     * RegExp.exec stores the full found match in foundVariable[0] and the found group
     * in foundVariable[1]. As we only want to replace the group, i.e. the full variable input, we
     * use foundVariable[1] to be replaced with 'REMOVED BY SANITIZER'
     */
    return logMessage.replace(foundVariable[1], 'REMOVED BY SANITIZER')
}
