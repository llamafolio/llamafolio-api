import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Call } from '@lib/multicall'
import { multicall } from '@lib/multicall'

export interface PoolContract extends Contract {
  pool: string
}

const abi = {
  getContractsRegister: {
    inputs: [],
    name: 'getContractsRegister',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPools: {
    inputs: [],
    name: 'getPools',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  dieselToken: {
    inputs: [],
    name: 'dieselToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  underlyingToken: {
    inputs: [],
    name: 'underlyingToken',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getContractsRegister(ctx: BaseContext) {
  const ADDRESS_PROVIDER = '0xcf64698aff7e5f27a11dff868af228653ba53be0'

  const contractsRegister = await call({
    ctx,
    abi: abi.getContractsRegister,
    target: ADDRESS_PROVIDER,
  })

  return contractsRegister
}

export async function getPoolsContracts(ctx: BaseContext, contractsRegister: `0x${string}`) {
  const contracts: PoolContract[] = []

  const pools = await call({
    ctx,
    target: contractsRegister,
    abi: abi.getPools,
  })

  const calls: Call<typeof abi.dieselToken>[] = pools.map((pool) => ({ target: pool }))

  const [dieselTokensRes, underlyingTokensRes] = await Promise.all([
    multicall({ ctx, calls, abi: abi.dieselToken }),
    multicall({ ctx, calls, abi: abi.underlyingToken }),
  ])

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const dieselTokenRes = dieselTokensRes[poolIdx]
    const underlyingTokenRes = underlyingTokensRes[poolIdx]
    if (!dieselTokenRes.success || !underlyingTokenRes.success) {
      continue
    }

    const contract: PoolContract = {
      chain: ctx.chain,
      address: dieselTokenRes.output,
      pool: pools[poolIdx],
      underlyings: [underlyingTokenRes.output],
    }

    contracts.push(contract)
  }

  return contracts
}

export async function getPoolsBalances(ctx: BalancesContext, pools: PoolContract[]) {
  const balances: Balance[] = []

  const balancesOfRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: pool.address, params: [ctx.address] }) as const),
    abi: erc20Abi.balanceOf,
  })

  for (let poolIdx = 0; poolIdx < pools.length; poolIdx++) {
    const balanceOfRes = balancesOfRes[poolIdx]
    if (!balanceOfRes.success) {
      continue
    }

    const balance: Balance = {
      ...pools[poolIdx],
      underlyings: pools[poolIdx].underlyings as Contract[],
      amount: balanceOfRes.output,
      rewards: undefined,
      category: 'lp',
    }

    balances.push(balance)
  }

  return balances
}
