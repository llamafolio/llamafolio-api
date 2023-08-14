import { getPoolsBalances } from '@adapters/uniswap-v3/common/pools'
import type { Balance, BalancesContext, Contract, FarmBalance } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  calculateRedeemOutputs: {
    inputs: [{ internalType: 'uint256', name: '_amount', type: 'uint256' }],
    name: 'calculateRedeemOutputs',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const CASH: Token = {
  chain: 'polygon',
  address: '0x5d066d022ede10efa2717ed3d79f22f949f8c175',
  symbol: 'CASH',
  decimals: 18,
}

const redeemableContract: Contract = {
  chain: 'polygon',
  address: '0x2d62f6d8288994c7900e9c359f8a72e84d17bfba',
}

const DAI: Token = {
  chain: 'polygon',
  address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  decimals: 18,
  symbol: 'DAI',
}

const USDT: Token = {
  chain: 'polygon',
  address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  decimals: 6,
  symbol: 'USDT',
}

const USDC: Token = {
  chain: 'polygon',
  address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  decimals: 6,
  symbol: 'USDC',
}

interface CashBalances extends FarmBalance {
  cashAmount?: bigint
}

export async function getRetroBalances(
  ctx: BalancesContext,
  nonFungiblePositionManager: Contract,
  factory: Contract,
): Promise<Balance[]> {
  const balances: Balance[] = await getPoolsBalances(ctx, nonFungiblePositionManager, factory)
  const fmtBalances: CashBalances[] = []

  let i = 0
  while (i < balances.length) {
    const balance = balances[i]

    if (balance.underlyings && balance.underlyings.length > 0) {
      for (const underlying of balance.underlyings) {
        if (underlying.address.toLowerCase() === CASH.address) {
          fmtBalances.push({ ...(balance as CashBalances), cashAmount: (underlying as Contract).amount })
          balances.splice(i, 1)
          i--
          break
        }
      }
    }
    i++
  }

  const underlyingsBalancesRes = await multicall({
    ctx,
    calls: fmtBalances.map(
      (balance) => ({ target: redeemableContract.address, params: [balance.cashAmount!] }) as const,
    ),
    abi: abi.calculateRedeemOutputs,
  })

  const fmtUnderlyings = (output: readonly bigint[]) => {
    const tokens = [DAI, USDT, USDC]

    return output.map((amount, index) => ({
      ...tokens[index],
      amount,
    }))
  }

  const fmtCash: Contract[][] = mapSuccessFilter(underlyingsBalancesRes, (res) => fmtUnderlyings(res.output))

  for (const [index, fmtBalance] of fmtBalances.entries()) {
    const fmtUnderlyingsWithoutCash = fmtBalance.underlyings?.filter(
      (underlying) => underlying.address.toLowerCase() !== CASH.address,
    )

    if (fmtUnderlyingsWithoutCash) {
      fmtBalance.underlyings = [...fmtUnderlyingsWithoutCash, ...fmtCash[index]]
    }
  }

  return [...balances, ...fmtBalances]
}
