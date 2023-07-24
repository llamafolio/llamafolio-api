import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

const Bella: Token = {
  chain: 'ethereum',
  address: '0xA91ac63D040dEB1b7A5E4d4134aD23eb0ba07e14',
  symbol: 'BEL',
  decimals: 18,
}

const abi = {
  earned: {
    constant: true,
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: '_user', type: 'address' },
    ],
    name: 'earnedBellaAll',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  stake: {
    constant: true,
    inputs: [
      { internalType: 'uint256', name: '_pid', type: 'uint256' },
      { internalType: 'address', name: 'user', type: 'address' },
    ],
    name: 'getBtokenStaked',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  converter: {
    constant: true,
    inputs: [],
    name: 'getPricePerFullShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBellaBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  comptroller: Contract,
): Promise<Balance[][]> {
  return Promise.all([getBellaFarmBalances(ctx, contracts, comptroller), getBellaYieldBalances(ctx, contracts)])
}

async function getBellaFarmBalances(
  ctx: BalancesContext,
  contracts: Contract[],
  comptroller: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = []

  const calls: Call<typeof abi.stake>[] = contracts.map((contract) => ({
    target: comptroller.address,
    params: [contract.pid, ctx.address],
  }))

  const [userBalanceOfsRes, earnedsRes, getPricePerFullSharesRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.stake }),
    multicall({ ctx, calls, abi: abi.earned }),
    multicall({ ctx, calls: contracts.map((contract) => ({ target: contract.address })), abi: abi.converter }),
  ])

  for (let contractIdx = 0; contractIdx < contracts.length; contractIdx++) {
    const contract = contracts[contractIdx]
    const underlyings = contract.underlyings as Contract[]
    const userBalanceOfRes = userBalanceOfsRes[contractIdx]
    const earnedRes = earnedsRes[contractIdx]
    const getPricePerFullShareRes = getPricePerFullSharesRes[contractIdx]

    if (!userBalanceOfRes.success || !earnedRes.success || !getPricePerFullShareRes.success) {
      continue
    }

    balances.push({
      ...contract,
      amount: (userBalanceOfRes.output * getPricePerFullShareRes.output) / parseEther('1.0'),
      underlyings,
      rewards: [{ ...Bella, amount: earnedRes.output }],
      category: 'farm',
    })
  }

  return balances
}

async function getBellaYieldBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = []

  const [balanceOfsRes, getPricePerFullSharesRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address, params: [ctx.address] }) as const),
      abi: erc20Abi.balanceOf,
    }),
    multicall({ ctx, calls: contracts.map((contract) => ({ target: contract.address })), abi: abi.converter }),
  ])

  for (let contractIdx = 0; contractIdx < contracts.length; contractIdx++) {
    const contract = contracts[contractIdx]
    const underlyings = contract.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[contractIdx]
    const getPricePerFullShareRes = getPricePerFullSharesRes[contractIdx]

    if (!balanceOfRes.success || !getPricePerFullShareRes.success) {
      continue
    }

    balances.push({
      ...contract,
      amount: (balanceOfRes.output * getPricePerFullShareRes.output) / parseEther('1.0'),
      underlyings,
      rewards: undefined,
      category: 'farm',
    })
  }

  return balances
}
