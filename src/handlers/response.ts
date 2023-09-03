export interface ResponseOptions {
  statusCode: number
  body: {
    [key: string]: any
  }
  headers?: {
    [key: string]: any
  }
  maxAge?: number
  swr?: number
  eTag?: string
  replacer?: (key: string, value: any) => any
}

export interface Response {
  statusCode: number
  body: string
  headers: {
    [key: string]: any
  }
}

function defaultReplacer(_key: string, value: any) {
  return value
}

export function response({
  statusCode,
  body,
  headers,
  maxAge,
  swr,
  eTag,
  replacer = defaultReplacer,
}: ResponseOptions) {
  const response: Response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,GET',
      ...headers,
    },
    body: JSON.stringify(body, replacer),
  }

  if (maxAge !== undefined) {
    response.headers['Cache-Control'] = `max-age=${maxAge}`

    if (swr !== undefined) {
      response.headers['Cache-Control'] += `, stale-while-revalidate=${swr}`
    }
  }

  if (eTag !== undefined) {
    response.headers['ETag'] = eTag
  }

  return response
}

export function success(body: ResponseOptions['body'], options?: Partial<ResponseOptions>) {
  return response({
    ...options,
    body,
    statusCode: 200,
  })
}

export function badRequest(message: string) {
  return response({
    statusCode: 400,
    body: { message },
  })
}

export function notFound(message?: string, options?: Partial<ResponseOptions>) {
  return response({
    ...options,
    statusCode: 404,
    body: { message },
  })
}

export function serverError(message: string) {
  return response({
    statusCode: 500,
    body: { message },
  })
}
