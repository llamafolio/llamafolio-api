export type ResponseOptions = {
  statusCode: number;
  body: {
    [key: string]: any;
  };
  headers?: {
    [key: string]: any;
  };
  maxAge?: number;
};

export type Response = {
  statusCode: number;
  body: string;
  headers: {
    [key: string]: any;
  };
};

export function response({
  statusCode,
  body,
  headers,
  maxAge,
}: ResponseOptions) {
  const response: Response = {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...headers,
    },
    body: JSON.stringify(body),
  };

  if (maxAge !== undefined) {
    response.headers["Cache-Control"] = `max-age=${maxAge}`;
  }

  return response;
}

export function success(
  body: ResponseOptions["body"],
  options?: ResponseOptions
) {
  return response({
    ...options,
    body,
    statusCode: 200,
  });
}

export function badRequest(message: string) {
  return response({
    statusCode: 400,
    body: { message },
  });
}

export function notFound(message?: string) {
  return response({
    statusCode: 404,
    body: { message },
  });
}

export function serverError(message: string) {
  return response({
    statusCode: 500,
    body: { message },
  });
}
