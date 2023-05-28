import type { BaseContext, Contract } from '@lib/adapter'
import { mapSuccess } from '@lib/array'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const abi = {
  getDepositTokens: {
    inputs: [],
    name: 'getDepositTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDebtTokens: {
    inputs: [],
    name: 'getDebtTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  collateralFactor: {
    inputs: [],
    name: 'collateralFactor',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlying: {
    inputs: [],
    name: 'underlying',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  pricePerShare: {
    inputs: [],
    name: 'pricePerShare',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [{ internalType: 'contract IERC20', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  poolRewards: {
    inputs: [],
    name: 'poolRewards',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getRewardTokens: {
    inputs: [],
    name: 'getRewardTokens',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  syntheticToken: {
    inputs: [],
    name: 'syntheticToken',
    outputs: [{ internalType: 'contract ISyntheticToken', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getMetronomeContracts(ctx: BaseContext, contract: Contract): Promise<Contract[]> {
  const markets: Contract[] = []

  const [depositTokensRes, debtTokensRes] = await Promise.all([
    call({ ctx, target: contract.address, abi: abi.getDepositTokens }),
    call({ ctx, target: contract.address, abi: abi.getDebtTokens }),
  ])

  const [tokens, syntheticTokens, collateralFactors] = await Promise.all([
    multicall({ ctx, calls: depositTokensRes.map((token) => ({ target: token })), abi: abi.underlying }),
    multicall({ ctx, calls: debtTokensRes.map((token) => ({ target: token })), abi: abi.syntheticToken }),
    multicall({ ctx, calls: depositTokensRes.map((token) => ({ target: token })), abi: abi.collateralFactor }),
  ])

  const underlyings = await multicall({
    ctx,
    calls: mapSuccess(tokens, (token) => ({ target: token.output })),
    abi: abi.token,
  })

  for (let depositIdx = 0; depositIdx < depositTokensRes.length; depositIdx++) {
    const depositTokenRes = depositTokensRes[depositIdx]
    const token = tokens[depositIdx]
    const underlying = underlyings[depositIdx].success
      ? underlyings[depositIdx].output
      : underlyings[depositIdx].input.target
    const collateralFactor = collateralFactors[depositIdx]

    if (!token.success || !collateralFactor.success || !underlying) {
      continue
    }

    markets.push({
      chain: ctx.chain,
      address: depositTokenRes,
      token: token.output,
      underlyings: [underlying],
      collateralFactor: collateralFactor.output,
      category: 'lend',
    })
  }

  for (let debtIdx = 0; debtIdx < debtTokensRes.length; debtIdx++) {
    const debtTokenRes = debtTokensRes[debtIdx]
    const syntheticToken = syntheticTokens[debtIdx]

    if (!syntheticToken.success) {
      continue
    }

    markets.push({
      chain: ctx.chain,
      address: debtTokenRes,
      underlyings: [syntheticToken.output],
      category: 'borrow',
    })
  }

  return markets
}
