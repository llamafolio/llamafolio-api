import type { Balance, BalancesContext, BaseBalance, BaseContract, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import type { Category } from '@lib/category'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  getUserTotalClaimableRewards: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserTotalClaimableRewards',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'reward', type: 'address' },
          { internalType: 'uint256', name: 'claimableAmount', type: 'uint256' },
        ],
        internalType: 'struct WarStaker.UserClaimableRewards[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getCurrentLockedTokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'getCurrentLockedTokens',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  queuedForWithdrawal: {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'queuedForWithdrawal',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const cvx: Token = {
  chain: 'ethereum',
  address: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
  decimals: 18,
  symbol: 'CVX',
}
const aura: Token = {
  chain: 'ethereum',
  address: '0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF',
  decimals: 18,
  symbol: 'AURA',
}

const warRedeemer: Contract = {
  chain: 'ethereum',
  address: '0x4787Ef084c1d57ED87D58a716d991F8A9CD3828C',
}

export async function getWarlordBalance(ctx: BalancesContext, war: Contract, lockers: Contract[]): Promise<Balance> {
  const [warBalance, warTotalSupply, tokensLocked, tokensQueued] = await Promise.all([
    call({
      ctx,
      abi: erc20Abi.balanceOf,
      target: war.address,
      params: [ctx.address],
    }),
    call({
      ctx,
      abi: erc20Abi.totalSupply,
      target: war.address,
    }),
    multicall({
      ctx,
      abi: abi.getCurrentLockedTokens,
      calls: lockers.map((locker) => ({ target: locker.address })),
    }),
    multicall({
      ctx,
      calls: [aura, cvx].map((token) => ({ target: warRedeemer.address, params: [token.address] }) as const),
      abi: abi.queuedForWithdrawal,
    }),
  ])

  const [auraLocked, cvxLocked] = mapSuccessFilter(tokensLocked, (res) => (res.output > 0n ? res.output : 0n))
  const [auraQueued, cvxQueued] = mapSuccessFilter(tokensQueued, (res) => (res.output > 0n ? res.output : 0n))

  const auraUserBalance: BaseBalance = {
    ...lockers[0],
    amount: ((auraLocked - auraQueued) * warBalance) / warTotalSupply,
  }

  const cvxUserBalance: BaseBalance = {
    ...lockers[1],
    amount: ((cvxLocked - cvxQueued) * warBalance) / warTotalSupply,
  }

  return {
    ...war,
    amount: warBalance,
    underlyings: [cvxUserBalance, auraUserBalance],
    category: 'stake',
    rewards: undefined,
  }
}

async function getRewardsForUser(ctx: BalancesContext, stkWAR: Contract): Promise<Balance[]> {
  const rewards = stkWAR.rewards as Contract[]

  const rewardBalances = await call({
    ctx,
    abi: abi.getUserTotalClaimableRewards,
    target: stkWAR.address,
    params: [ctx.address],
  })

  return rewards
    .map((rewardToken, index) => {
      const { reward, claimableAmount } = rewardBalances[index]
      if (reward.toLowerCase() !== rewardToken.address.toLowerCase()) {
        return null
      }

      return { ...(rewardToken as Balance), amount: claimableAmount, category: 'reward' as Category }
    })
    .filter(isNotNullish)
}

export async function getStakedWarlordBalance(
  ctx: BalancesContext,
  stkWAR: Contract,
  lockers: Contract[],
): Promise<Balance> {
  const [stkWARBalance, warTotalSupply, tokensLocked, tokensQueued, rewards] = await Promise.all([
    call({
      ctx,
      abi: erc20Abi.balanceOf,
      target: stkWAR.address,
      params: [ctx.address],
    }),
    call({
      ctx,
      abi: erc20Abi.totalSupply,
      target: (stkWAR!.underlyings![0] as BaseContract).address,
    }),
    multicall({
      ctx,
      calls: lockers.map((locker) => ({ target: locker.address }) as const),
      abi: abi.getCurrentLockedTokens,
    }),
    multicall({
      ctx,
      calls: [aura, cvx].map((token) => ({ target: warRedeemer.address, params: [token.address] }) as const),
      abi: abi.queuedForWithdrawal,
    }),
    getRewardsForUser(ctx, stkWAR),
  ])

  const [auraLocked, cvxLocked] = mapSuccessFilter(tokensLocked, (res) => (res.output > 0n ? res.output : 0n))
  const [auraQueued, cvxQueued] = mapSuccessFilter(tokensQueued, (res) => (res.output > 0n ? res.output : 0n))

  const auraUserBalance: BaseBalance = {
    ...lockers[0],
    amount: ((auraLocked - auraQueued) * stkWARBalance) / warTotalSupply,
  }

  const cvxUserBalance: BaseBalance = {
    ...lockers[1],
    amount: ((cvxLocked - cvxQueued) * stkWARBalance) / warTotalSupply,
  }

  return {
    ...stkWAR,
    amount: stkWARBalance,
    underlyings: [cvxUserBalance, auraUserBalance],
    category: 'stake',
    rewards,
  }
}
