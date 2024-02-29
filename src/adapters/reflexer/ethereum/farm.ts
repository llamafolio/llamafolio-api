import type { Balance, BalancesContext, BorrowBalance, LendBalance } from '@lib/adapter'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'
import request, { gql } from 'graphql-request'

const WETH: Token = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const RAI: Token = {
  chain: 'ethereum',
  address: '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919',
  decimals: 18,
  symbol: 'RAI',
}

interface ReflexerLendBalancesParams extends LendBalance {
  proxy: `0x${string}`
  safe: { safeHandler: `0x${string}`; safeId: number }
}

interface ReflexerBorrowBalancesParams extends BorrowBalance {
  proxy: `0x${string}`
  safe: { safeHandler: `0x${string}`; safeId: number }
}

const url = 'https://api.thegraph.com/subgraphs/name/reflexer-labs/rai-mainnet'

export async function getReflexerFarmBalancesWithProxies(ctx: BalancesContext): Promise<Balance[] | undefined> {
  const query = gql`
    query proxies {
      user(id: "${ctx.address}") {
        id
        proxies {
          id
        }
        safes {
          safeHandler
          safeId
          debt
          collateral
        }
      }
    }
  `

  const { user }: any = await request(url, query)
  if (isNotNullish(user)) {
    return user.safes.flatMap((safe: any) => {
      const { safeHandler, safeId, collateral, debt } = safe

      const lend: ReflexerLendBalancesParams = {
        chain: 'ethereum',
        address: WETH.address,
        proxy: user.proxies[0].id,
        safe: { safeHandler, safeId },
        amount: BigInt(Math.round(collateral * Math.pow(10, WETH.decimals))),
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const borrow: ReflexerBorrowBalancesParams = {
        chain: 'ethereum',
        address: RAI.address,
        proxy: user.proxies[0].id,
        safe: { safeHandler, safeId },
        amount: BigInt(Math.round(debt * Math.pow(10, RAI.decimals))),
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return [lend, borrow]
    })
  }
}
