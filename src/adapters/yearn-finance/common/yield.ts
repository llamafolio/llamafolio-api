import { Balance, BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { range } from '@lib/array'
import { call } from '@lib/call'
import { getPoolFromLpTokenAddress, getPoolsUnderlyings } from '@lib/convex/underlyings'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { BigNumber } from 'ethers'

const abi = {
  assetPositionsOf: {
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
  assetsStaticPositionsOf: {
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

interface PoolsBalancesParams extends Balance {
  underlyingsBalances?: BigNumber
  lpToken?: string
  poolAddress?: string
}

export async function getPositionsContract(ctx: BaseContext, registry: Contract) {
  const contracts: Contract[] = []
  const baseContract: Contract[] = []
  const curveContracts: Contract[] = []

  const assetsStaticsPositionsOfRes = await call({
    ctx,
    target: registry.address,
    params: [],
    abi: abi.assetsStaticPositionsOf,
  })

  for (let i = 0; i < assetsStaticsPositionsOfRes.output.length; i++) {
    const assetsStaticPositionOf = assetsStaticsPositionsOfRes.output[i]

    const contract: Contract = {
      chain: ctx.chain,
      name: assetsStaticPositionOf.name,
      address: assetsStaticPositionOf.id,
      symbol: assetsStaticPositionOf.symbol,
      decimals: parseInt(assetsStaticPositionOf.decimals),
      lpToken: assetsStaticPositionOf.tokenId,
      underlyings: [assetsStaticPositionOf.tokenId],
      poolAddress: '',
    }

    if (contract.symbol?.includes('Curve')) {
      curveContracts.push(contract)
    } else {
      baseContract.push(contract)
    }
  }

  const lpToken = curveContracts.map((lp) => lp.underlyings![0])

  const poolAddresses = await getPoolFromLpTokenAddress(ctx, lpToken as any)
  const undelyings = await getPoolsUnderlyings(ctx, poolAddresses)

  for (let i = 0; i < curveContracts.length; i++) {
    const curveContract = curveContracts[i]
    const undelying = undelyings[i]
    const poolAddress = poolAddresses[i]

    curveContract.poolAddress = poolAddress
    curveContract.underlyings = undelying
  }

  contracts.push(...baseContract, ...curveContracts)

  return contracts
}

export async function getPositionsBalances(ctx: BalancesContext, contracts: Contract[], registry: Contract) {
  const assetsBalances: PoolsBalancesParams[] = []

  const assetsPositionsOf = await call({
    ctx,
    target: registry.address,
    params: [ctx.address],
    abi: abi.assetPositionsOf,
  })

  for (let i = 0; i < assetsPositionsOf.output.length; i++) {
    const assetsPositionOf = assetsPositionsOf.output[i]

    assetsBalances.push({
      chain: ctx.chain,
      address: assetsPositionOf.assetId,
      amount: BigNumber.from(assetsPositionOf.balance),
      underlyingsBalances: BigNumber.from(assetsPositionOf.underlyingTokenBalance.amount),
    })
  }

  const balanceDetailsByPositionAddress: { [key: string]: Contract } = {}
  for (const contract of contracts) {
    balanceDetailsByPositionAddress[contract.address.toLowerCase()] = contract
  }

  const poolsBalances = []
  for (const assetsBalance of assetsBalances) {
    poolsBalances.push({
      ...balanceDetailsByPositionAddress[assetsBalance.address.toLowerCase()],
      amount: BigNumber.from(assetsBalance.underlyingsBalances),
      category: 'farm',
    })
  }

  return await formattedUnderlyingsBalances(ctx, poolsBalances as PoolsBalancesParams[])
}

const formattedUnderlyingsBalances = async (ctx: BaseContext, pools: PoolsBalancesParams[]) => {
  const balances: Balance[] = []
  const curvePoolsBalances: PoolsBalancesParams[] = []

  for (const pool of pools) {
    if (!pool.symbol?.includes('Curve')) {
      balances.push(pool)
    } else {
      curvePoolsBalances.push(pool)
    }
  }

  for (const curvePoolsBalance of curvePoolsBalances) {
    if (curvePoolsBalance.underlyings) {
      const [totalSuppliesRes, underlyingsBalancesRes] = await Promise.all([
        call({
          ctx,
          target: curvePoolsBalance.lpToken as string,
          params: [],
          abi: erc20Abi.totalSupply,
        }),

        multicall({
          ctx,
          calls: range(0, curvePoolsBalance.underlyings.length).map((i) => ({
            target: curvePoolsBalance.poolAddress,
            params: [i],
          })),
          abi: abi.balances,
        }),
      ])

      const totalSupply = totalSuppliesRes.output
      const underlyingsBalances = underlyingsBalancesRes
        .filter((res) => res.success)
        .map((res) => BigNumber.from(res.output))

      /**
       *  Updating pool amounts from the fraction of each underlyings
       */

      const formattedUnderlyings: Balance[] = []

      for (let i = 0; i < curvePoolsBalance.underlyings.length; i++) {
        const underlyingBalance = underlyingsBalances[i]
        const underlyings = curvePoolsBalance.underlyings[i]

        formattedUnderlyings.push({
          ...underlyings,
          amount: curvePoolsBalance.amount.mul(underlyingBalance).div(totalSupply),
        })
      }

      curvePoolsBalance.underlyings = formattedUnderlyings

      balances.push(curvePoolsBalance)
    }

    return balances
  }
}
