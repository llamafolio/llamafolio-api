export interface Root {
  org: string
  app: string
  service: string
  package: Package
  frameworkVersion: string
  provider: Provider
  functions: Functions
  custom: Custom
  resources: string[]
  plugins: string[]
}

export interface Custom {
  stage: string
  esbuild: Esbuild
  prune: Prune
  tableName: string
}

export interface Esbuild {
  bundle: boolean
  minify: boolean
  keepNames: boolean
  concurrency: number
  external: string[]
  watch: Watch
}

export interface Watch {
  pattern: string[]
  ignore: string[]
}

export interface Prune {
  automatic: boolean
  number: number
}

export interface Functions {
  getAdapters: GetAdapters
  getAdaptersContracts: GetAdapters
  getBalances: GetAdapters
  getBalancesTokens: GetAdapters
  getCategories: GetAdapters
  getContracts: GetAdapters
  getGasPriceChart: GetAdapters
  getHistory: GetAdapters
  getInfoStats: GetAdapters
  getLabels: GetAdapters
  getProtocols: GetAdapters
  getLatestProtocols: GetAdapters
  getLatestSnapshot: GetAdapters
  getSyncStatus: GetAdapters
  getTokens: GetAdapters
  getTokenHolders: GetAdapters
  scheduledRevalidateAdaptersContracts: Scheduled
  scheduledUpdateProtocols: Scheduled
  scheduledUpdateYields: Scheduled
  revalidateAdapterContracts: RevalidateAdapterContracts
  updateYields: GetAdapters
  updateBalances: GetAdapters
}

export interface GetAdapters {
  handler: string
  description: string
  events?: GetAdaptersEvent[]
  timeout?: number
}

export interface GetAdaptersEvent {
  httpApi: EventHTTPAPI
}

export interface EventHTTPAPI {
  method: Method
  path: string
}

export enum Method {
  Get = 'get',
}

export interface RevalidateAdapterContracts {
  handler: string
  description: string
}

export interface Scheduled {
  handler: string
  description: string
  events: ScheduledRevalidateAdaptersContractsEvent[]
}

export interface ScheduledRevalidateAdaptersContractsEvent {
  schedule: string
}

export interface Package {
  individually: boolean
}

export interface Provider {
  name: string
  runtime: string
  stage: string
  region: string
  tracing: Tracing
  memorySize: number
  iam: Iam
  environment: Environment
  httpApi: ProviderHTTPAPI
}

export interface Environment {
  INDEXER_ADMIN_TOKEN: string
  PGHOST: string
  PGUSER: string
  PGDATABASE: string
  PGPASSWORD: string
  PGPORT: string
  REDIS_PORT: string
  REDIS_HOST: string
  REDIS_PASSWORD: string
  stage: string
  tableName: string
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: number
  CUSTOM_PROVIDER: string
  LLAMANODES_API_KEY: string
  ARBITRUM_RPC: string
  OPTIMISM_RPC: string
}

export interface ProviderHTTPAPI {
  metrics: boolean
  cors: Cors
}

export interface Cors {
  allowedOrigins: string
  allowedHeaders: string[]
  allowedMethods: string[]
  maxAge: number
}

export interface Iam {
  role: Role
}

export interface Role {
  statements: Statement[]
}

export interface Statement {
  Effect: string
  Action: string[]
  Resource: ResourceElement[] | string
}

export interface ResourceElement {
  'Fn::GetAtt': string[]
}

export interface Tracing {
  apiGateway: boolean
  lambda: boolean
}
