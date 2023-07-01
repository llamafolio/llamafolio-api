import 'dotenv/config'

import { balancesHandler } from '@handlers/getBalancesTokens'
import { getAddress } from 'viem'

main()
  .catch(console.error)
  .finally(() => process.exit(0))

async function main() {
  const balances = await balancesHandler({
    address: getAddress(process.argv[2] || '0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50'),
  })
  console.log(balances)
  // console.log(JSON.stringify(balances, undefined, 2))
  // console.log(sum(balances.chains.map((b) => b.balances.length)))
}
