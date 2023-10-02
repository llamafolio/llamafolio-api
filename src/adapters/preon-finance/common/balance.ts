import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import type { Category } from '@lib/category'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  getVessel: {
    inputs: [
      { internalType: 'address', name: '_asset', type: 'address' },
      { internalType: 'address', name: '_borrower', type: 'address' },
    ],
    name: 'getVessel',
    outputs: [
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'uint256', name: '', type: 'uint256' },
      { internalType: 'enum IVesselManager.Status', name: '', type: 'uint8' },
      { internalType: 'uint128', name: '', type: 'uint128' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const STAR: { [key: string]: Token } = {
  arbitrum: {
    chain: 'arbitrum',
    address: '0xc19669a405067927865b40ea045a2baabbbe57f5',
    decimals: 18,
    symbol: 'STAR',
  },
  polygon: {
    chain: 'polygon',
    address: '0xc19669a405067927865b40ea045a2baabbbe57f5',
    decimals: 18,
    symbol: 'STAR',
  },
}

export async function getPreonBalances(
  ctx: BalancesContext,
  assets: Contract[],
  manager: Contract,
): Promise<Balance[][]> {
  const userVessel = await multicall({
    ctx,
    calls: assets.map((asset) => ({ target: manager.address, params: [asset.address, ctx.address] }) as const),
    abi: abi.getVessel,
  })

  return mapSuccessFilter(userVessel, (res, idx) => {
    const asset = assets[idx]
    const [debt, coll] = res.output
    // https://docs.preon.finance/introduction/overview
    const MCR = 1.1

    const lend = createBalance(asset, coll, 'lend', MCR)
    const borrow = createBalance(STAR[ctx.chain], debt, 'borrow')

    return [lend, borrow]
  })
}

function createBalance(asset: Contract, amount: bigint, category: Category, MCR?: number): Balance {
  return {
    ...asset,
    amount,
    underlyings: undefined,
    rewards: undefined,
    MCR,
    category,
  }
}
