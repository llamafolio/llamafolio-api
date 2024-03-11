/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

import { execSync } from 'node:child_process'

import { fromDefiLlamaChain } from '@lib/chains'
import { slugify } from '@lib/fmt'

interface ChainTvl {
  tvl: Array<{ date: number }>
}

interface Protocol {
  chainTvls: { [key: string]: ChainTvl }
}

interface ChainConfig {
  [key: string]: { startDate?: number }
}

const adapterTemplate = (slug: string, chains: string[]) => `
import type { Adapter } from '@lib/adapter';

${chains.map((chain) => `import * as ${slugify(chain)} from './${chain}'`).join(';\n')}

const adapter: Adapter = {
  id: '${slug}',
  ${chains.map((chain) => `'${chain}': ${slugify(chain)}`).join(',\n  ')}
};

export default adapter;
`

const chainTemplate = (startDate?: number) => `
import type { AdapterConfig, BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

export const getContracts = async (ctx: BaseContext) => {
  return {
    // Contracts grouped by keys. They will be passed to getBalances, filtered by user interaction
    contracts: {},
    // Optional revalidate time (in seconds).
    // Contracts returned by the adapter are cached by default and can be updated by interval with this parameter.
    // This is mostly used for Factory contracts, where the number of contracts deployed increases over time
    // revalidate: 60 * 60,
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  // Any method to check the contracts retrieved above (based on user interaction).
  // This function will be run each time a user queries his balances.
  // As static contracts info is filled in getContracts, this should ideally only fetch the current amount of each contract (+ underlyings and rewards)
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {})

  return {
    groups: [{ balances }],
  }
}

export const config: AdapterConfig = {
  startDate: ${startDate},
}

`

function help() {
  console.log('pnpm run update-adapter {adapter}')
}

async function updateAdapter(slug: string) {
  const dst = path.join(__dirname, '..', 'src', 'adapters', slug)
  if (!fs.existsSync(dst)) {
    console.error(`Adapter ${slug} does not exist. Please create it first.`)
    return
  }

  const protocolRes = await fetch(`https://api.llama.fi/protocol/${slug}`)
  const protocol: Protocol = await protocolRes.json()

  if (!protocol) {
    console.error(`Failed to update adapter: ${slug} doesn't exist on DefiLlama`)
    return
  }

  const existingChains = fs.readdirSync(dst).filter((file) => fs.statSync(path.join(dst, file)).isDirectory())
  const chainConfigs: ChainConfig = {}
  const addedChains: string[] = []

  Object.entries(protocol.chainTvls).forEach(([key, { tvl }]) => {
    if (!fromDefiLlamaChain[key]) return

    const chainName = fromDefiLlamaChain[key]
    const startDate = tvl?.[0]?.date

    chainConfigs[chainName] = {
      startDate: (Math.min(startDate) || Infinity, startDate),
    }

    if (!existingChains.includes(chainName)) {
      addedChains.push(chainName)
      const chainDir = path.join(dst, chainName)
      fs.mkdirSync(chainDir, { recursive: true })
      fs.writeFileSync(path.join(chainDir, 'index.ts'), chainTemplate(chainConfigs[chainName].startDate))
    }
  })

  const updatedChains = Object.keys(chainConfigs)
  fs.writeFileSync(path.join(dst, 'index.ts'), adapterTemplate(slug, updatedChains))

  execSync(`npx prettier --write '${dst}/**/*.{ts,js,json,md}'`)

  if (addedChains.length > 0) {
    console.log(`Adapter ${slug} updated successfully. Added new chains: ${addedChains.join(', ')}.`)
  } else {
    console.log(`Adapter ${slug} updated successfully. No new chains were added.`)
  }
}

async function main() {
  // argv[0]: node
  // argv[1]: script file path
  // argv[2]: adapter slug
  if (process.argv.length < 3) {
    console.error('Missing arguments')
    return help()
  }

  const slug = process.argv[2]
  await updateAdapter(slug)

  console.log(`Successfully updated adapter`)
  console.log('')
  console.log(`pnpm run adapter ${slug}`)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
