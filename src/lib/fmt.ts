import { isHex } from '@lib/contract'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function isCharNumeric(char: string) {
  return /\d/.test(char)
}

export function shortAddress(address?: string) {
  return address?.slice(0, 10)
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

export function fromAddresses(addresses: `0x${string}`[]) {
  return addresses
    .map((address) => address.toLowerCase())
    .sort()
    .join(',')
}

/**
 * Parse address
 * @param str
 */
export function parseAddress(str: string) {
  return isHex(str) ? (str.toLowerCase() as `0x${string}`) : null
}

/**
 * Parse comma separated addresses
 * @param str
 */
export function parseAddresses(str: string) {
  return str
    .split(',')
    .filter(isHex)
    .map((address) => address.toLowerCase() as `0x${string}`)
    .sort()
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
  return dayjs.utc(date, 'YYYY-MM-DD HH:mm:ss').unix()
}

export function unixFromDate(date: Date) {
  return Math.floor(date.getTime() / 1000)
}
