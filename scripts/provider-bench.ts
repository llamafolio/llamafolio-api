import '../environment'

import { chains as tokensByChain } from '@llamafolio/tokens'

import { BaseContext } from '../src/lib/adapter'
import { call } from '../src/lib/call'
import { abi as erc20Abi } from '../src/lib/erc20'

async function main() {
  // argv[0]: ts-node
  // argv[1]: provider-bench.ts
  // argv[2]: ?chain

  try {
    const chain = process.argv[2] || 'ethereum'
    const ctx: BaseContext = { chain, adapterId: '' }

    const tokens = tokensByChain[ctx.chain]
      .map((token) => token.address)
      .filter((address) => address !== '0x0000000000000000000000000000000000000000')

    const length = tokens.length

    for (let i = 0; i < 100; i++) {
      const hrstart = process.hrtime()

      const responses = await Promise.all(
        tokens.map((address) =>
          call({
            ctx,
            abi: erc20Abi.balanceOf,
            target: address,
            params: ['0x0000000000000000000000000000000000000000'],
          }),
        ),
      )

      const hrend = process.hrtime(hrstart)

      const errors = responses.reduce((acc, res) => acc + (res.output == null ? 1 : 0), 0)

      console.log(`Fetched ${length} balances, found ${errors} errors in %ds %dms`, hrend[0], hrend[1] / 1000000)
    }
  } catch (e) {
    console.log('Failed', e)
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
