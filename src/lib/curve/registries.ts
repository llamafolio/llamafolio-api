import type { BaseContext } from '@lib/adapter'

export async function getCurveRegistriesIds(ctx: BaseContext) {
  const API_URL = 'https://api.curve.fi/api/getPlatforms'
  const { data } = await fetch(API_URL).then((res) => res.json())

  return data.platforms[ctx.chain]
}
