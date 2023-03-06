import { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getHomoraBalances } from '../common/balance'
import { getPoolsContract } from '../common/contract'

const pools = [
  '0x21C630B7824D15BcDFeefA73CBd4e49cAfe9F836', // AVAX
  '0x858D6353A52c25C53Df1869230282d22b41f5790', // USDT.e
  '0xD3843b60e69f958eF93BeC299467e6Ed301CbEeB', // USDC.e
  '0xf9EB24B83B51fBC0Bcb1204221c8C9f1Cef33994', // WETH.e
  '0x69491FD9a6D9e32f32113cC076B1B69D8B9EBD3F', // DAI.e
  '0x1DE90c0cE3D940412C3Ba7322a257F7BDcC00ceB', // WBTC.e
  '0x377da1791e2225740599a3c447c50861f7b27f49', // MIM
  '0xA0b8aDC61e76e2b3961EB66e2E37840e02053591', // USDC
  '0x79eF2aE6027Feb0342DC9956814C300666705EB3', // Alpha.e
  '0xe13B4e4d0B3648770D625DcfD7bd4f96b3Cac479', // UST.axl
  '0xAaFa80367975DaD6f5243382f26D2EAB978973Fe', // LINK
  '0xD79d48841626c96aD6804a9AE0A1542568D5197C', // UST.wh
  '0xd25c2adCC025ddaF6c02e24DfDDB779aC7a540A3', // USDT
]

export const getContracts = async (ctx: BaseContext) => {
  const contracts = await getPoolsContract(ctx, pools)

  return {
    contracts: { contracts },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    contracts: getHomoraBalances,
  })

  return {
    balances,
  }
}
