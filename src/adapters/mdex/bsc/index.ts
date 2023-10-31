import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { getMasterChefPoolsBalances, getMasterChefPoolsContracts } from '@lib/masterchef/newMasterchef'
import type { Token } from '@lib/token'

const MDX: Token = {
  chain: 'bsc',
  address: '0x9c65ab58d8d978db963e63f2bfb7121627e3a739',
  symbol: 'MDX',
  decimals: 18,
}

const masterChef: Contract = {
  chain: 'bsc',
  address: '0xc48fe252aa631017df253578b1405ea399728a50',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  // const offset = props.pairOffset || 0
  // const limit = 1980

  const test = await getMasterChefPoolsContracts(ctx, { masterChefAddress: masterChef.address })

  // const { pairs, allPairsLength } = await getPairsContracts({
  //   ctx,
  //   factoryAddress: '0x3CD1C46068dAEa5Ebb0d3f55F6915B10648062B8',
  //   offset,
  //   limit,
  // })

  return {
    contracts: {
      test,
      /* pairs, masterChef*/
    },
    revalidate: 60 * 60,
    // revalidateProps: {
    //   pairOffset: Math.min(offset + limit, allPairsLength),
    // },
  }
}

// function getMdexPairsBalances(
//   ctx: BalancesContext,
//   pairs: Pair[],
//   masterchef: Contract,
//   rewardToken: Token,
//   rewardTokenName?: string,
//   lpTokenAbi?: boolean,
// ) {
//   return Promise.all([
//     getPairsBalances(ctx, pairs),
//     getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken, rewardTokenName, lpTokenAbi),
//   ])
// }

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const test2 = await getMasterChefPoolsBalances(ctx, contracts.test || [], {
    masterChefAddress: '0xc48fe252aa631017df253578b1405ea399728a50',
    rewardToken: MDX,
  })

  // const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
  //   // pairs: (...args) => getMdexPairsBalances(...args, masterChef, MDX),
  // })

  return {
    groups: [{ balances: test2 }],
  }
}
