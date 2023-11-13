import type { BaseContext, Contract } from '@lib/adapter'

export async function getRealTContracts(ctx: BaseContext): Promise<Contract[]> {
  const URL = 'https://api.realt.community/v1/token'
  const datas: any = await fetch(URL).then((res) => res.json())

  return datas
    .filter((data: any) => data.gnosisContract !== null && !data.shortName.includes('OLD'))
    .map((data: any) => {
      const { symbol, gnosisContract } = data

      return {
        chain: ctx.chain,
        address: gnosisContract,
        decimals: 18,
        symbol,
      }
    })
}
