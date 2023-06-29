import type { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'

const abi = {
  vaultCount: {
    inputs: [],
    name: 'vaultCount',
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
  vaults: {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    name: 'vaults',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  token: {
    inputs: [],
    name: 'token',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getFractionalVaults(ctx: BaseContext, factory: Contract): Promise<Contract[]> {
  const vaultCount = await call({ ctx, target: factory.address, abi: abi.vaultCount })

  const vaultsRes = await multicall({
    ctx,
    calls: rangeBI(0n, vaultCount).map((idx) => ({ target: factory.address, params: [idx] } as const)),
    abi: abi.vaults,
  })

  const contracts: Contract[] = mapSuccessFilter(vaultsRes, (res) => ({
    chain: ctx.chain,
    address: res.output,
  }))

  return contracts
}

export async function getFractionalVaultsBalances(ctx: BalancesContext, vaults: Contract[]): Promise<Balance[]> {
  const userPricesRes = await multicall({
    ctx,
    calls: vaults.map((vault) => ({ target: vault.address, params: [ctx.address] } as const)),
    abi: erc20Abi.balanceOf,
  })

  const balances: Balance[] = mapSuccessFilter(userPricesRes, (res, idx) => ({
    ...vaults[idx],
    decimals: 18,
    amount: res.output,
    underlyings: undefined,
    rewards: undefined,
    category: 'stake',
  }))

  return balances
}
