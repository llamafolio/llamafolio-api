import { Balance, BalancesContext, BaseContext, BaseContract, Contract } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { call } from '@lib/call'
import { BigNumber } from 'ethers'

const abi = {
  assetsPositionsOf: {
    inputs: [{ internalType: 'address', name: 'accountAddress', type: 'address' }],
    name: 'assetsPositionsOf',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'assetId', type: 'address' },
          { internalType: 'address', name: 'tokenId', type: 'address' },
          { internalType: 'string', name: 'typeId', type: 'string' },
          { internalType: 'uint256', name: 'balance', type: 'uint256' },
          {
            components: [
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
              { internalType: 'uint256', name: 'amountUsdc', type: 'uint256' },
            ],
            internalType: 'struct RegisteryAdapterV2Vaults.TokenAmount',
            name: 'underlyingTokenBalance',
            type: 'tuple',
          },
          {
            components: [
              { internalType: 'address', name: 'owner', type: 'address' },
              { internalType: 'address', name: 'spender', type: 'address' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
            ],
            internalType: 'struct RegisteryAdapterV2Vaults.Allowance[]',
            name: 'tokenAllowances',
            type: 'tuple[]',
          },
          {
            components: [
              { internalType: 'address', name: 'owner', type: 'address' },
              { internalType: 'address', name: 'spender', type: 'address' },
              { internalType: 'uint256', name: 'amount', type: 'uint256' },
            ],
            internalType: 'struct RegisteryAdapterV2Vaults.Allowance[]',
            name: 'assetAllowances',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct RegisteryAdapterV2Vaults.Position[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  assetsStatic: {
    inputs: [],
    name: 'assetsStatic',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'id', type: 'address' },
          { internalType: 'string', name: 'typeId', type: 'string' },
          { internalType: 'address', name: 'tokenId', type: 'address' },
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'version', type: 'string' },
          { internalType: 'string', name: 'symbol', type: 'string' },
          { internalType: 'uint8', name: 'decimals', type: 'uint8' },
        ],
        internalType: 'struct RegisteryAdapterV2Vaults.AssetStatic[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  balances: {
    name: 'balances',
    outputs: [{ type: 'uint256', name: '' }],
    inputs: [{ type: 'uint256', name: 'arg0' }],
    stateMutability: 'view',
    type: 'function',
    gas: 2370,
  },
}

interface VaultBalance extends Balance {
  lpToken?: string
  poolAddress?: string
  underlyingAmount?: BigNumber
}

export async function getVaultsContracts(ctx: BaseContext, registry: Contract) {
  const contracts: Contract[] = []

  const assetsStaticsRes = await call({
    ctx,
    target: registry.address,
    params: [],
    abi: abi.assetsStatic,
  })

  for (let i = 0; i < assetsStaticsRes.output.length; i++) {
    const assetsStatic = assetsStaticsRes.output[i]

    const contract: Contract = {
      chain: ctx.chain,
      name: assetsStatic.name,
      address: assetsStatic.id,
      symbol: assetsStatic.symbol,
      decimals: parseInt(assetsStatic.decimals),
      lpToken: assetsStatic.tokenId,
      underlyings: [assetsStatic.tokenId],
    }

    contracts.push(contract)
  }

  return contracts
}

export async function getVaultsBalances(ctx: BalancesContext, vaults: Contract[], registry: Contract) {
  const balances: Balance[] = []
  const vaultBalances: VaultBalance[] = []

  const assetsPositionsOf = await call({
    ctx,
    target: registry.address,
    params: [ctx.address],
    abi: abi.assetsPositionsOf,
  })

  for (let i = 0; i < assetsPositionsOf.output.length; i++) {
    const assetsPositionOf = assetsPositionsOf.output[i]

    vaultBalances.push({
      chain: ctx.chain,
      address: assetsPositionOf.assetId,
      amount: BigNumber.from(assetsPositionOf.balance),
      underlyingAmount: BigNumber.from(assetsPositionOf.underlyingTokenBalance.amount),
      category: 'farm',
    })
  }

  const vaultBalanceByAddress = keyBy(vaultBalances, 'address', { lowercase: true })

  for (let vaultIdx = 0; vaultIdx < vaults.length; vaultIdx++) {
    const vault = vaults[vaultIdx]
    const underlying = vault.underlyings?.[0] as BaseContract
    const vaultBalance = vaultBalanceByAddress[vault.address.toLowerCase()]

    if (!vaultBalance) {
      continue
    }

    const balance: Balance = { ...vault, ...vaultBalance }
    if (underlying) {
      balance.underlyings = [{ ...underlying, amount: vaultBalance.underlyingAmount || vaultBalance.amount }]
    }

    balances.push(balance)
  }

  return balances
}
