import { isNotFalsy } from '@lib/type'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function isCharNumeric(char: string) {
  return /\d/.test(char)
}

export function slugify(adapter: string) {
  const slug = adapter
    .split(/[-,.]+/)
    .map((part, idx) => (idx > 0 ? capitalize(part) : part))
    .join('')

  return isCharNumeric(slug[0]) ? `_${slug}` : slug
}

export function boolean(val: any): boolean {
  switch (val) {
    case 0:
    case 'n':
    case 'N':
    case 'no':
      return false

    case 1:
    case 'y':
    case 'Y':
    case 'yes':
      return true

    default:
      return Boolean(val)
  }
}

export function millify(amount: number): string {
  const quantifiers = [
    [10 ** 9, 'B'],
    [10 ** 6, 'M'],
    [10 ** 3, 'k'],
  ] as [number, string][]

  for (const [denominator, letter] of quantifiers) {
    if (amount > denominator) {
      return `${+(amount / denominator).toFixed(2)} ${letter}`
    }
  }

  return amount.toFixed(2)
}

export function millifyBI(amount: bigint): string {
  return millify(Number(amount))
}

/**
 * parse stringified JSON, removing newlines and tabs
 * if it fails to parse, return the original string
 */
export function parseStringJSON(jsonString: string) {
  try {
    if (!isNotFalsy(jsonString)) return jsonString
    return JSON.parse(jsonString.replaceAll(/[\n\\\n\r\t\\\\]/g, ''))
  } catch (error) {
    console.error('Failed to parse JSON', { string: jsonString })
    return jsonString
  }
}

export function toStartOfDay(date: Date) {
  const newDate = new Date(date)
  newDate.setUTCHours(0, 0, 0, 0)
  return newDate
}

export function toNextDay(date: Date) {
  const newDate = new Date(date)
  newDate.setDate(newDate.getDate() + 1)
  return newDate
}

/**
 * format Date to Clickhouse compatible DateTime
 */
export function toDateTime(date: Date) {
  return dayjs(date).utc().format('YYYY-MM-DD HH:mm:ss')
}

/**
 * @param timestamp in sec
 */
export function unixToDateTime(timestamp: number) {
  return toDateTime(new Date(timestamp * 1000))
}

export function fromDateTime(date: string) {
  return dayjs.utc(date, 'YYYY-MM-DD HH:mm:ss').toDate()
}

export function unixFromDateTime(date: string) {
  return dayjs(date, 'YYYY-MM-DD HH:mm:ss').unix()
}

export function unixFromDate(date: Date) {
  return Math.floor(date.getTime() / 1000)
}
