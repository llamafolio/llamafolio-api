#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

import YAML from 'yaml'

/**
 * Parses `serverless.yml` and returns JSON.
 * Only routes are supported for now and only for httpApi.
 * to run from cli and call the function:
 * ```sh
 * tsx --eval "console.log(require('./scripts/parse-serverless-yaml').parsedYAML())" routes
 * # or
 * tsx --eval "console.log(require('./scripts/parse-serverless-yaml').default())"
 * ```
 */

export function parsedYAML(target = process.argv[2] ?? 'routes') {
  try {
    const serverlessYmlFile = path.resolve(process.cwd(), 'serverless.yml')
    const serverless = YAML.parse(fs.readFileSync(serverlessYmlFile, 'utf8')) as Serverless
    if (target !== 'routes') {
      console.info('Not implemented yet. Only routes are supported.')
      return [] as Array<Route>
    }
    const routes = Object.entries(serverless.functions)
      .map(([, properties]) => {
        // TODO: handle if not httpApi
        if (!properties.events?.[0]?.httpApi) return
        const [
          {
            httpApi: { method, path },
          },
        ] = properties.events
        const pathParams = path.match(/{([^}]+)}/g)?.map((_) => _.slice(1, -1)) ?? []
        const queryParams = path.match(/\?([^}]+)}/g)?.map((_) => _.slice(1, -1)) ?? []
        return { method, path, pathParams, queryParams }
      })
      .filter(Boolean) as Array<Route>
    return routes.sort((a, b) => a.path.localeCompare(b.path))
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `Encoutered an error: ` + error
    console.error(errorMessage)
    throw error
  }
}

export default parsedYAML

interface Route {
  method: string
  path: string
  pathParams: Array<string>
  queryParams: Array<string>
}

/** Generated from https://transform.tools/json-to-typescript */
interface Serverless {
  org: string
  app: string
  service: string
  package: {
    individually: boolean
  }
  frameworkVersion: string
  useDotenv: boolean
  provider: {
    name: string
    runtime: string
    stage: string
    region: string
    tracing: {
      apiGateway: boolean
      lambda: boolean
    }
    memorySize: number
    iam: {
      role: {
        statements: Array<{
          Effect: string
          Action: Array<string>
          Resource: any
        }>
      }
    }
    environment: {
      PGHOST: string
      PGUSER: string
      PGDATABASE: string
      PGPASSWORD: string
      PGPORT: string
      stage: string
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: number
      LLAMANODES_API_KEY: string
      ARBITRUM_RPC: string
      OPTIMISM_RPC: string
    }
    httpApi: {
      metrics: boolean
      cors: {
        allowedOrigins: string
        allowedHeaders: Array<string>
        allowedMethods: Array<string>
        maxAge: number
      }
    }
  }
  functions: {
    [key: string]: {
      handler: string
      description: string
      events: Array<{
        httpApi: {
          method: string
          path: string
        }
      }>
    }
  }
  custom: {
    stage: string
    esbuild: {
      config: string
      watch: {
        pattern: Array<string>
        ignore: Array<string>
      }
    }
    prune: {
      automatic: boolean
      number: number
    }
  }
  resources: Array<string>
  plugins: Array<string>
}
