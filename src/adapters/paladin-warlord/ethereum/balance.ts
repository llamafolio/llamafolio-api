import type { Balance, BalancesContext, BaseBalance, BaseContract, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

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

const warAuraLocker: Contract = {
  chain: 'ethereum',
  address: '0x7B90e043aaC79AdeA0Dbb0690E3c832757207a3B',
}
const warCvxLocker: Contract = {
  chain: 'ethereum',
  address: '0x700d6d24A55512c6AEC08820B49da4e4193105B3',
}
const warRedeemer: Contract = {
  chain: 'ethereum',
  address: '0x4787Ef084c1d57ED87D58a716d991F8A9CD3828C',
}

export async function getWarlordBalance(ctx: BalancesContext, war: Contract): Promise<Balance> {
  const warBalance = await call({
    ctx,
    abi: erc20Abi.balanceOf,
    target: war.address,
    params: [ctx.address],
  })
  const warTotalSupply = await call({
    ctx,
    abi: erc20Abi.totalSupply,
    target: war.address,
  })
  const [cvxLocked, auraLocked] = await multicall({
    ctx,
    abi: abi.getCurrentLockedTokens,
    calls: [warCvxLocker.address, warAuraLocker.address].map(
      (target) =>
        ({
          target,
        }) as const,
    ),
  })
  const [auraQueued, cvxQueued] = await multicall({
    ctx,
    abi: abi.queuedForWithdrawal,
    calls: [aura.address, cvx.address].map(
      (token) =>
        ({
          target: warRedeemer.address,
          params: [token],
        }) as const,
    ),
  })

  let cvxUserBalanceAmount: bigint = 0n
  let auraUserBalanceAmount: bigint = 0n
  if (cvxLocked.success && cvxQueued.success) {
    cvxUserBalanceAmount = ((cvxLocked.output - cvxQueued.output) * warBalance) / warTotalSupply
  }
  if (auraLocked.success && auraQueued.success) {
    auraUserBalanceAmount = ((auraLocked.output - auraQueued.output) * warBalance) / warTotalSupply
  }

  const cvxUserBalance: BaseBalance = {
    amount: cvxUserBalanceAmount,
    token: cvx.address,
    chain: ctx.chain,
    address: cvx.address,
    symbol: cvx.symbol,
    decimals: cvx.decimals,
  }
  const auraUserBalance: BaseBalance = {
    amount: auraUserBalanceAmount,
    token: aura.address,
    chain: ctx.chain,
    address: aura.address,
    symbol: aura.symbol,
    decimals: aura.decimals,
  }

  return {
    ...war,
    amount: warBalance,
    underlyings: [cvxUserBalance, auraUserBalance],
    category: 'stake',
    rewards: undefined,
  }
}

async function getRewardsForUser(ctx: BalancesContext, stkWAR: Contract): Promise<BaseBalance[]> {
  const rewards = await call({
    ctx,
    abi: abi.getUserTotalClaimableRewards,
    target: stkWAR.address,
    params: [ctx.address],
  })

  return rewards.map((reward) => ({
    amount: reward.claimableAmount,
    claimable: reward.claimableAmount,
    token: reward.reward,
    chain: ctx.chain,
    address: reward.reward,
    category: 'reward',
  }))
}

export async function getStakedWarlordBalance(ctx: BalancesContext, stkWAR: Contract): Promise<Balance> {
  const stkWARBalance = await call({
    ctx,
    abi: erc20Abi.balanceOf,
    target: stkWAR.address,
    params: [ctx.address],
  })
  const warTotalSupply = await call({
    ctx,
    abi: erc20Abi.totalSupply,
    target: (stkWAR!.underlyings![0] as BaseContract).address,
  })
  const [cvxLocked, auraLocked] = await multicall({
    ctx,
    abi: abi.getCurrentLockedTokens,
    calls: [warCvxLocker.address, warAuraLocker.address].map(
      (target) =>
        ({
          target,
        }) as const,
    ),
  })
  const [auraQueued, cvxQueued] = await multicall({
    ctx,
    abi: abi.queuedForWithdrawal,
    calls: [aura.address, cvx.address].map(
      (token) =>
        ({
          target: warRedeemer.address,
          params: [token],
        }) as const,
    ),
  })

  let cvxUserBalanceAmount: bigint = 0n
  let auraUserBalanceAmount: bigint = 0n
  if (cvxLocked.success && cvxQueued.success) {
    cvxUserBalanceAmount = ((cvxLocked.output - cvxQueued.output) * stkWARBalance) / warTotalSupply
  }
  if (auraLocked.success && auraQueued.success) {
    auraUserBalanceAmount = ((auraLocked.output - auraQueued.output) * stkWARBalance) / warTotalSupply
  }

  const cvxUserBalance: BaseBalance = {
    amount: cvxUserBalanceAmount,
    token: cvx.address,
    chain: ctx.chain,
    address: cvx.address,
    symbol: cvx.symbol,
    decimals: cvx.decimals,
  }
  const auraUserBalance: BaseBalance = {
    amount: auraUserBalanceAmount,
    token: aura.address,
    chain: ctx.chain,
    address: aura.address,
    symbol: aura.symbol,
    decimals: aura.decimals,
  }

  const rewards = await getRewardsForUser(ctx, stkWAR)

  return {
    ...stkWAR,
    amount: stkWARBalance,
    underlyings: [cvxUserBalance, auraUserBalance],
    category: 'stake',
    rewards,
  }
}
