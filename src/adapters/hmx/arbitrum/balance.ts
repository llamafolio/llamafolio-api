import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  hlpLiquidity: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'hlpLiquidity',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userTokenAmount: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userTokenAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pendingReward: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'pendingReward',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  calculateTotalShare: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'calculateTotalShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userTokenAmountHmx: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'userTokenAmount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getHLPBalance(
  ctx: BalancesContext,
  HLP: Contract,
  vault: Contract,
): Promise<Balance | undefined> {
  const rawUnderlyings = HLP.underlyings as Contract[]
  if (!rawUnderlyings) return

  const [userBalance, totalSupply] = await Promise.all([
    call({ ctx, target: HLP.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: HLP.address, abi: erc20Abi.totalSupply }),
  ])
  const underlyings = await getHLPUnderlyings(ctx, rawUnderlyings, vault.address, userBalance, totalSupply)

  return {
    ...HLP,
    amount: userBalance,
    underlyings,
    rewards: undefined,
    category: 'stake',
  }
}

export async function getsHLPBalance(
  ctx: BalancesContext,
  sHLP: Contract,
  vault: Contract,
): Promise<Balance | undefined> {
  const rawUnderlyings = sHLP.underlyings as Contract[]
  const rewarders: `0x${string}`[] = sHLP.rewarders
  const rawRewards = sHLP.rewards as Contract[]

  if (!rawUnderlyings || !rewarders || !rawRewards) return

  const [userBalance, totalSupply, pendingRewards] = await Promise.all([
    call({ ctx, target: sHLP.address, params: [ctx.address], abi: abi.userTokenAmount }),
    call({ ctx, target: sHLP.address, params: [ctx.address], abi: abi.calculateTotalShare }),
    multicall({
      ctx,
      calls: rewarders.map((rewarder) => ({ target: rewarder, params: [ctx.address] }) as const),
      abi: abi.pendingReward,
    }),
  ])

  const underlyings = await getHLPUnderlyings(ctx, rawUnderlyings, vault.address, userBalance, totalSupply)
  const rewards: Balance[] = mapSuccessFilter(pendingRewards, (res, index) => {
    return { ...rawRewards[index], amount: res.output }
  })

  return {
    ...sHLP,
    amount: userBalance,
    underlyings,
    rewards,
    category: 'stake',
  }
}

async function getHLPUnderlyings(
  ctx: BalancesContext,
  underlyings: Contract[],
  vaultAddress: `0x${string}`,
  balance: bigint,
  supply: bigint,
): Promise<Contract[]> {
  const underlyingBalances = await multicall({
    ctx,
    calls: underlyings.map((underlying) => ({ target: vaultAddress, params: [underlying.address] }) as const),
    abi: abi.hlpLiquidity,
  })

  return mapSuccessFilter(underlyingBalances, (res, index) => {
    return { ...underlyings[index], amount: (res.output * balance) / supply }
  })
}

export async function getHMXBalance(ctx: BalancesContext, controller: Contract): Promise<Balance[]> {
  const rawUnderlyings = controller.underlyings as Contract[]
  const rewarders: `0x${string}`[] = controller.rewarders
  const rawRewards = controller.rewards as Contract[]

  const [userBalances, pendingRewards] = await Promise.all([
    multicall({
      ctx,
      calls: rawUnderlyings.map((underlying) => ({
        target: controller.address,
        params: [underlying.address, ctx.address] as const,
      })),
      abi: abi.userTokenAmountHmx,
    }),
    multicall({
      ctx,
      calls: rewarders.map((rewarder) => ({
        target: rewarder,
        params: [ctx.address] as const,
      })),
      abi: abi.pendingReward,
    }),
  ])

  const balances: Balance[] = mapSuccessFilter(userBalances, (res, index) => {
    return {
      ...rawUnderlyings[index],
      amount: res.output,
      underlyings: undefined,
      rewards: undefined,
      category: 'stake',
    }
  })

  const rewards: Balance[] = mapSuccessFilter(pendingRewards, (res, index) => {
    return { ...rawRewards[index], amount: res.output, underlyings: undefined, rewards: undefined, category: 'reward' }
  })

  return [...balances, ...rewards]
}
