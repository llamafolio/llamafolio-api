import { getAcrossContracts } from '@adapters/across/ethereum/v1/contract'
import { getAcrossBalances } from '@adapters/across/ethereum/v2/balance'
import { getAcrossV2Contracts } from '@adapters/across/ethereum/v2/contract'
import type { BaseContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getPairsBalances } from '@lib/uniswap/v2/pair'

const poolsAddresses: `0x${string}`[] = [
  '0x7355efc63ae731f584380a9838292c7046c1e433', // A-WETH-LP
  '0xdfe0ec39291e3b60aca122908f86809c9ee64e90', // A-UMA-LP
  '0x43f133fe6fdfa17c417695c476447dc2a449ba5b', // A-DAI-LP
  '0x43298f9f91a4545df64748e78a2c777c580573d6', // A-BADGER-LP
  '0x02fbb64517e1c6ed69a6faa3abf37db0482f1152', // A-WBTC-LP
  '0x256c8919ce1ab0e33974cf6aa9c71561ef3017b6', // A-USDC-LP
]

const manager: Contract = {
  chain: 'ethereum',
  address: '0xc186fA914353c44b2E33eBE05f21846F1048bEda',
}

const masterChef: Contract = {
  chain: 'ethereum',
  address: '0x9040e41ef5e8b281535a96d9a48acb8cfabd9a48',
}

export const getContracts = async (ctx: BaseContext) => {
  const [pairs, pools] = await Promise.all([
    getAcrossContracts(ctx, poolsAddresses),
    getAcrossV2Contracts(ctx, manager),
  ])

  return {
    contracts: { pairs, pools, manager },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    pairs: getPairsBalances,
    pools: (...args) => getAcrossBalances(...args, manager, masterChef),
  })

  return {
    groups: [{ balances }],
  }
}
