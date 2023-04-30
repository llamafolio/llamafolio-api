interface TestExtraEnvironmentVariables {
  readonly AWS_GATEWAY_API_ID_DEV: string
  readonly AWS_GATEWAY_API_ID_PROD: string
  readonly TEST_WAIT_TIME: string
}

declare namespace NodeJS {
  interface ProcessEnv extends TestExtraEnvironmentVariables {}
}
