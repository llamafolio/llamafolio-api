import type { Balance, BalancesContext, BaseBalance, BaseContext, BaseContract, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { ADDRESS_ZERO } from '@lib/contract'
import { getERC20BalanceOf } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { ETH_ADDR } from '@lib/token'

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
} as const

const bancorNetwork = '0xeef417e1d5cc832e619ae18d2f140de2999dd4fb'
const standardRewards = '0xb0b958398abb0b5db4ce4d7598fb868f5a00f372'

export interface StandardRewardsContract extends Contract {
  ids: number[]
}

export async function getPoolsContracts(ctx: BaseContext): Promise<Contract[]> {
  const poolCollections = await call({ ctx, target: bancorNetwork, abi: abi.poolCollections })

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
        ? poolsRes.output.map(
            (pool) =>
              ({
                target: poolCollections[poolCollectionIdx],
                // replace ETH alias
                params: [pool === ETH_ADDR ? ADDRESS_ZERO : pool],
              } as const),
          )
        : [],
    ),
    abi: abi.poolToken,
  })

  return mapSuccessFilter(poolsTokens, (res) => ({
    chain: ctx.chain,
    address: res.output,
    underlyings: [res.input.params[0]],
  }))
}

export async function getPoolsBalances(ctx: BalancesContext, pools: Contract[]) {
  const balances = await getERC20BalanceOf(ctx, pools as Token[])

  return balances.map((balance) => ({ ...balance, category: 'lp' as Category }))
}

export async function getStandardRewardsContract(ctx: BaseContext) {
  const programIds = await call({ ctx, target: standardRewards, abi: abi.programIds })

  const programsRes = await call({
    ctx,
    target: standardRewards,
    params: [programIds],
    abi: abi.programs,
  })

  const res: StandardRewardsContract = {
    chain: ctx.chain,
    address: standardRewards,
    // replace ETH alias
    underlyings: programsRes.map((programData) =>
      programData.pool.toLowerCase() === ETH_ADDR ? ADDRESS_ZERO : programData.pool,
    ),
    rewards: programsRes.map((programData) => programData.rewardsToken),
    ids: programsRes.map((programData) => Number(programData.id)),
  }

  return res
}

export async function getStakeBalances(ctx: BalancesContext, standardRewards: StandardRewardsContract) {
  const balances: Balance[] = []

  const [providerStakesRes, providerRewardsRes] = await Promise.all([
    multicall({
      ctx,
      calls: standardRewards.ids.map(
        (id) => ({ target: standardRewards.address, params: [ctx.address, BigInt(id)] } as const),
      ),
      abi: abi.providerStake,
    }),
    multicall({
      ctx,
      calls: standardRewards.ids.map(
        (id) => ({ target: standardRewards.address, params: [ctx.address, BigInt(id)] } as const),
      ),
      abi: abi.providerRewards,
    }),
  ])

  for (let idx = 0; idx < standardRewards.ids.length; idx++) {
    const stakeRes = providerStakesRes[idx]
    const rewardsRes = providerRewardsRes[idx]

    const underlyingProgram = standardRewards.underlyings?.[idx] as BaseContract

    const balance: Balance = {
      ...underlyingProgram,
      category: 'stake',
      amount: stakeRes.success ? stakeRes.output : 0n,
      rewards: [
        {
          ...(standardRewards.rewards?.[idx] as BaseBalance),
          // TODO: providerRewards.stakedAmount
          amount: rewardsRes.success ? rewardsRes.output.pendingRewards : 0n,
        },
      ],
    }

    balances.push(balance)
  }

  return balances
}
