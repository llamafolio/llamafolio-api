import { raise } from '@lib/error'
import type { Json } from '@lib/type'

/** this function fetches the schema of any public GraphQL endpoint */
export async function fetchGraphQLSchema(url: string): Promise<Json> {
  const response = await fetcher<Json>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:
        'query IntrospectionQuery { __schema { queryType { name } mutationType { name } subscriptionType { name } types { ...FullType } directives { name description locations args { ...InputValue } } } } fragment FullType on __Type { kind name description fields(includeDeprecated: true) { name description args { ...InputValue } type { ...TypeRef } isDeprecated deprecationReason } inputFields { ...InputValue } interfaces { ...TypeRef } enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason } possibleTypes { ...TypeRef } } fragment InputValue on __InputValue { name description type { ...TypeRef } defaultValue } fragment TypeRef on __Type { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } } } }',
      variables: {},
    }),
  })
  return response
}

export async function fetcher<T>(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options?.headers },
  })
  if (!response.ok) {
    raise(`\n ${response.status} - Failed to fetch from ${url}:\n ${response.statusText}\n ${await response.text()}\n`)
  }
  const data = (await response.json()) as T
  return data
}

export function urlSearchParams(params: Record<string, string | number | boolean | undefined | null>) {
  return new URLSearchParams(
    JSON.parse(
      JSON.stringify({
        ...params,
      }),
    ),
  )
}

export async function paginatedFetch<T, R>({
  fn,
  iterations,
  initialParams,
  pageKeyProp,
}: {
  fn: (params: T) => Promise<R>
  iterations: number
  initialParams: T
  pageKeyProp?: keyof T & keyof R
}) {
  const params = { ...initialParams }
  const results: R[] = []

  for (let index = 0; index < iterations; index++) {
    const data = await fn(params)
    results.push(data)

    if (!pageKeyProp || !data[pageKeyProp]) break

    params[pageKeyProp] = data[pageKeyProp] as unknown as any
  }
  return results
}
