import { execSync } from 'node:child_process'

// TODO: infer paths from imports or fs
const adaptersPaths = [
  'aave/v2',
  'aave/v3',
  'abracadabra',
  'alpaca-finance',
  'apeswap-amm',
  'apeswap-lending',
  'arrakis',
  'atlas-usv',
  'benqi-lending',
  'benqi-staked-avax',
  'compound/v2',
  'compound/v3',
  'concentrator',
  'convex',
  'curve',
  'euler',
  'floor-dao',
  'fraxlend',
  'geist',
  'gmx',
  'granary-finance',
  'hector-network',
  'hex',
  'hundred-finance',
  'inverse-finance',
  'iron-bank',
  'klima-dao',
  'lido',
  'life-dao',
  'liquity',
  'looksrare',
  'lusd-chickenbonds',
  'makerdao',
  'nemesis-dao',
  'nexus-mutual',
  'olympus-dao',
  'pancakeswap',
  'pangolin',
  'radiant',
  'rocket-pool',
  'scream',
  'shibaswap',
  'spartacus',
  'spiritswap',
  'spookyswap',
  'spool',
  'stakewise',
  'stargate',
  'strike',
  'sushiswap',
  'synapse',
  'synthetix',
  'templedao',
  'traderjoe',
  'truefi',
  'uniswap',
  'uwu-lend',
  'valas',
  'vector',
  'venus',
  'wallet',
  'wepiggy',
  'wonderland',
  'yearn-finance',
]

/**
 * Revalidate contracts of all adapters
 */
async function main() {
  // argv[0]: ts-node
  // argv[1]: revalidate-all-contracts.ts

  // TODO: spawn child processes
  for (const adapterPath of adaptersPaths) {
    console.log(`Revalidate contracts ${adapterPath}`)
    try {
      const stdout = execSync(`npm run revalidate-contracts ${adapterPath}`, {})
      console.log(stdout.toString())
    } catch (err) {
      console.error(err)
    }
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
