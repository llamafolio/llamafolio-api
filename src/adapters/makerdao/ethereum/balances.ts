import { Balance, BaseContext, Contract } from '@lib/adapter'
import { Chain } from '@lib/chains'
import { multicall } from '@lib/multicall'
import { Token } from '@lib/token'
import { BigNumber, utils } from 'ethers'

import { cdpid } from './cdpid'

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
  priceSubstitute: string
  spot?: BigNumber
}

export async function getProxiesBalances(
  ctx: BaseContext,
  chain: Chain,
  vat: Contract,
  ilk: Contract,
  spot: Contract,
  cdpids: cdpid[],
) {
  const urnHandlers: UrnHandlerParams[] = []

  for (const cdpid of cdpids) {
    urnHandlers.push(...(await getUrnWithDetailedInfos(chain, ilk, spot, cdpid)))
  }

  return await getUrnsBalances(chain, vat, urnHandlers)
}

const getUrnWithDetailedInfos = async (
  chain: Chain,
  ilk: Contract,
  spot: Contract,
  cdpid: cdpid,
): Promise<UrnHandlerParams[]> => {
  const urnHandlers: UrnHandlerParams[] = []

  /**
   *    Retrieve ilk (Collateral Token) infos
   */

  const [getIlksInfos, getIlksMats] = await Promise.all([
    multicall({
      chain,
      calls: cdpid.ilks.map((asset) => ({
        target: ilk.address,
        params: [asset],
      })),
      abi: {
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
    }),

    multicall({
      chain,
      calls: cdpid.ilks.map((asset) => ({
        target: spot.address,
        params: [asset],
      })),
      abi: {
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
    }),
  ])

  const ilksInfos = getIlksInfos.filter((res) => res.success).map((res) => res.output)
  const ilksMats = getIlksMats.filter((res) => res.success).map((res) => res.output.mat)

  for (let i = 0; i < ilksInfos.length; i++) {
    const ilkInfo = ilksInfos[i]
    const ilkMat = ilksMats[i]
    const urnAddress = cdpid.urns[i]
    const ilkId = cdpid.ilks[i]
    const id = cdpid.ids[i]

    urnHandlers.push({
      chain,
      address: cdpid.address,
      urnAddress,
      proxy: cdpid.proxy,
      id,
      asset: {
        chain,
        name: ilkInfo.name,
        ilkId,
        symbol: ilkInfo.symbol,
        address: ilkInfo.gem,
        decimals: ilkInfo.dec,
        mat: BigNumber.from(ilkMat),
      },
    })
  }

  return urnHandlers
}

const getUrnsBalances = async (chain: Chain, vat: Contract, urnHandlers: UrnHandlerParams[]) => {
  const balances: Balance[] = []

  const [getUrnsBalances, getUrnSupply] = await Promise.all([
    multicall({
      chain,
      calls: urnHandlers.map((urn) => ({
        target: vat.address,
        params: [urn.asset.ilkId, urn.urnAddress],
      })),
      abi: {
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
    }),

    multicall({
      chain,
      calls: urnHandlers.map((urn) => ({
        target: vat.address,
        params: [urn.asset.ilkId],
      })),
      abi: {
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
    }),
  ])

  const userSupplies = getUrnsBalances.filter((res) => res.success).map((res) => BigNumber.from(res.output.ink))
  const userBorrows = getUrnsBalances.filter((res) => res.success).map((res) => BigNumber.from(res.output.art))

  const urnSpots = getUrnSupply.filter((res) => res.success).map((res) => BigNumber.from(res.output.spot))
  const rates = getUrnSupply.filter((res) => res.success).map((res) => BigNumber.from(res.output.rate))

  for (let i = 0; i < urnHandlers.length; i++) {
    const urnHandler = urnHandlers[i]
    const userSupply = userSupplies[i]
    const userBorrow = userBorrows[i]
    const rate = rates[i]
    const urnSpot = urnSpots[i]

    const userBorrowFormatted = userBorrow.mul(rate).div(DECIMALS.ray)

    const lend: BalanceWithExtraProps = {
      chain,
      proxy: urnHandler.proxy,
      urnAddress: urnHandler.address,
      id: urnHandler.id,
      name: urnHandler.asset.name,
      address: urnHandler.address,
      priceSubstitute: urnHandler.asset.address,
      decimals: 18,
      symbol: urnHandler.asset.symbol,
      amount: userSupply,
      mat: urnHandler.asset.mat,
      spot: urnSpot,
      category: 'lend',
    }

    const borrow: BalanceWithExtraProps = {
      chain,
      proxy: urnHandler.proxy,
      decimals: DAI.decimals,
      address: urnHandler.address,
      priceSubstitute: DAI.address,
      symbol: DAI.symbol,
      amount: userBorrowFormatted,
      category: 'borrow',
    }

    balances.push(lend, borrow)
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
