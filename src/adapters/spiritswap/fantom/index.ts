import { getMasterChefPoolsBalances } from '@adapters/sushiswap/ethereum/masterchef'
import { BalancesContext, BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { Token } from '@lib/token'
import { getPairsContracts, Pair } from '@lib/uniswap/v2/factory'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

import { getGaugesBalances, getLockerBalances } from './balance'

const spirit: Token = {
  chain: 'fantom',
  address: '0x5cc61a78f164885776aa610fb0fe1257df78e59b',
  symbol: 'SPIRIT',
  decimals: 18,
}

const locker: Contract = {
  name: 'inSpirit Token',
  chain: 'fantom',
  address: '0x2fbff41a9efaeae77538bd63f1ea489494acdc08',
  symbol: 'inSpirit',
  decimals: 18,
  underlyings: [spirit],
}

const gaugeController: Contract = {
  name: 'Spiritswap GaugeController',
  chain: 'fantom',
  address: '0x420b17f69618610DE18caCd1499460EFb29e1d8f',
}

const masterChef: Contract = {
  name: 'masterChef',
  displayName: 'MasterChef',
  chain: 'fantom',
  address: '0x9083ea3756bde6ee6f27a6e996806fbd37f6f093',
}

export const getContracts = async (ctx: BaseContext, props: any) => {
  const offset = props.pairOffset || 0
  const limit = 100

  const { pairs, allPairsLength } = await getPairsContracts({
    ctx,
    factoryAddress: '0xef45d134b73241eda7703fa787148d9c9f4950b0',
    offset,
    limit,
  })

  return {
    contracts: { locker, masterChef, spirit, gaugeController, pairs },
    revalidate: 60 * 60,
    revalidateProps: {
      pairOffset: Math.min(offset + limit, allPairsLength),
    },
  }
}

function getSpiritswapBalances(ctx: BalancesContext, pairs: Pair[], masterchef: Contract, rewardToken: Token) {
  return Promise.all([
    getPairsBalances(ctx, pairs),
    getGaugesBalances(ctx, pairs, gaugeController),
    getMasterChefPoolsBalances(ctx, pairs, masterchef, rewardToken),
  ])
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx: BalancesContext, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: (...args) => getSpiritswapBalances(...args, masterChef, spirit),
    locker: getLockerBalances,
  })

  return {
    balances,
  }
}
