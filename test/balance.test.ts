import { userBalancesWithRetry } from '@lib/erc20'
import type { Token } from '@lib/token'
import { chains as tokensByChain } from '@llamafolio/tokens'

main().catch(console.error)

async function main() {
  const chain = 'ethereum'
  const balances = await userBalancesWithRetry({
    chain,
    address: '0xbDfA4f4492dD7b7Cf211209C4791AF8d52BF5c50',
    tokens: tokensByChain[chain] as unknown as Token[],
  })

  console.log(balances, balances.length)
}
