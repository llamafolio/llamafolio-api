import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

import { chains } from '../src/lib/chains'

const exportsTemplate = (adapters: string[]) => `
${adapters.map((adapter) => `import ${slugify(adapter)} from '@adapters/${adapter}'`).join(';')}
import type { Adapter } from '@lib/adapter';


export const adapters: Adapter[] = [
  ${adapters.map((adapter) => slugify(adapter)).join(',')}
];

export const adapterById: { [key: string]: Adapter } = {};
for (const adapter of adapters) {
  adapterById[adapter.id] = adapter;
}

`

const vsCodeLaunchTemplate = (adapters: string[], chains: string[]) =>
  JSON.stringify({
    version: '0.2.0',
    configurations: [
      {
        type: 'node',
        request: 'launch',
        name: 'Run adapter',
        skipFiles: ['<node_internals>/**'],
        runtimeExecutable: 'npm',
        runtimeArgs: ['run', 'adapter', '${input:adapter}', '${input:chain}', '${input:address}'],
      },
      {
        type: 'node',
        request: 'launch',
        name: 'Run adapter balances',
        skipFiles: ['<node_internals>/**'],
        runtimeExecutable: 'npm',
        runtimeArgs: ['run', 'adapter-balances', '${input:adapter}', '${input:chain}', '${input:address}'],
      },
      {
        type: 'node',
        request: 'launch',
        name: 'Run update balances',
        skipFiles: ['<node_internals>/**'],
        runtimeExecutable: 'npm',
        runtimeArgs: ['run', 'update-balances', '${input:address}'],
      },
      {
        type: 'node',
        request: 'launch',
        name: 'Run revalidate contracts',
        skipFiles: ['<node_internals>/**'],
        runtimeExecutable: 'npm',
        runtimeArgs: ['run', 'revalidate-contracts', '${input:adapter}', '${input:chain}'],
      },
      {
        type: 'node',
        request: 'launch',
        name: 'Run revalidate contracts recursive',
        skipFiles: ['<node_internals>/**'],
        runtimeExecutable: 'npm',
        runtimeArgs: ['run', 'revalidate-contracts-rec', '${input:adapter}', '${input:chain}'],
      },
    ],
    inputs: [
      {
        type: 'pickString',
        id: 'chain',
        description: 'What chain?',
        options: chains,
        default: 'ethereum',
      },
      {
        type: 'pickString',
        id: 'adapter',
        description: 'What adapter to run?',
        options: adapters,
        default: 'curve',
      },
      {
        type: 'promptString',
        id: 'address',
        description: 'Address.',
        default: '0x0000000000000000000000000000000000000000',
      },
    ],
  })

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function isCharNumeric(char: string) {
  return /\d/.test(char)
}

function slugify(adapter: string) {
  const slug = adapter
    .split(/[-,.]+/)
    .map((part, idx) => (idx > 0 ? capitalize(part) : part))
    .join('')

  return isCharNumeric(slug[0]) ? `_${slug}` : slug
}

function getAdapters() {
  const src = path.join(__dirname, '..', 'src', 'adapters')

  const adapters: string[] = []

  fs.readdirSync(src).forEach(function (child) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    if (fs.existsSync(path.join(src, child, 'index.ts'))) {
      adapters.push(child)
    }
  })

  return adapters.sort()
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: build-adapters.ts

  const adapters = getAdapters()

  const src = path.join(__dirname, '..', 'src', 'adapters')
  const vsCodeSrc = path.join(__dirname, '..', '.vscode')

  fs.writeFileSync(path.join(src, 'index.ts'), exportsTemplate(adapters))

  fs.writeFileSync(
    path.join(vsCodeSrc, 'launch.json'),
    vsCodeLaunchTemplate(adapters, chains.map((chain) => chain.id).sort()),
  )

  // lint
  execSync('./node_modules/.bin/eslint --fix "./src/adapters/index.ts"')
  execSync('./node_modules/.bin/eslint --fix "./.vscode/launch.json"')
  // format
  execSync('./node_modules/.bin/prettier --ignore-path="./.eslintignore" "./src/adapters/index.ts" --write')
  execSync('./node_modules/.bin/prettier --ignore-path="./.eslintignore" "./.vscode/launch.json" --write')
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
