import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import type { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'
import { parseEther } from 'viem'

import type { cdpid } from './cdpid'

const abi = {
  ilkData: {
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'ilkData',
    outputs: [
      { internalType: 'uint96', name: 'pos', type: 'uint96' },
      { internalType: 'address', name: 'join', type: 'address' },
      { internalType: 'address', name: 'gem', type: 'address' },
      { internalType: 'uint8', name: 'dec', type: 'uint8' },
      { internalType: 'uint96', name: 'class', type: 'uint96' },
      { internalType: 'address', name: 'pip', type: 'address' },
      { internalType: 'address', name: 'xlip', type: 'address' },
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'symbol', type: 'string' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  ilks: {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'ilks',
    outputs: [
      {
        internalType: 'contract PipLike',
        name: 'pip',
        type: 'address',
      },
      { internalType: 'uint256', name: 'mat', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  urns: {
    constant: true,
    inputs: [
      { internalType: 'bytes32', name: '', type: 'bytes32' },
      { internalType: 'address', name: '', type: 'address' },
    ],
    name: 'urns',
    outputs: [
      { internalType: 'uint256', name: 'ink', type: 'uint256' },
      { internalType: 'uint256', name: 'art', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  vatIlks: {
    constant: true,
    inputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    name: 'ilks',
    outputs: [
      { internalType: 'uint256', name: 'Art', type: 'uint256' },
      { internalType: 'uint256', name: 'rate', type: 'uint256' },
      { internalType: 'uint256', name: 'spot', type: 'uint256' },
      { internalType: 'uint256', name: 'line', type: 'uint256' },
      { internalType: 'uint256', name: 'dust', type: 'uint256' },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
} as const

const DECIMALS = {
  wad: parseEther('1.0'), // 10 ** 18,
  ray: parseEther('1000000000'), //  10 ** 27
}

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

interface UrnHandlerParams {
  chain: Chain
  address: `0x${string}`
  urnAddress: `0x${string}`
  proxy: `0x${string}`
  id: bigint
  asset: Contract
}

export type BalanceWithExtraProps = Balance & {
  proxy: string
  urnAddress?: string
  id?: bigint
  mat?: bigint
  spot?: bigint
}

export async function getProxiesBalances(
  ctx: BalancesContext,
  vat: Contract,
  ilk: Contract,
  spot: Contract,
  cdpids: cdpid[],
) {
  const urnHandlers: UrnHandlerParams[] = []

  const [ilksInfosRes, ilksMatsRes] = await Promise.all([
    multicall({
      ctx,
      calls: cdpids.flatMap((cdpid) => cdpid.ilks.map((asset) => ({ target: ilk.address, params: [asset] }) as const)),
      abi: abi.ilkData,
    }),
    multicall({
      ctx,
      calls: cdpids.flatMap((cdpid) => cdpid.ilks.map((asset) => ({ target: spot.address, params: [asset] }) as const)),
      abi: abi.ilks,
    }),
  ])

  let callIdx = 0
  for (let cdpidIdx = 0; cdpidIdx < cdpids.length; cdpidIdx++) {
    const cdpid = cdpids[cdpidIdx]

    for (let ilkIdx = 0; ilkIdx < cdpid.ilks.length; ilkIdx++) {
      const ilkInfoRes = ilksInfosRes[callIdx]
      const ilkMatRes = ilksMatsRes[callIdx]
      const urnAddress = cdpid.urns[ilkIdx]
      const ilkId = cdpid.ilks[ilkIdx]
      const id = cdpid.ids[ilkIdx]

      if (ilkInfoRes.success && ilkMatRes.success) {
        const [_pos, _join, gem, dec, _class, _pip, _xlip, name, symbol] = ilkInfoRes.output
        const [_ilkPip, ilkMat] = ilkMatRes.output

        urnHandlers.push({
          chain: ctx.chain,
          address: cdpid.address,
          urnAddress,
          proxy: cdpid.proxy,
          id,
          asset: {
            chain: ctx.chain,
            name,
            ilkId,
            symbol,
            address: gem,
            decimals: dec,
            mat: ilkMat,
          },
        })
      }

      callIdx++
    }
  }

  return getUrnsBalances(ctx, vat, urnHandlers)
}

const getUrnsBalances = async (ctx: BalancesContext, vat: Contract, urnHandlers: UrnHandlerParams[]) => {
  const balancesGroups: BalanceWithExtraProps[][] = []

  const [urnsRes, ilksRes] = await Promise.all([
    multicall({
      ctx,
      calls: urnHandlers.map((urn) => ({ target: vat.address, params: [urn.asset.ilkId, urn.urnAddress] }) as const),
      abi: abi.urns,
    }),
    multicall({
      ctx,
      calls: urnHandlers.map((urn) => ({ target: vat.address, params: [urn.asset.ilkId] }) as const),
      abi: abi.vatIlks,
    }),
  ])

  for (let i = 0; i < urnHandlers.length; i++) {
    const urnHandler = urnHandlers[i]
    const urnRes = urnsRes[i]
    const ilkRes = ilksRes[i]

    if (urnRes.success && ilkRes.success) {
      const [ink, art] = urnRes.output
      const [_Art, _rate, spot] = ilkRes.output

      const userSupply = ink
      const userBorrow = art
      const urnSpot = spot
      const rate = _rate

      const userBorrowFormatted = (userBorrow * rate) / DECIMALS.ray

      const lend: BalanceWithExtraProps = {
        chain: ctx.chain,
        proxy: urnHandler.proxy,
        urnAddress: urnHandler.address,
        id: urnHandler.id,
        name: urnHandler.asset.name,
        address: urnHandler.address,
        decimals: 18,
        symbol: urnHandler.asset.symbol,
        amount: userSupply,
        mat: urnHandler.asset.mat,
        spot: urnSpot,
        underlyings: [
          {
            chain: ctx.chain,
            amount: userSupply,
            address: urnHandler.asset.address,
            decimals: urnHandler.asset.decimals,
            symbol: urnHandler.asset.symbol,
          },
        ],
        category: 'lend',
      }

      const borrow: BalanceWithExtraProps = {
        chain: ctx.chain,
        proxy: urnHandler.proxy,
        decimals: DAI.decimals,
        address: urnHandler.address,
        underlyings: [{ ...DAI, amount: userBorrowFormatted }],
        symbol: DAI.symbol,
        amount: userBorrowFormatted,
        category: 'borrow',
      }

      balancesGroups.push([lend, borrow])
    }
  }

  return balancesGroups
}

export function getHealthFactor(balancesGroup: BalanceWithExtraProps[]) {
  const [lend, borrow] = balancesGroup

  /**
   * Art: wad
   * rate: ray
   * spot: ray
   * mat: ray
   * formula: Collateralization Ratio = Vat.urn.ink * Vat.ilk.spot * Spot.ilk.mat / (Vat.urn.art * Vat.ilk.rate)
   * Vat.urn.ink = balance.amount (lend)
   * Vat.ilk.spot = balance.spot
   * Spot.ilk.mat = balance.mat
   * (Vat.urn.art * Vat.ilk.rate) = balance.amount (borrow)
   */

  if (lend.mat && lend.spot && borrow.amount > 0n) {
    const PRECISION_FACTOR = 1000n

    const collateralizationRatio =
      (((lend.amount * PRECISION_FACTOR * lend.mat) / DECIMALS.ray) * lend.spot) / DECIMALS.ray / borrow.amount

    return Number(collateralizationRatio) / Number(PRECISION_FACTOR)
  }
}
