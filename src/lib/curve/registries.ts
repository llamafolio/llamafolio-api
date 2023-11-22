import type { BaseContext } from '@lib/adapter'
import type { Chain } from '@lib/chains'

const chainId = (chain: Chain) => (chain === 'gnosis' ? 'xdai' : chain)

export async function getCurveRegistriesIds(ctx: BaseContext) {
  const API_URL = 'https://api.curve.fi/api/getPlatforms'
  const { data } = await fetch(API_URL).then((res) => res.json())

  return data.platforms[chainId(ctx.chain)]
}
