import { getLendingPoolContracts } from '@lib/aave/v2/lending'
import { BaseContext, Contract } from '@lib/adapter'
import { multicall } from '@lib/multicall'
import { ETH_ADDR } from '@lib/token'
import { isSuccess } from '@lib/type'
import { ethers } from 'ethers'

const abi = {
  get_pool_from_lp_token: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_pool_from_lp_token',
    inputs: [{ name: '_token', type: 'address' }],
    outputs: [{ name: '', type: 'address' }],
  },
  get_underlying_coins: {
    stateMutability: 'view',
    type: 'function',
    name: 'get_underlying_coins',
    inputs: [{ name: '_pool', type: 'address' }],
    outputs: [{ name: '', type: 'address[8]' }],
  },
}

interface AddressMap {
  [key: string]: string
}

// Unknown `sTokens` -> Known `curveToken`
const addressMap: AddressMap = {
  '0xEB74FbFbd9d3b190940384867bc984890b96D202': '0x33baeDa08b8afACc4d3d07cf31d49FC1F1f3E893',
  '0xd17dF4734cAC425F64e83DeC1AC4622a4e909405': '0x5a6a4d54456819380173272a5e8e9b9904bdf41b',
  '0x27403B2756E9c2f436FB13e0B188Dd231F1da170': '0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC',
  '0xABad46DcF632351Cc74f2087D9a359Ac3299804a': '0x5282a4eF67D9C33135340fB3289cc1711c13638C',
  '0xc6DC0Bf66e759d4892AEDA7C9d02eB671F2c3016': '0xc25a3a3b969415c80451098fa907ec722572917f',
  '0x001dfC794bf68c47fEC0A3F031c710E71318FA2a': '0x79530603c6fbba2a60f122839a4bf36ba9bdd335',
}

const metaRegistry: Contract = {
  chain: 'ethereum',
  address: '0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC',
}

export async function getSturdyContracts(ctx: BaseContext, lendingPools: Contract[]): Promise<Contract[]> {
  const pools: Contract[] = []
  for (const lendingPool of lendingPools) {
    pools.push(...(await getLendingPoolContracts(ctx, lendingPool)))
  }

  // Sturdy uses underlyings similar to those of Curve with the difference that Defillama does not know the price
  return swapLpTokens(ctx, pools, addressMap)
}

const swapLpTokens = async (ctx: BaseContext, pools: Contract[], addressMap: AddressMap) => {
  pools.forEach((pool) => {
    const underlyings = pool.underlyings as string[]

    if (!underlyings) {
      return
    }

    for (let idx = 0; idx < underlyings.length; idx++) {
      const currentAddress = underlyings[idx]

      if (currentAddress in addressMap) {
        pool.underlyings![idx] = addressMap[currentAddress]
      }
    }
  })

  // Unwrap lpTokens
  return unwrapLpTokens(ctx, pools)
}

const unwrapLpTokens = async (ctx: BaseContext, pools: Contract[]): Promise<Contract[]> => {
  const nonCrvUnderlyingsContracts: Contract[] = []
  const crvUnderlyingsContracts: Contract[] = []

  const poolsAddressesRes = await multicall({
    ctx,
    calls: pools.map((pool) => ({ target: metaRegistry.address, params: [pool.underlyings?.[0] as string] })),
    abi: abi.get_pool_from_lp_token,
  })

  const underlyingsTokensRes = await multicall({
    ctx,
    calls: poolsAddressesRes.map((res) => ({
      target: metaRegistry.address,
      params: [isSuccess(res) ? res.output : null],
    })),
    abi: abi.get_underlying_coins,
  })

  pools.forEach((pool, idx) => {
    const underlyingsTokenRes = underlyingsTokensRes[idx]
    if (!isSuccess(underlyingsTokenRes)) {
      nonCrvUnderlyingsContracts.push({ ...pool })
      return
    }

    const fmtUnderlyings = underlyingsTokenRes.output
      .map((address: string) => address.toLowerCase())
      // response is backfilled with zero addresses: [address0,address1,0x0,0x0...]
      .filter((address: string) => address !== ethers.constants.AddressZero)
      // replace ETH alias
      .map((address: string) => (address === ETH_ADDR ? ethers.constants.AddressZero : address))

    crvUnderlyingsContracts.push({
      ...pool,
      // address: pool.underlyings?.[0] as string,
      lpToken: pool.underlyings?.[0] as string,
      poolAddress: underlyingsTokenRes.input.params[0],
      underlyings: fmtUnderlyings,
    })
  })

  return [...nonCrvUnderlyingsContracts, ...crvUnderlyingsContracts]
}
