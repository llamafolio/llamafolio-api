import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { get_xLP_UnderlyingsBalances } from '@lib/gmx/underlying'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  stakedBalance: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'stakedBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  claimable: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'claimable',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  pairAmounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'pairAmounts',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  stakedAmounts: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakedAmounts',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  depositBalances: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'depositBalances',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const vault: Contract = {
  chain: 'fantom',
  address: '0x3CB54f0eB62C371065D739A34a775CC16f46563e',
}

const WFTM: Token = {
  chain: 'fantom',
  address: '0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83',
  decimals: 18,
  symbol: 'WFTM',
}

const esToken: Token = {
  chain: 'fantom',
  address: '0x49a97680938b4f1f73816d1b70c3ab801fad124b',
  decimals: 18,
  symbol: 'esMPX',
}

const MPX: Token = {
  chain: 'fantom',
  address: '0x66eed5ff1701e6ed8470dc391f05e27b1d0657eb',
  decimals: 18,
  symbol: 'MPX',
}

export async function getMorphexMLPBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const stakedBalance = await call({
    ctx,
    target: contract.address,
    params: [ctx.address],
    abi: abi.stakedBalance,
  })

  const balance: Balance = {
    ...contract,
    amount: stakedBalance,
    underlyings: contract.underlyings as Contract[],
    rewards: undefined,
    category: 'farm',
  }

  return get_xLP_UnderlyingsBalances(ctx, [balance], vault)
}

export async function getMorphexYieldBalances(ctx: BalancesContext, farmers: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []
  const calls: Call<typeof abi.claimable>[] = farmers.map((farmer: Contract) => ({
    target: farmer.address,
    params: [ctx.address],
  }))

  const [balancesOfsRes, claimablesRes, underlyingsRes] = await Promise.all([
    multicall({ ctx, calls, abi: erc20Abi.balanceOf }),
    multicall({ ctx, calls, abi: abi.claimable }),
    multicall({ ctx, calls, abi: abi.pairAmounts }),
  ])

  for (let farmerIdx = 0; farmerIdx < farmers.length; farmerIdx++) {
    const farmer = farmers[farmerIdx]
    const underlyings = farmer.underlyings as Contract[]
    const balancesOfRes = balancesOfsRes[farmerIdx]
    const claimableRes = claimablesRes[farmerIdx]
    const underlyingRes = underlyingsRes[farmerIdx]

    if (!underlyings || !balancesOfRes.success || !claimableRes.success || !underlyingRes.success) {
      continue
    }

    balances.push({
      ...farmer,
      amount: balancesOfRes.output,
      underlyings: [
        { ...underlyings[0], amount: balancesOfRes.output },
        { ...underlyings[1], amount: underlyingRes.output },
      ],
      rewards: [{ ...MPX, amount: claimableRes.output }],
      category: 'farm',
    })
  }

  return balances
}

export async function getMorphexStakeMLPBalances(ctx: BalancesContext, contract: Contract): Promise<Balance[]> {
  const [stakedBalance, claimableNativeToken, claimableEsToken] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: contract.rewarder, params: [ctx.address], abi: abi.claimable }),
  ])

  const balance: Balance = {
    ...contract,
    amount: stakedBalance,
    underlyings: contract.underlyings as Contract[],
    rewards: [
      { ...WFTM, amount: claimableNativeToken },
      { ...esToken, amount: claimableEsToken },
    ],
    category: 'stake',
  }

  return get_xLP_UnderlyingsBalances(ctx, [balance], vault)
}

export async function getMorphexStakeMPXBalances(
  ctx: BalancesContext,
  contract: Contract,
): Promise<Balance | undefined> {
  const underlyings = contract.underlyings as Contract[]
  if (!underlyings) {
    return
  }

  console.log(contract)

  const [stakedBalance, claimableEsToken, claimableNativeToken, underlyingsBalancesRes] = await Promise.all([
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.stakedAmounts }),
    call({ ctx, target: contract.address, params: [ctx.address], abi: abi.claimable }),
    call({ ctx, target: contract.rewarder, params: [ctx.address], abi: abi.claimable }),
    multicall({
      ctx,
      calls: underlyings.map(
        (underlying) => ({ target: contract.address, params: [ctx.address, underlying.address] }) as const,
      ),
      abi: abi.depositBalances,
    }),
  ])

  underlyings.forEach((underlying: Contract, underlyingIdx) => {
    underlying.amount = underlyingsBalancesRes[underlyingIdx].success
      ? underlyingsBalancesRes[underlyingIdx].output
      : 0n
  })

  return {
    ...contract,
    amount: stakedBalance,
    underlyings,
    rewards: [
      { ...WFTM, amount: claimableNativeToken },
      { ...esToken, amount: claimableEsToken },
    ],
    category: 'stake',
  }
}
