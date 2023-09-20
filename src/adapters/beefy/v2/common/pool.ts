import type { BaseContext, Contract } from '@lib/adapter'
import { isNotNullish } from '@lib/type'

const NATIVE: Record<string, string> = {
  ethereum: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
}

export async function getBeefyPools(ctx: BaseContext): Promise<Contract[]> {
  const API_URL = `https://databarn.beefy.com/api/v1/beefy/product/${ctx.chain}?include_eol=false`
  const vaults: any[] = await fetch(API_URL).then((response) => response.json())

  const pools: Contract[] = vaults
    .map(({ productData }) => {
      if (!productData?.vault) return null

      const {
        chain,
        token_name,
        token_decimals,
        contract_address,
        want_address,
        assets,
        protocol,
        want_price_feed_key,
      } = productData.vault
      return {
        chain,
        address: contract_address,
        decimals: token_decimals,
        symbol: token_name,
        lpToken: want_address,
        underlyings: assets,
        beefyKey: want_price_feed_key,
        protocol,
      }
    })
    .filter(isNotNullish)

  return getBeefyUnderlyings(ctx, pools)
}

async function getBeefyUnderlyings(ctx: BaseContext, pools: Contract[]): Promise<Contract[]> {
  const API_URL = `https://api.beefy.finance/tokens/${ctx.chain}`
  const tokens = await fetch(API_URL).then((response) => response.json())

  for (const pool of pools) {
    const { underlyings } = pool

    if (!underlyings) continue

    for (let i = 0; i < underlyings.length; i++) {
      const underlying = underlyings[i] as string
      const token = tokens[underlying]
      if (token) {
        const { chainId, address, symbol, decimals } = token
        const fmtAddress = address === 'native' ? NATIVE[ctx.chain] : address

        underlyings[i] = { chain: chainId, address: fmtAddress, symbol, decimals }
      }
    }
  }

  return pools
}
