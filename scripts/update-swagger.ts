import 'dotenv/config'

import childProcess from 'node:child_process'

/**
 * Grab Swagger JSON from AWS API Gateway,
 * grab static HTML from Gist,
 * sync to S3 bucket.
 */
function main(STAGE: 'dev' | 'prod' = 'dev') {
  const environmentVariable = `AWS_GATEWAY_API_ID_${STAGE.toUpperCase()}`
  const apigatewayCommand = [
    'aws',
    'apigatewayv2',
    'export-api',
    `--api-id='${process.env[environmentVariable]}'`,
    `--output-type='JSON'`,
    `--specification='OAS30'`,
    `'./docs/swagger/swagger.json'`,
  ]
  childProcess.exec(apigatewayCommand.join(' '))
  const curlHtmlCommand = [
    'curl',
    '--silent',
    '--location',
    'https://gist.githubusercontent.com/o-az/36b94d57a8df23421f229a15b5ae7a10/raw/77000aac04a068b085917db982bbabd1e724262d/swagger-ui-index.html',
    '--output',
    './docs/swagger/index.html',
  ]
  childProcess.exec(curlHtmlCommand.join(' '))
  const s3Command = ['aws', 's3', 'sync', `./docs/swagger`, `s3://${process.env.AWS_S3_BUCKET_SWAGGER_UI}`]
  childProcess.exec(s3Command.join(' '))
}

try {
  main(process.argv[2] as 'dev' | 'prod')
} catch {
  console.log('ops')
}
