import type { Balance, BalancesContext, BaseBalance, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
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

const warAuraLocker = '0x7B90e043aaC79AdeA0Dbb0690E3c832757207a3B'
const warCvxLocker = '0x700d6d24A55512c6AEC08820B49da4e4193105B3'
const warRedeemerAddress = '0x4787Ef084c1d57ED87D58a716d991F8A9CD3828C'
const stkWarAddress = '0xA86c53AF3aadF20bE5d7a8136ACfdbC4B074758A'

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

export async function getWarlordVault(ctx: BalancesContext, vault: Contract): Promise<Balance> {
  const tWarBalance = await call({ ctx, target: vault.address, abi: erc20Abi.balanceOf, params: [ctx.address] })
  const tWarTotalSupply = await call({ ctx, target: vault.address, abi: erc20Abi.totalSupply })
  const warBalance = await call({ ctx, target: stkWarAddress, abi: erc20Abi.balanceOf, params: [vault.address] })
  const warTotalSupply = await call({ ctx, target: stkWarAddress, abi: erc20Abi.totalSupply })
  const cvxLocked = await call({
    ctx,
    target: warCvxLocker,
    abi: abi.getCurrentLockedTokens,
  })
  const auraLocked = await call({
    ctx,
    target: warAuraLocker,
    abi: abi.getCurrentLockedTokens,
  })
  const auraQueued = await call({
    ctx,
    target: warRedeemerAddress,
    abi: abi.queuedForWithdrawal,
    params: [aura.address],
  })
  const cvxQueued = await call({
    ctx,
    target: warRedeemerAddress,
    abi: abi.queuedForWithdrawal,
    params: [cvx.address],
  })

  const cvxUserBalance: BaseBalance = {
    amount: ((((cvxLocked - cvxQueued) * warBalance) / warTotalSupply) * tWarBalance) / tWarTotalSupply,
    token: cvx.address,
    chain: ctx.chain,
    address: cvx.address,
    symbol: cvx.symbol,
    decimals: cvx.decimals,
  }
  const auraUserBalance: BaseBalance = {
    amount: ((((auraLocked - auraQueued) * warBalance) / warTotalSupply) * tWarBalance) / tWarTotalSupply,
    token: aura.address,
    chain: ctx.chain,
    address: aura.address,
    symbol: aura.symbol,
    decimals: aura.decimals,
  }

  return {
    amount: tWarBalance,
    underlyings: [cvxUserBalance, auraUserBalance],
    category: 'stake',
    chain: ctx.chain,
    address: vault.address,
    symbol: vault.symbol,
  }
}
