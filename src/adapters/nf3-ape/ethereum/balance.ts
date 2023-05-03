import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Token } from '@lib/token'
import { BigNumber } from 'ethers'

const abi = {
  getBakcStakes: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getBakcStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'deposited', type: 'uint256' },
          { internalType: 'uint256', name: 'unclaimed', type: 'uint256' },
          { internalType: 'uint256', name: 'rewards24hr', type: 'uint256' },
          {
            components: [
              { internalType: 'uint256', name: 'mainTokenId', type: 'uint256' },
              { internalType: 'uint256', name: 'mainTypePoolId', type: 'uint256' },
            ],
            internalType: 'struct ApeCoinStaking.DashboardPair',
            name: 'pair',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.DashboardStake[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getBaycStakes: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getBaycStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'deposited', type: 'uint256' },
          { internalType: 'uint256', name: 'unclaimed', type: 'uint256' },
          { internalType: 'uint256', name: 'rewards24hr', type: 'uint256' },
          {
            components: [
              { internalType: 'uint256', name: 'mainTokenId', type: 'uint256' },
              { internalType: 'uint256', name: 'mainTypePoolId', type: 'uint256' },
            ],
            internalType: 'struct ApeCoinStaking.DashboardPair',
            name: 'pair',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.DashboardStake[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getMaycStakes: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getMaycStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'deposited', type: 'uint256' },
          { internalType: 'uint256', name: 'unclaimed', type: 'uint256' },
          { internalType: 'uint256', name: 'rewards24hr', type: 'uint256' },
          {
            components: [
              { internalType: 'uint256', name: 'mainTokenId', type: 'uint256' },
              { internalType: 'uint256', name: 'mainTypePoolId', type: 'uint256' },
            ],
            internalType: 'struct ApeCoinStaking.DashboardPair',
            name: 'pair',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.DashboardStake[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getAllStakes: {
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'getAllStakes',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'poolId', type: 'uint256' },
          { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
          { internalType: 'uint256', name: 'deposited', type: 'uint256' },
          { internalType: 'uint256', name: 'unclaimed', type: 'uint256' },
          { internalType: 'uint256', name: 'rewards24hr', type: 'uint256' },
          {
            components: [
              { internalType: 'uint256', name: 'mainTokenId', type: 'uint256' },
              { internalType: 'uint256', name: 'mainTypePoolId', type: 'uint256' },
            ],
            internalType: 'struct ApeCoinStaking.DashboardPair',
            name: 'pair',
            type: 'tuple',
          },
        ],
        internalType: 'struct ApeCoinStaking.DashboardStake[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

type NFTBalances = Balance & {
  poolId: string
  tokenId: string
}

const symbol: { [key: number]: string } = {
  0: 'APE',
  1: 'BAYC',
  2: 'MAYC',
  3: 'BAKC',
}

const apeCoin: Token = {
  chain: 'ethereum',
  address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
  decimals: 18,
  symbol: 'APE',
}

export async function getApeStakeBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const balances: NFTBalances[] = []

  const { output: allStakesBalancesRes } = await call({
    ctx,
    target: staker.address,
    params: [ctx.address],
    abi: abi.getAllStakes,
  })

  for (let resIdx = 0; resIdx < allStakesBalancesRes.length; resIdx++) {
    const allStakesBalanceRes = allStakesBalancesRes[resIdx]

    const { poolId, tokenId, unclaimed, deposited } = allStakesBalanceRes

    balances.push({
      chain: ctx.chain,
      address: staker.address,
      symbol: symbol[poolId],
      decimals: 18,
      amount: BigNumber.from(deposited),
      poolId,
      tokenId,
      underlyings: [apeCoin],
      rewards: [{ ...apeCoin, amount: BigNumber.from(unclaimed) }],
      category: 'stake',
    })
  }

  return balances
}
