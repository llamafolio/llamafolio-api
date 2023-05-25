import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { ADDRESS_ZERO } from '@lib/contract'
import { getERC20BalanceOf } from '@lib/erc20'
import { BN_ZERO } from '@lib/math'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { ETH_ADDR } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber } from 'ethers'

const abi = {
  poolCollections: {
    inputs: [],
    name: 'poolCollections',
    outputs: [{ internalType: 'contract IPoolCollection[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  pools: {
    inputs: [],
    name: 'pools',
    outputs: [{ internalType: 'contract Token[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolToken: {
    inputs: [{ internalType: 'contract Token', name: 'pool', type: 'address' }],
    name: 'poolToken',
    outputs: [{ internalType: 'contract IPoolToken', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  programIds: {
    inputs: [],
    name: 'programIds',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  providerStake: {
    inputs: [
      { internalType: 'address', name: 'provider', type: 'address' },
      { internalType: 'uint256', name: 'id', type: 'uint256' },
    ],
    name: 'providerStake',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  programs: {
    inputs: [{ internalType: 'uint256[]', name: 'ids', type: 'uint256[]' }],
    name: 'programs',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'contract Token', name: 'pool', type: 'address' },
          { internalType: 'contract IPoolToken', name: 'poolToken', type: 'address' },
          { internalType: 'contract Token', name: 'rewardsToken', type: 'address' },
          { internalType: 'bool', name: 'isPaused', type: 'bool' },
          { internalType: 'uint32', name: 'startTime', type: 'uint32' },
          { internalType: 'uint32', name: 'endTime', type: 'uint32' },
          { internalType: 'uint256', name: 'rewardRate', type: 'uint256' },
          { internalType: 'uint256', name: 'remainingRewards', type: 'uint256' },
        ],
        internalType: 'struct ProgramData[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  providerRewards: {
    inputs: [
      { internalType: 'address', name: 'provider', type: 'address' },
      { internalType: 'uint256', name: 'id', type: 'uint256' },
    ],
    name: 'providerRewards',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'rewardPerTokenPaid', type: 'uint256' },
          { internalType: 'uint256', name: 'pendingRewards', type: 'uint256' },
          { internalType: 'uint256', name: 'reserved0', type: 'uint256' },
          { internalType: 'uint256', name: 'stakedAmount', type: 'uint256' },
        ],
        internalType: 'struct ProviderRewards',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
}

const bancorNetwork = '0xeEF417e1D5CC832e619ae18D2F140De2999dD4fB'
const standardRewards = '0xb0B958398ABB0b5DB4ce4d7598Fb868f5A00f372'

export interface Program extends Contract {
  id: number
}

export async function getPoolsContracts(ctx: BaseContext): Promise<Contract[]> {
  const poolCollectionsRes = await call({ ctx, target: bancorNetwork, abi: abi.poolCollections })
  const poolCollections: string[] = poolCollectionsRes.output

  // standard tokens: DAI, LINK, 1INCH...
  const collectionsPoolsRes = await multicall({
    ctx,
    calls: poolCollections.map((target) => ({ target })),
    abi: abi.pools,
  })

  // bnTokens
  const poolsTokens = await multicall({
    ctx,
    calls: collectionsPoolsRes.flatMap((poolsRes, poolCollectionIdx) =>
      poolsRes.success
        ? poolsRes.output.map((pool: string) => ({
            target: poolCollections[poolCollectionIdx],
            // replace ETH alias
            params: [pool === ETH_ADDR ? ADDRESS_ZERO : pool],
          }))
        : [],
    ),
    abi: abi.poolToken,
  })

  return poolsTokens.filter(isSuccess).map((res) => ({
    chain: ctx.chain,
    address: res.output,
    underlyings: [res.input.params[0]],
  }))
}

export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[]) {
  const balances = await getERC20BalanceOf(ctx, pools as Token[])

  return balances.map((balance) => ({ ...balance, category: 'lp' as Category }))
}

export async function getProgramsContracts(ctx: BaseContext): Promise<Program[]> {
  const programIdsRes = await call({ ctx, target: standardRewards, abi: abi.programIds })
  const programIds = programIdsRes.output.map((str: string) => BigNumber.from(str))

  const programsRes = await call({
    ctx,
    target: standardRewards,
    params: [programIds],
    abi: abi.programs,
  })

  return programsRes.output.map((programData: any) => ({
    id: parseInt(programData.id),
    chain: ctx.chain,
    address: programData.poolToken,
    // replace ETH alias
    underlyings: [programData.pool === ETH_ADDR ? ADDRESS_ZERO : programData.pool],
    rewards: [programData.rewardsToken],
  }))
}

export async function getStakeBalances(ctx: BalancesContext, standardRewards: Contract, programs: Program[]) {
  const balances: Balance[] = []

  const [providerStakesRes, providerRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: programs.map((program) => ({ target: standardRewards.address, params: [ctx.address, program.id] })),
      abi: abi.providerStake,
    }),
    multicall({
      ctx,
      calls: programs.map((program) => ({ target: standardRewards.address, params: [ctx.address, program.id] })),
      abi: abi.providerRewards,
    }),
  ])

  for (let programIdx = 0; programIdx < programs.length; programIdx++) {
    const stakeRes = providerStakesRes[programIdx]
    const rewardsRes = providerRewardsRes[programIdx]

    const balance: Balance = {
      ...programs[programIdx],
      category: 'stake',
      amount: stakeRes.success ? BigNumber.from(stakeRes.output) : BN_ZERO,
      rewards: [
        {
          ...programs[programIdx].rewards?.[0],
          // TODO: providerRewards.stakedAmount
          amount: rewardsRes.success ? BigNumber.from(rewardsRes.output.pendingRewards) : BN_ZERO,
        },
      ],
    }

    balances.push(balance)
  }

  return balances
}
