import { BigNumber } from "ethers";

Object.defineProperties(BigNumber.prototype, {
  toJSON: {
    value: function (this: BigNumber) {
      return this.toString();
    },
  },
});

export type ResponseOptions = {
  statusCode: number;
  body: {
    [key: string]: any;
  };
  headers?: {
    [key: string]: any;
  };
  maxAge?: number;
  replacer?: (key: string, value: any) => any;
};

export type Response = {
  statusCode: number;
  body: string;
  headers: {
    [key: string]: any;
  };
};

function defaultReplacer(_key: string, value: any) {
  return value;
}

export function response({
  statusCode,
  body,
  headers,
  maxAge,
  replacer = defaultReplacer,
}: ResponseOptions) {
  const response: Response = {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      ...headers,
    },
    body: JSON.stringify(body, replacer),
  };

  if (maxAge !== undefined) {
    response.headers["Cache-Control"] = `max-age=${maxAge}`;
  }

  return response;
}

export function success(
  body: ResponseOptions["body"],
  options?: Partial<ResponseOptions>
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
