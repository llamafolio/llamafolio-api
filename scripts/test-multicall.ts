import '../environment'

import type { BaseContext } from '@lib/adapter'
import { call } from '@lib/call'
import { abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

async function main() {
  const ctx: BaseContext = { chain: 'ethereum', adapterId: '' }
  // NOTE: Multicall3 deployed at 14_353_601
  const beforeMulticall3Ctx: BaseContext = { chain: 'ethereum', adapterId: '', blockNumber: 14_353_600 }

  const [symbol0A] = await multicall({
    ctx: beforeMulticall3Ctx,
    abi: abi.symbol,
    calls: [
      {
        // USDT, deployed long before Multicall3
        target: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      },
    ],
  })

  const [symbol0B] = await multicall({
    ctx: ctx,
    abi: abi.symbol,
    calls: [
      {
        // USDT, deployed long before Multicall3
        target: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      },
    ],
  })

  const symbol0C = await call({
    ctx,
    abi: abi.symbol,
    target: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  })

  console.log(symbol0A.output)
  console.log(symbol0B.output)
  console.log(symbol0C)
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
