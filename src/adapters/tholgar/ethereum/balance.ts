import type { Balance, BalancesContext, BaseBalance, BaseContract, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getCurrentLockedTokens: {
    stateMutability: 'view',
    type: 'function',
    name: 'getCurrentLockedTokens',
    inputs: [],
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  },
  queuedForWithdrawal: {
    inputs: [
      {
        internalType: 'address',
        name: 'token',
        type: 'address',
      },
    ],
    name: 'queuedForWithdrawal',
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
} as const

const cvx: Token = {
  chain: 'ethereum',
  address: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
  decimals: 18,
  symbol: 'CVX',
}
const aura: Token = {
  chain: 'ethereum',
  address: '0xC0c293ce456fF0ED870ADd98a0828Dd4d2903DBF',
  decimals: 18,
  symbol: 'AURA',
}

const warAuraLocker: Contract = {
  chain: 'ethereum',
  address: '0x7B90e043aaC79AdeA0Dbb0690E3c832757207a3B',
}
const warCvxLocker: Contract = {
  chain: 'ethereum',
  address: '0x700d6d24A55512c6AEC08820B49da4e4193105B3',
}
const warRedeemer: Contract = {
  chain: 'ethereum',
  address: '0x4787Ef084c1d57ED87D58a716d991F8A9CD3828C',
}
const stkWAR: Contract = {
  chain: 'ethereum',
  address: '0xA86c53AF3aadF20bE5d7a8136ACfdbC4B074758A',
  decimals: 18,
  symbol: 'stkWAR',
}

export async function getWarlordVault(ctx: BalancesContext, vault: Contract): Promise<Balance> {
  const [tWarBalance, warBalance] = await multicall({
    ctx,
    abi: erc20Abi.balanceOf,
    calls: [
      {
        target: vault.address,
        params: [ctx.address],
      },
      {
        target: stkWAR.address,
        params: [vault.address],
      },
    ],
  })
  const [tWarTotalSupply, warTotalSupply] = await multicall({
    ctx,
    abi: erc20Abi.totalSupply,
    calls: [vault.address, (vault!.underlyings![0] as BaseContract).address].map(
      (target) =>
        ({
          target,
        }) as const,
    ),
  })
  const [cvxLocked, auraLocked] = await multicall({
    ctx,
    abi: abi.getCurrentLockedTokens,
    calls: [warCvxLocker.address, warAuraLocker.address].map(
      (target) =>
        ({
          target,
        }) as const,
    ),
  })
  const [auraQueued, cvxQueued] = await multicall({
    ctx,
    abi: abi.queuedForWithdrawal,
    calls: [aura.address, cvx.address].map(
      (token) =>
        ({
          target: warRedeemer.address,
          params: [token],
        }) as const,
    ),
  })

  let cvxUserBalanceAmount: bigint = 0n
  let auraUserBalanceAmount: bigint = 0n
  if (warBalance.success && warTotalSupply.success && tWarBalance.success && tWarTotalSupply.success) {
    if (cvxLocked.success && cvxQueued.success) {
      cvxUserBalanceAmount =
        ((((cvxLocked.output - cvxQueued.output) * warBalance.output) / warTotalSupply.output) * tWarBalance.output) /
        tWarTotalSupply.output
    }
    if (auraLocked.success && auraQueued.success) {
      auraUserBalanceAmount =
        ((((auraLocked.output - auraQueued.output) * warBalance.output) / warTotalSupply.output) * tWarBalance.output) /
        tWarTotalSupply.output
    }
  }

  const cvxUserBalance: BaseBalance = {
    amount: cvxUserBalanceAmount,
    token: cvx.address,
    chain: ctx.chain,
    address: cvx.address,
    symbol: cvx.symbol,
    decimals: cvx.decimals,
  }
  const auraUserBalance: BaseBalance = {
    amount: auraUserBalanceAmount,
    token: aura.address,
    chain: ctx.chain,
    address: aura.address,
    symbol: aura.symbol,
    decimals: aura.decimals,
  }

  return {
    ...vault,
    amount: tWarBalance.success ? tWarBalance.output : 0n,
    underlyings: [cvxUserBalance, auraUserBalance],
    category: 'stake',
    rewards: undefined,
  }
}
