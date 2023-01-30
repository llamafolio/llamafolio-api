import { badRequest, success } from '@handlers/response'
import { replaceDomains } from '@lib/replaceDomains/replaceDomains'
import { searchLabel } from '@llamafolio/labels'
import { APIGatewayProxyHandler } from 'aws-lambda'

const normalizeQuery = (query: string) => {
  return replaceDomains(query)
    .replace(/^https?:\/\//, '')
    .replace(/\//g, '')
    .replace('twitter', '')
    .trim()
    .toLowerCase()
}

/**
 * Search for an address by label
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const searchTerm = normalizeQuery(event.queryStringParameters?.query || '')

  if (searchTerm.length < 3) {
    return badRequest('The search query is too short')
  }

  const searchResult = searchLabel(searchTerm)

  return success({
    data: searchResult,
  })
}
