import path from 'node:path'
import { fileURLToPath } from 'node:url'

import environment from '@environment'
import { RewriteFrames } from '@sentry/integrations'
import * as Sentry from '@sentry/serverless'

/**
 * TODO: Remove when Sentry project is created online by @0xsign
 */
const SENTRY_PROJECT_EXISTS = false

if (SENTRY_PROJECT_EXISTS) {
  /**
   * Integration: AWS Lambda
   * @see https://docs.sentry.io/product/integrations/cloud-monitoring/aws-lambda/?original_referrer=https%3A%2F%2Fdocs.sentry.io%2Fproduct%2F%3Foriginal_referrer%3Dhttps%253A%252F%252Fhelp.sentry.io%252F
   */

  const _INFO = {
    // https://docs.sentry.io/platforms/node/guides/aws-lambda/layer/?original_referrer=https%3A%2F%2Fhelp.sentry.io%2F
    AWS_LAMBDA_LAYER_ARN: 'arn:aws:lambda:eu-central-1:943013980633:layer:SentryNodeServerlessSDK:132',
  }

  // TODO

  const SENTRY_DSN = 'TODO'

  Sentry.AWSLambda.init({
    dsn: SENTRY_DSN,
    environment: environment.NODE_ENV,
    debug: environment.NODE_ENV !== 'production',
    maxBreadcrumbs: 50,
    // We recommend adjusting this value in production, or using tracesSampler
    // for finer control
    tracesSampleRate: environment.NODE_ENV === 'production' ? 0.2 : 1.0,
    integrations: [
      new RewriteFrames({ root: global.__rootdir__ }),
      new Sentry.Integrations.LocalVariables({ captureAllExceptions: true }),
      // ...Sentry.(),
    ],
  })
}

/**
 * https://docs.sentry.io/platforms/node/typescript/?original_referrer=https%3A%2F%2Fhelp.sentry.io%2F#changing-events-frames
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url))
global.__rootdir__ = __dirname || process.cwd()

declare global {
  // eslint-disable-next-line no-var
  var __rootdir__: string
}
