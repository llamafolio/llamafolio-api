import type { Balance, BalancesContext, BorrowBalance, Contract, LendBalance, StakeBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { isNotNullish } from '@lib/type'

const abi = {
  stakes: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'stakes',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getPendingLUSDGain: {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getPendingLUSDGain',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
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
  getCompoundedLUSDDeposit: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'getCompoundedLUSDDeposit',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getDepositorLQTYGain: {
    inputs: [{ internalType: 'address', name: '_depositor', type: 'address' }],
    name: 'getDepositorLQTYGain',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getTroveColl: {
    inputs: [
      { internalType: 'address', name: '_borrower', type: 'address' },
      { internalType: 'address', name: '_collateral', type: 'address' },
    ],
    name: 'getTroveColl',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getTroveDebt: {
    inputs: [
      { internalType: 'address', name: '_borrower', type: 'address' },
      { internalType: 'address', name: '_collateral', type: 'address' },
    ],
    name: 'getTroveDebt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  lastGoodPrice: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'lastGoodPrice',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const ERN: Token = {
  chain: 'optimism',
  address: '0xc5b001dc33727f8f26880b184090d3e252470d45',
  decimals: 18,
  symbol: 'ERN',
}

const OATH: Token = {
  chain: 'optimism',
  address: '0x39fde572a18448f8139b7788099f0a0740f51205',
  symbol: 'OATH',
  decimals: 18,
}

const WBTC: Token = {
  chain: 'optimism',
  address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
  symbol: 'WBTC',
  decimals: 8,
}

const WETH: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000006',
  symbol: 'WETH',
  decimals: 18,
}

const OP: Token = {
  chain: 'optimism',
  address: '0x4200000000000000000000000000000000000042',
  symbol: 'WETH',
  decimals: 18,
}

interface EthosBalance extends StakeBalance {
  vault?: `0x${string}`
  poolId?: `0x${string}`
}

const getBeethovenUnderlyings = async (ctx: BalancesContext, pool: EthosBalance): Promise<Balance> => {
  const [underlyingsBalances, totalSupply] = await Promise.all([
    call({ ctx, target: pool.vault!, params: [pool.poolId!], abi: abi.getPoolTokens }),
    call({ ctx, target: pool.token!, abi: erc20Abi.totalSupply }),
  ])

  pool.underlyings?.forEach((underlying, index) => {
    const [_tokens, amounts] = underlyingsBalances

    ;(underlying as Balance).amount = (amounts[index] * pool.amount) / totalSupply
  })

  return pool
}

export async function getEthosStakeBalance(ctx: BalancesContext, staker: Contract): Promise<Balance> {
  const [userBalance, userPendingReward] = await Promise.all([
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.stakes }),
    call({ ctx, target: staker.address, params: [ctx.address], abi: abi.getPendingLUSDGain }),
  ])

  const balance: EthosBalance = {
    ...staker,
    amount: userBalance,
    underlyings: staker.underlyings as Contract[],
    rewards: [{ ...ERN, amount: userPendingReward }],
    category: 'stake',
  }

  return getBeethovenUnderlyings(ctx, balance)
}

export async function getEthosFarmBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance> {
  const [userBalance, userPendingReward] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.getCompoundedLUSDDeposit }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.getDepositorLQTYGain }),
  ])

  return {
    ...ERN,
    amount: userBalance,
    underlyings: undefined,
    rewards: [{ ...OATH, amount: userPendingReward }],
    category: 'farm',
  }
}

export async function getEthosLendBalances(
  ctx: BalancesContext,
  _borrowerOperations: Contract,
  troveManager: Contract,
): Promise<Balance[]> {
  const [userDepositBalancesRes, userDebtBalancesRes] = await Promise.all([
    multicall({
      ctx,
      calls: [WBTC, WETH, OP].map(
        (token) => ({ target: troveManager.address, params: [ctx.address, token.address] }) as const,
      ),
      abi: abi.getTroveColl,
    }),
    multicall({
      ctx,
      calls: [WBTC, WETH, OP].map(
        (token) => ({ target: troveManager.address, params: [ctx.address, token.address] }) as const,
      ),
      abi: abi.getTroveDebt,
    }),
  ])

  return [WBTC, WETH, OP]
    .map((token, index) => {
      const userDepositBalanceRes = userDepositBalancesRes[index]
      const userDebtBalanceRes = userDebtBalancesRes[index]

      if (!userDepositBalanceRes.success || !userDebtBalanceRes.success) {
        return null
      }

      const lend: LendBalance = {
        ...token,
        amount: userDepositBalanceRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const borrow: BorrowBalance = {
        ...ERN,
        amount: userDebtBalanceRes.output,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return [lend, borrow]
    })
    .filter(isNotNullish)
    .flat()
}
