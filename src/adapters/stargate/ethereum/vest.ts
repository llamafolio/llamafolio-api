import type { BalancesContext, Contract, VestBalance } from '@lib/adapter'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import type { Token } from '@lib/token'

const abi = {
  VEST_DURATION: {
    inputs: [],
    name: 'VEST_DURATION',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  vestStartTime: {
    inputs: [],
    name: 'vestStartTime',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const STG: Token = {
  chain: 'ethereum',
  address: '0xAf5191B0De278C7286d6C7CC6ab6BB8A73bA2Cd6',
  decimals: 18,
  symbol: 'STG',
}

/**
 *  As we can see on Stargate Dashboard:
 *  This is locked due to our Special event “Auction launch”. This amount is represented on your wallet as aaSTG. 1 aaSTG = 4 STG.
 */

const CONVERTER = 4

export async function getStargateVesterBalances(ctx: BalancesContext, vester: Contract): Promise<VestBalance> {
  const now = Math.floor(Date.now() / 1000)

  const [balancesOfRes, vestStartRes, vestDurationRes] = await Promise.all([
    call({
      ctx,
      target: vester.address,
      params: [ctx.address],
      abi: erc20Abi.balanceOf,
    }),
    call({
      ctx,
      target: vester.address,
      abi: abi.vestStartTime,
    }),
    call({
      ctx,
      target: vester.address,
      abi: abi.VEST_DURATION,
    }),
  ])

  const end = Number(vestStartRes) + Number(vestDurationRes)

  return {
    ...vester,
    amount: balancesOfRes * CONVERTER,
    unlockAt: end,
    claimable: end < now ? balancesOfRes : 0n,
    underlyings: [STG],
    rewards: undefined,
    category: 'vest',
  }
}
