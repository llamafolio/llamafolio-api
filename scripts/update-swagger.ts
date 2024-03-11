#!/usr/bin/env bun

import '@environment'

import childProcess from 'node:child_process'
import fs from 'node:fs'
import process from 'node:process'

const outputPath = './docs/swagger/swagger.json'

function main(STAGE: 'dev' | 'prod' = 'prod') {
  const environmentVariable = `AWS_GATEWAY_API_ID_${STAGE.toUpperCase()}`
  const apigatewayCommand = [
    'aws',
    'apigatewayv2',
    'export-api',
    `--api-id='${process.env[environmentVariable]}'`,
    `--output-type='JSON'`,
    `--specification='OAS30'`,
    `'${outputPath}'`,
    '&&',
    'cat',
    `'${outputPath}'`,
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
    info: { title: 'LlamaFolio API', version },
    servers: [
      {
        url: 'https://api.llamafolio.com',
        description: 'LlamaFolio API (production)',
        variables: { basePath: { default: '' } },
      },
    ],
    paths: sanitizedPaths,
  }
  fs.writeFileSync(outputPath, JSON.stringify(jsonSwagger, undefined, 2))
}

;(() => {
  try {
    const stage = process.argv[2] as 'dev' | 'prod'
    main(stage)
  } catch {
    console.log('ops')
    process.exit(1)
  }
})()

process.exit(0)
