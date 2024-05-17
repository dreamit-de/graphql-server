import { DateFunction, nowDateFunction } from '@dreamit/funpara'

/**
 * @deprecated Use createISOTimestamp instead
 */
export function createTimestamp(date = new Date()): string {
    return date.toISOString()
}

export function createISOTimestamp(
    dateFunction: DateFunction = nowDateFunction(),
): string {
    return dateFunction().toISOString()
}
