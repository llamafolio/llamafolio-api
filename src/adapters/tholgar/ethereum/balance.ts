import type { Balance, BalancesContext, BaseBalance, BaseContract, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { call } from '@lib/call'
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

export async function getWarlordVault(ctx: BalancesContext, vault: Contract, lockers: Contract[]): Promise<Balance> {
  const [tWarBalance, warBalance, tWarTotalSupply, warTotalSupply, tokensLocked, tokensQueued] = await Promise.all([
    call({
      ctx,
      target: vault.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),
    call({
      ctx,
      target: stkWAR.address,
      params: [vault.address],
      abi: erc20Abi.balanceOf,
    }),
    call({
      ctx,
      target: vault.address,
      abi: erc20Abi.totalSupply,
    }),
    call({
      ctx,
      target: (vault!.underlyings![0] as BaseContract).address,
      abi: erc20Abi.totalSupply,
    }),
    multicall({
      ctx,
      abi: abi.getCurrentLockedTokens,
      calls: lockers.map((locker) => ({ target: locker.address })),
    }),
    multicall({
      ctx,
      calls: [aura, cvx].map((token) => ({ target: warRedeemer.address, params: [token.address] }) as const),
      abi: abi.queuedForWithdrawal,
    }),
  ])

  const [auraLocked, cvxLocked] = mapSuccessFilter(tokensLocked, (res) => (res.output > 0n ? res.output : 0n))
  const [auraQueued, cvxQueued] = mapSuccessFilter(tokensQueued, (res) => (res.output > 0n ? res.output : 0n))

  const auraUserBalance: BaseBalance = {
    ...aura,
    amount: ((((auraLocked - auraQueued) * warBalance) / warTotalSupply) * tWarBalance) / tWarTotalSupply,
  }

  const cvxUserBalance: BaseBalance = {
    ...cvx,
    amount: ((((cvxLocked - cvxQueued) * warBalance) / warTotalSupply) * tWarBalance) / tWarTotalSupply,
  }

  return {
    ...vault,
    amount: tWarBalance,
    underlyings: [cvxUserBalance, auraUserBalance],
    category: 'stake',
    rewards: undefined,
  }
}
