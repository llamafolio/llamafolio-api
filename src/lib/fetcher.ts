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

export default async function fetchWithRetry(
  url: string,
  { timeout, tries, ...options }: RequestInit & { timeout: number; tries: number } = { timeout: 5_000, tries: 3 },
): Promise<Response> {
  let response: Response
  let controller: AbortController

  for (let n = 0; n < tries; n++) {
    let timeoutID

    try {
      controller = new AbortController()

      timeoutID = setTimeout(() => {
        controller.abort() // break current loop
      }, timeout)

      response = await fetch(url, { ...options, signal: controller.signal })

      clearTimeout(timeoutID)
      return response
    } catch (error) {
      if (timeoutID) {
        clearTimeout(timeoutID)
      }

      if (!(error instanceof DOMException)) {
        // Only catch abort exceptions here. All the others must be handled outside this function.
        throw error
      }
    }
  }

  throw new Error(`Fetch timeout, tries: ${tries}`)
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
