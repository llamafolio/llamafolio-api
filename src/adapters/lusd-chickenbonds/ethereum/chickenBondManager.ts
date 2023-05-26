import type { BalancesContext, BaseContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

export const chickenBondManager: Contract = {
  chain: 'ethereum',
  address: '0x57619FE9C539f890b19c61812226F9703ce37137',
}

const abi = {
  bondNFT: {
    inputs: [],
    name: 'bondNFT',
    outputs: [{ internalType: 'contract IBondNFT', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  lusdToken: {
    inputs: [],
    name: 'lusdToken',
    outputs: [{ internalType: 'contract ILUSDToken', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  bLUSDToken: {
    inputs: [],
    name: 'bLUSDToken',
    outputs: [{ internalType: 'contract IBLUSDToken', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  calcAccruedBLUSD: {
    inputs: [{ internalType: 'uint256', name: '_bondID', type: 'uint256' }],
    name: 'calcAccruedBLUSD',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

export async function getBondNFTContract(ctx: BaseContext) {
  const [bondNFTRes, lusdTokenRes, bLUSDTokenRes] = await Promise.all([
    call({
      ctx,
      target: chickenBondManager.address,
      abi: abi.bondNFT,
    }),
    call({
      ctx,
      target: chickenBondManager.address,
      abi: abi.lusdToken,
    }),
    call({
      ctx,
      target: chickenBondManager.address,
      abi: abi.bLUSDToken,
    }),
  ])

  const contract: Contract = {
    chain: 'ethereum',
    address: bondNFTRes,
    underlyings: [lusdTokenRes],
    rewards: [bLUSDTokenRes],
  }

  return contract
}

export function getAccruedBLUSD(ctx: BalancesContext, tokenIDs: number[]) {
  return multicall({
    ctx,
    calls: tokenIDs.map((tokenID) => ({
      target: chickenBondManager.address,
      params: [tokenID],
    })),
    abi: abi.calcAccruedBLUSD,
  })
}
