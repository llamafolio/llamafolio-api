import type { BaseContext, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'

import { getHomoraBalances } from '../common/balance'
import { getPoolsContract } from '../common/contract'

const pools = [
  '0xfFE5030Da862Ff61aeF933303C3d124Ca3C65AF6', //  FTM
  '0x5196e0a4fb2A459856e1D41Ab4975316BbdF19F8', // USDC
  '0xa575163C0DA0bEc6887b5BC01be7231FA7Cb2c0b', // ETH
  '0x49991481A9Ab4A3e2C42c7787F1bF51FC8bB0561', // FUSDT
  '0xC4fe42313fF313CD4F858c4E796fe0d4931198C1', // BTC
  '0x0F431a00FaB97F38E223B556B116CaaC97d73838', // DAI
  '0x2a479730f40963036f40b27C035d1fB78EADBfC7', // LINK
  '0x4580371d0525B66b1c29e825E648B39A3AA0301e', // MIM
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
    groups: [{ balances }],
  }
}
