import 'dotenv/config'

import environment from '@environment'
import { balancesHandler } from '@handlers/getBalancesTokens'

const STAGE = environment.STAGE as Exclude<typeof environment.STAGE, undefined>

main()
  .catch(console.error)
  .finally(() => process.exit(0))

async function main() {
  const balances = await balancesHandler({ address: '0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50' })
  // balances.chains
  console.log(balances)
  // console.log(JSON.stringify(balances, undefined, 2))
  // console.log(balances.chains.map((b) => b.balances.length))
  // console.log(sum(balances.chains.map((b) => b.balances.length)))
}
