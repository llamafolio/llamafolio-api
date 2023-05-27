import type { Balance, BalancesContext, BaseBalance, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { getERC20BalanceOf, getERC20Details } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { BigNumber, ethers } from 'ethers'

const abi = {
  getReservesList: {
    inputs: [],
    name: 'getReservesList',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  getReserveTokensAddresses: {
    inputs: [{ internalType: 'address', name: 'asset', type: 'address' }],
    name: 'getReserveTokensAddresses',
    outputs: [
      { internalType: 'address', name: 'aTokenAddress', type: 'address' },
      {
        internalType: 'address',
        name: 'stableDebtTokenAddress',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'variableDebtTokenAddress',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getLendingPoolContracts(
  ctx: BaseContext,
  lendingPool: Contract,
  poolDataProvider: Contract,
): Promise<Contract[]> {
  const contracts: Contract[] = []

  const reservesList = await call({
    ctx,
    target: lendingPool.address,
    abi: abi.getReservesList,
  })

  const reserveTokensAddressesRes = await multicall({
    ctx,
    calls: reservesList.map(
      (address) =>
        ({
          target: poolDataProvider.address,
          params: [address],
        } as const),
    ),
    abi: abi.getReserveTokensAddresses,
  })

  for (let reserveIdx = 0; reserveIdx < reserveTokensAddressesRes.length; reserveIdx++) {
    const reserveTokensAddressRes = reserveTokensAddressesRes[reserveIdx]
    if (!reserveTokensAddressRes.success) {
      continue
    }

    const underlyingToken = reserveTokensAddressRes.input.params[0]
    const [aToken, stableDebtToken, variableDebtToken] = reserveTokensAddressRes.output

    contracts.push(
      {
        chain: ctx.chain,
        address: aToken,
        underlyings: [underlyingToken],
        category: 'lend',
      },
      {
        chain: ctx.chain,
        address: stableDebtToken,
        underlyings: [underlyingToken],
        category: 'borrow',
        stable: true,
      },
      {
        chain: ctx.chain,
        address: variableDebtToken,
        underlyings: [underlyingToken],
        category: 'borrow',
        stable: false,
      },
    )
  }

  return contracts
}

export async function getLendingPoolBalances(ctx: BalancesContext, contracts: Contract[]): Promise<Balance[]> {
  const balances: Balance[] = await getERC20BalanceOf(ctx, contracts as Token[])

  // use the same amount for underlyings
  for (const balance of balances) {
    if (balance.amount.gt(0) && balance.underlyings) {
      ;(balance.underlyings[0] as BaseBalance).amount = BigNumber.from(balance.amount)
    }
  }

  return balances
}

export async function getLendingRewardsBalances(
  ctx: BalancesContext,
  incentiveController: Contract,
  contracts: Contract[],
): Promise<Balance[]> {
  const rewards: Balance[] = []
  const assets: any = contracts.map((contract: Contract) => contract.address)

  const [rewardsLists, unclaimedAmounts] = await call({
    ctx,
    target: incentiveController.address,
    params: [assets, ctx.address],
    abi: {
      inputs: [
        { internalType: 'address[]', name: 'assets', type: 'address[]' },
        { internalType: 'address', name: 'user', type: 'address' },
      ],
      name: 'getAllUserRewards',
      outputs: [
        {
          internalType: 'address[]',
          name: 'rewardsList',
          type: 'address[]',
        },
        {
          internalType: 'uint256[]',
          name: 'unclaimedAmounts',
          type: 'uint256[]',
        },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  const rewardsTokens = await getERC20Details(ctx, rewardsLists)
  const rewardsBalances = BigNumber.from(unclaimedAmounts[0])

  rewards.push({
    ...rewardsTokens[0],
    amount: rewardsBalances,
    category: 'reward',
  })

  return rewards
}

export async function getLendingPoolHealthFactor(ctx: BalancesContext, lendingPool: Contract) {
  const [
    _totalCollateralBase,
    _totalDebtBase,
    _availableBorrowsBase,
    _currentLiquidationThreshold,
    _ltv,
    healthFactor,
  ] = await call({
    ctx,
    target: lendingPool.address,
    params: [ctx.address],
    abi: {
      inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
      name: 'getUserAccountData',
      outputs: [
        {
          internalType: 'uint256',
          name: 'totalCollateralBase',
          type: 'uint256',
        },
        { internalType: 'uint256', name: 'totalDebtBase', type: 'uint256' },
        {
          internalType: 'uint256',
          name: 'availableBorrowsBase',
          type: 'uint256',
        },
        {
          internalType: 'uint256',
          name: 'currentLiquidationThreshold',
          type: 'uint256',
        },
        { internalType: 'uint256', name: 'ltv', type: 'uint256' },
        { internalType: 'uint256', name: 'healthFactor', type: 'uint256' },
      ],
      stateMutability: 'view',
      type: 'function',
    },
  })

  // no borrowed balance
  if (ethers.constants.MaxUint256.eq(healthFactor)) {
    return
  }

  const healthFactorFloat = parseFloat(ethers.utils.formatUnits(healthFactor, 18))

  // TODO: return other metadata like LTV, available borrow etc
  return healthFactorFloat
}
