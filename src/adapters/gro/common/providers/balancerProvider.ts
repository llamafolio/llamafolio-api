import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccess } from '@lib/array'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  getPoolId: {
    inputs: [],
    name: 'getPoolId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokens: {
    inputs: [{ internalType: 'bytes32', name: 'poolId', type: 'bytes32' }],
    name: 'getPoolTokens',
    outputs: [
      { internalType: 'contract IERC20[]', name: 'tokens', type: 'address[]' },
      { internalType: 'uint256[]', name: 'balances', type: 'uint256[]' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  getPoolTokenInfo: {
    inputs: [
      { internalType: 'bytes32', name: 'poolId', type: 'bytes32' },
      { internalType: 'contract IERC20', name: 'token', type: 'address' },
    ],
    name: 'getPoolTokenInfo',
    outputs: [
      { internalType: 'uint256', name: 'cash', type: 'uint256' },
      { internalType: 'uint256', name: 'managed', type: 'uint256' },
      { internalType: 'uint256', name: 'lastChangeBlock', type: 'uint256' },
      { internalType: 'address', name: 'assetManager', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const BALANCER_VAULT = '0xBA12222222228d8Ba445958a75a0704d566BF2C8'

export async function getBalancerProvider(ctx: BaseContext, contracts: Contract[]): Promise<Contract[]> {
  const poolIdsRes = await multicall({
    ctx,
    calls: contracts.map((contract) => ({ target: contract.address })),
    abi: abi.getPoolId,
  })

  const getPoolTokensRes = await multicall({
    ctx,
    calls: mapSuccess(poolIdsRes, (poolId) => ({ target: BALANCER_VAULT, params: [poolId.output] } as const)),
    abi: abi.getPoolTokens,
  })

  for (let poolIdx = 0; poolIdx < contracts.length; poolIdx++) {
    const contract = contracts[poolIdx]
    const getPoolTokenRes = getPoolTokensRes[poolIdx]

    if (!getPoolTokenRes.success) {
      continue
    }

    const [tokens] = getPoolTokenRes.output

    contract.underlyings = tokens
    contract.poolId = getPoolTokenRes.input.params[0]
  }

  return contracts
}

export async function getBalancerProviderBalances(ctx: BalancesContext, contracts: Balance[]): Promise<Balance[]> {
  const res: Balance[] = []

  const [totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
    multicall({ ctx, calls: contracts.map((contract) => ({ target: contract.address })), abi: erc20Abi.totalSupply }),
    multicall({
      ctx,
      calls: contracts.map(
        (contract) => ({ target: BALANCER_VAULT, params: [(contract as Contract).poolId] } as const),
      ),
      abi: abi.getPoolTokens,
    }),
  ])

  for (let pooldIdx = 0; pooldIdx < contracts.length; pooldIdx++) {
    const contract = contracts[pooldIdx]
    const underlyings = contract.underlyings as Contract[]
    const totalSupplyRes = totalSuppliesRes[pooldIdx]
    const underlyingsBalanceRes = underlyingsBalancesRes[pooldIdx]

    if (!underlyings || !totalSupplyRes.success || totalSupplyRes.output === 0n || !underlyingsBalanceRes.success) {
      continue
    }

    underlyings.forEach((underlying, idx) => {
      const [_tokens, balances] = underlyingsBalanceRes.output

      const underlyingAmount = (balances[idx] * contract.amount) / totalSupplyRes.output

      underlying.amount = underlyingAmount
    })

    res.push(contract)
  }

  return res
}
