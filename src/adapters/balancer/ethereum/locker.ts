import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
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
  locked__end: {
    stateMutability: 'view',
    type: 'function',
    name: 'locked__end',
    inputs: [{ name: '_addr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  supply: {
    stateMutability: 'view',
    type: 'function',
    name: 'supply',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
} as const

const BAL: Token = {
  chain: 'ethereum',
  address: '0xba100000625a3754423978a60c9317c58a424e3D',
  decimals: 18,
  symbol: 'BAL',
}

const WETH: Token = {
  chain: 'ethereum',
  address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getLockerBalances(
  ctx: BalancesContext,
  votingEscrow: Contract,
  vault: Contract,
): Promise<Balance> {
  const [balanceOf, lockedEnd, totalSupply, poolTokens] = await Promise.all([
    call({ ctx, target: votingEscrow.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: votingEscrow.address, params: [ctx.address], abi: abi.locked__end }),
    call({ ctx, target: votingEscrow.address, abi: erc20Abi.totalSupply }),
    call({
      ctx,
      target: vault.address,
      // bal80-eth20 poolId used to retrieve underlyings Tokens and balances
      params: ['0x5c6ee304399dbdb9c8ef030ab642b10820db8f56000200000000000000000014'],
      abi: abi.getPoolTokens,
    }),
  ])
  const [_tokens, balances, _lastChangeBlock] = poolTokens

  const underlyings0Balances = (balanceOf * balances[0]) / totalSupply

  const underlyings1Balances = (balanceOf * balances[1]) / totalSupply

  const now = Date.now() / 1000
  const unlockAt = Number(lockedEnd)

  return {
    chain: ctx.chain,
    address: votingEscrow.address,
    symbol: votingEscrow.symbol,
    decimals: votingEscrow.decimals,
    amount: balanceOf,
    claimable: now > unlockAt ? balanceOf : 0n,
    unlockAt,
    underlyings: [
      { ...BAL, amount: underlyings0Balances },
      { ...WETH, amount: underlyings1Balances },
    ],
    rewards: undefined,
    category: 'lock',
  }
}
