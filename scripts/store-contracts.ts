import path from 'node:path'
import url from 'node:url'

import type { Adapter, BaseContext, Contract } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { resolveContractsTokens } from '@lib/token'
import fs from 'fs'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function help() {
  console.log('pnpm run store-contracts {adapter} {chain}')
}

async function main() {
  // argv[0]: node_modules/.bin/tsx
  // argv[1]: run-store-contracts.ts
  // argv[2]: adapter
  // argv[3]: chain
  if (process.argv.length < 4) {
    console.error('Missing arguments')
    return help()
  }

  const startTime = Date.now()

  const adapterId = process.argv[2]
  const chain = process.argv[3] as Chain

  const ctx: BaseContext = { chain, adapterId }

  try {
    const module = await import(path.join(__dirname, '..', 'src', 'adapters', adapterId))
    const adapter = module.default as Adapter

    const chainAdapter = adapter[chain]
    if (!chainAdapter) {
      return console.error(`Chain ${chain} not supported for adapter ${adapterId}.`)
    }

    const contractsRes = await chainAdapter.getContracts(ctx, {})
    const contracts = await resolveContractsTokens(ctx, contractsRes?.contracts || {})

    let allContracts: any = []

    for (const key in contracts) {
      if (Array.isArray(contracts[key])) {
        allContracts = allContracts.concat(contracts[key])
      } else {
        allContracts.push(contracts[key])
      }
    }

    const data = JSON.stringify(groupAndCountContracts(allContracts), null, 2)
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.writeFileSync(path.join(__dirname, '..', 'src', 'adapters', adapterId, chain, 'contracts.json'), data)

    const endTime = Date.now()
    console.log(`Contracts saved successfully in ${endTime - startTime}ms`)
  } catch (error) {
    console.log('Failed to run adapter', error)
  }
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })

function groupAndCountContracts(contracts: Contract[]) {
  return contracts.reduce((acc: any, contract) => {
    const contractType = contract.type || 'unknown'
    if (!acc[contractType]) {
      acc[contractType] = { count: 0, data: [] }
    }
    acc[contractType].data.push(contract)
    acc[contractType].count++
    return acc
  }, {})
}
