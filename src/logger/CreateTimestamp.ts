import { DateFunction, nowDateFunction } from '@dreamit/funpara'

/**
 * @deprecated Use createISOTimestamp instead
 */
function createTimestamp(date: Date = new Date()): string {
    return date.toISOString()
}

function createISOTimestamp(
    dateFunction: DateFunction = nowDateFunction(),
): string {
    return dateFunction().toISOString()
}

export { createISOTimestamp, createTimestamp }
