#!/usr/bin/env bun

import childProcess from 'node:child_process'
import fs from 'node:fs'
import process from 'node:process'

function main(STAGE: 'dev' | 'prod' = (process.argv[2] as 'dev' | 'prod') || 'dev') {
  const environmentVariable = `AWS_GATEWAY_API_ID_${STAGE.toUpperCase()}`
  const apigatewayCommand = [
    'aws',
    'apigatewayv2',
    'export-api',
    `--api-id='${process.env[environmentVariable]}'`,
    `--output-type='JSON'`,
    `--specification='OAS30'`,
    `'./swagger.json'`,
    '&&',
    'cat',
    `'swagger.json'`,
  ]
  const buffer = childProcess.execSync(apigatewayCommand.join(' '))
  const swaggerJSON = buffer.toString()
  cleanSwaggerJSON(JSON.parse(swaggerJSON))
}

function cleanSwaggerJSON(jsonData: any) {
  const {
    openapi,
    info: { version },
    paths,
  } = jsonData
  const sanitizedPaths = {}
  for (const path in paths) {
    //@ts-ignore
    sanitizedPaths[path] = {}
    //@ts-ignore
    for (const property in paths[path]) {
      if (['get', 'post', 'update', 'patch', 'delete'].includes(property)) {
        //@ts-ignore
        sanitizedPaths[path][property] = { responses: paths[path][property].responses }
      } else if (property === 'parameters') {
        //@ts-ignore
        sanitizedPaths[path][property] = paths[path][property]
      }
    }
  }
  const jsonSwagger = {
    openapi,
    info: { title: 'Llamafolio API', version },
    servers: [
      {
        url: 'https://api.llamafolio.com',
        description: 'Llamafolio API (production)',
        variables: { basePath: { default: '' } },
      },
    ],
    paths: sanitizedPaths,
  }
  fs.writeFileSync('./swagger.json', JSON.stringify(jsonSwagger, undefined, 2))
}

;(() => {
  try {
    main()
  } catch {
    console.log('ops')
    process.exit(1)
  }
})()

process.exit(0)
