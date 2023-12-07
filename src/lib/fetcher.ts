import { raise } from '@lib/error'

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
