import type { AdapterConfig } from "@lib/adapter";import type { BalancesContext, Contract, GetBalancesHandler } from '@lib/adapter'
import { resolveBalances } from '@lib/balance'
import { getSingleStakeBalance } from '@lib/stake'
import type { Token } from '@lib/token'
import { ETH } from '@lib/token'

const abi = {
  getNodeRPLStake: {
    inputs: [{ internalType: 'address', name: '_nodeAddress', type: 'address' }],
    name: 'getNodeRPLStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getNodeActiveMinipoolCount: {
    inputs: [{ internalType: 'address', name: '_nodeAddress', type: 'address' }],
    name: 'getNodeActiveMinipoolCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
}

const rEth: Contract = {
  chain: 'ethereum',
  address: '0xae78736cd615f374d3085123a210448e74fc6393',
}

const RPL: Token = {
  chain: 'ethereum',
  address: '0xd33526068d116ce69f19a9ee46f0bd304f21a51f',
  symbol: 'RPL',
  decimals: 18,
  coingeckoId: 'rocket-pool',
}

const nodeStaking: Contract = {
  name: 'Staking',
  chain: 'ethereum',
  decimals: 18,
  symbol: 'RPL',
  address: '0x3019227b2b8493e45bf5d25302139c9a2713bf15',
  underlyings: [RPL],
}

const miniPoolManager: Contract = {
  name: 'Mini Pool Manager',
  chain: 'ethereum',
  address: '0x6293b8abc1f36afb22406be5f96d893072a8cf3a',
  decimals: 18,
  symbol: 'ETH',
  underlyings: [ETH],
}

function getNodeStakingBalance(ctx: BalancesContext, nodeStaking: Contract) {
  return getSingleStakeBalance(ctx, nodeStaking, {
    abi: abi.getNodeRPLStake,
  })
}

async function getMiniPoolManagerBalance(ctx: BalancesContext, miniPoolManager: Contract) {
  const balance = await getSingleStakeBalance(ctx, miniPoolManager, {
    abi: abi.getNodeActiveMinipoolCount,
  })

  // 16 ETH required (not 32)
  // See: https://rocketpool.net/#stake-run-node
  balance.amount = balance.amount * 16n * 10n ** 18n

  return balance
}

export const getContracts = () => {
  return {
    contracts: { miniPoolManager, nodeStaking, rEth },
  }
}

export const getBalances: GetBalancesHandler<typeof getContracts> = async (ctx, contracts) => {
  const balances = await resolveBalances<typeof getContracts>(ctx, contracts, {
    miniPoolManager: getMiniPoolManagerBalance,
    nodeStaking: getNodeStakingBalance,
    rEth: getSingleStakeBalance,
  })

  return {
    groups: [{ balances }],
  }
}

                  export const config: AdapterConfig = {
                    startDate: 1635897600,
                  }
                  