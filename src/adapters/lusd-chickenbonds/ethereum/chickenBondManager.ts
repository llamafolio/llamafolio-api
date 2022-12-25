import { BalancesContext, Contract } from '@lib/adapter'
import { call } from '@lib/call'
import { multicall } from '@lib/multicall'

const chickenBondManager = '0x57619FE9C539f890b19c61812226F9703ce37137'

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
}

export async function getBondNFTContract() {
  const [bondNFTRes, lusdTokenRes, bLUSDTokenRes] = await Promise.all([
    call({
      chain: 'ethereum',
      target: chickenBondManager,
      abi: abi.bondNFT,
    }),
    call({
      chain: 'ethereum',
      target: chickenBondManager,
      abi: abi.lusdToken,
    }),
    call({
      chain: 'ethereum',
      target: chickenBondManager,
      abi: abi.bLUSDToken,
    }),
  ])

  const contract: Contract = {
    chain: 'ethereum',
    address: bondNFTRes.output,
    underlyings: [lusdTokenRes.output],
    rewards: [bLUSDTokenRes.output],
  }

  return contract
}

export function getAccruedBLUSD(ctx: BalancesContext, tokenIDs: number[]) {
  return multicall({
    chain: ctx.chain,
    calls: tokenIDs.map((tokenID) => ({
      target: chickenBondManager,
      params: [tokenID],
    })),
    abi: abi.calcAccruedBLUSD,
  })
}
