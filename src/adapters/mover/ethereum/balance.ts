import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { getUnderlyingBalances } from '@lib/uniswap/v2/pair'

const abi = {
  pendingBonus: {
    inputs: [{ internalType: 'address', name: '_account', type: 'address' }],
    name: 'pendingBonus',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  userInfoMove: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfoMove',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardTally', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userInfoMoveEthLP: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'userInfoMoveEthLP',
    outputs: [
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardTally', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const MOVE: Contract = {
  chain: 'ethereum',
  address: '0x3fa729b4548becbad4eab6ef18413470e6d5324c',
  decimals: 18,
  symbol: 'MOVE',
}

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

export async function getMoverBalance(ctx: BalancesContext, farmer: Contract): Promise<Balance | undefined> {
  const underlyings = farmer.underlyings as Contract[]
  const subUnderlyings = [MOVE, WETH]
  if (!underlyings) return

  const [userShare, [moveAmount], [ethAmount], pendingBonus] = await Promise.all([
    call({ ctx, target: farmer.address, params: [ctx.address], abi: erc20Abi.balanceOf }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.userInfoMove }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.userInfoMoveEthLP }),
    call({ ctx, target: farmer.address, params: [ctx.address], abi: abi.pendingBonus }),
  ])

  const amounts = [moveAmount, ethAmount]

  for (let i = 0; i < underlyings.length; i++) {
    underlyings[i].amount = amounts[i]
  }

  if (underlyings[1] && underlyings[1].amount! > 0n) {
    underlyings[1].underlyings = subUnderlyings
    const [subUnderlyingsBalance] = await getUnderlyingBalances(ctx, [underlyings[1] as Balance])

    underlyings[0].amount! += (subUnderlyingsBalance.underlyings![0] as Contract).amount!
    underlyings[1] = subUnderlyingsBalance.underlyings![1] as Contract
  }

  return {
    ...farmer,
    amount: userShare,
    underlyings,
    rewards: [{ ...(farmer.rewards![0] as Contract), amount: pendingBonus }],
    category: 'stake',
  }
}
