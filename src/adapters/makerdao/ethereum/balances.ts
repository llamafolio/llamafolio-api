import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'

import { cdpid } from './cdpid'

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
}

const DECIMALS = {
  wad: utils.parseEther('1.0'), // 10 ** 18,
  ray: utils.parseEther('1000000000'), //  10 ** 27
}

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

interface UrnHandlerParams {
  chain: Chain
  address: string
  urnAddress: string
  proxy: string
  id: string
  asset: Contract
}

export interface BalanceWithExtraProps extends Balance {
  proxy: string
  urnAddress?: string
  id?: string
  mat?: BigNumber
  spot?: BigNumber
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
      calls: cdpids.flatMap((cdpid) =>
        cdpid.ilks.map((asset) => ({
          target: ilk.address,
          params: [asset],
        })),
      ),
      abi: abi.ilkData,
    }),
    multicall({
      ctx,
      calls: cdpids.flatMap((cdpid) =>
        cdpid.ilks.map((asset) => ({
          target: spot.address,
          params: [asset],
        })),
      ),
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

      if (isSuccess(ilkInfoRes) && isSuccess(ilkMatRes)) {
        const ilkInfo = ilkInfoRes.output
        const ilkMat = ilkMatRes.output.mat

        urnHandlers.push({
          chain: ctx.chain,
          address: cdpid.address,
          urnAddress,
          proxy: cdpid.proxy,
          id,
          asset: {
            chain: ctx.chain,
            name: ilkInfo.name,
            ilkId,
            symbol: ilkInfo.symbol,
            address: ilkInfo.gem,
            decimals: ilkInfo.dec,
            mat: BigNumber.from(ilkMat),
          },
        })
      }

      callIdx++
    }
  }

  return getUrnsBalances(ctx, vat, urnHandlers)
}

const getUrnsBalances = async (ctx: BalancesContext, vat: Contract, urnHandlers: UrnHandlerParams[]) => {
  const balances: Balance[] = []

  const [urnsRes, ilksRes] = await Promise.all([
    multicall({
      ctx,
      calls: urnHandlers.map((urn) => ({
        target: vat.address,
        params: [urn.asset.ilkId, urn.urnAddress],
      })),
      abi: abi.urns,
    }),
    multicall({
      ctx,
      calls: urnHandlers.map((urn) => ({
        target: vat.address,
        params: [urn.asset.ilkId],
      })),
      abi: abi.vatIlks,
    }),
  ])

  for (let i = 0; i < urnHandlers.length; i++) {
    const urnHandler = urnHandlers[i]
    const urnRes = urnsRes[i]
    const ilkRes = ilksRes[i]

    if (isSuccess(urnRes) && isSuccess(ilkRes)) {
      const userSupply = BigNumber.from(urnRes.output.ink)
      const userBorrow = BigNumber.from(urnRes.output.art)
      const urnSpot = BigNumber.from(ilkRes.output.spot)
      const rate = BigNumber.from(ilkRes.output.rate)

      const userBorrowFormatted = userBorrow.mul(rate).div(DECIMALS.ray)

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

      balances.push(lend, borrow)
    }
  }

  return balances
}

export function getHealthFactor(balances: BalanceWithExtraProps[]): number[] | undefined {
  const healthFactor: number[] = []
  const nonZeroBalances = balances.filter((balance) => balance.amount.gt(0))

  const lends = nonZeroBalances.filter((lend) => lend.category === 'lend')
  const borrows = nonZeroBalances.filter((lend) => lend.category === 'borrow')

  if (borrows.length === 0) {
    return
  }

  for (let i = 0; i < lends.length; i++) {
    const lend = lends[i]
    const borrow = borrows[i]

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

    if (lend.mat && lend.spot && borrow.amount.gt(0)) {
      const PRECISION_FACTOR = 1000 // to prevent the risk of rounding numbers since BigNumber hates floating numbers
      const collateralizationRatio = lend.amount
        .mul(PRECISION_FACTOR)
        .mul(lend.mat)
        .div(DECIMALS.ray)
        .mul(lend.spot)
        .div(DECIMALS.ray)
        .div(borrow.amount)

      healthFactor.push(+collateralizationRatio / PRECISION_FACTOR)
    }
  }
  return healthFactor
}
