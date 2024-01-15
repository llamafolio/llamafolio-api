import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapMultiSuccessFilter, mapSuccessFilter, rangeBI } from '@lib/array'
import { call } from '@lib/call'
import { abi as erc20Abi } from '@lib/erc20'
import { parseFloatBI } from '@lib/math'
import { multicall } from '@lib/multicall'

const abi = {
  mintedDyad: {
    inputs: [
      { internalType: 'address', name: '', type: 'address' },
      { internalType: 'uint256', name: '', type: 'uint256' },
    ],
    name: 'mintedDyad',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  tokenOfOwnerByIndex: {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  getVaults: {
    inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'getVaults',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  id2asset: {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'id2asset',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  collatRatio: {
    inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'collatRatio',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const DYAD: Contract = {
  chain: 'ethereum',
  address: '0x305B58c5F6B5b6606fb13edD11FbDD5e532d5A26',
  decimals: 18,
  symbol: 'DYAD',
}

const WETH: Contract = {
  chain: 'ethereum',
  address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
  decimals: 18,
  symbol: 'WETH',
}

const vaultManagerAddress: `0x${string}` = '0xfaa785c041181a54c700fD993CDdC61dbBfb420f'

export async function getDyadNFTBalances(ctx: BalancesContext, dNFT: Contract) {
  const userNFTLength = await call({ ctx, target: dNFT.address, params: [ctx.address], abi: erc20Abi.balanceOf })

  const tokenIds = await multicall({
    ctx,
    calls: rangeBI(0n, userNFTLength).map((i) => ({ target: dNFT.address, params: [ctx.address, i] }) as const),
    abi: abi.tokenOfOwnerByIndex,
  })

  const tokenIdToVaults = await multicall({
    ctx,
    calls: mapSuccessFilter(tokenIds, (res) => ({ target: vaultManagerAddress, params: [res.output] }) as const),
    abi: abi.getVaults,
  })

  const [idToAssetsRes, idToMintsRes, healthsRes] = await Promise.all([
    multicall({
      ctx,
      calls: mapSuccessFilter(
        tokenIdToVaults,
        (res) => ({ target: res.output[0], params: [res.input.params[0]] }) as const,
      ),
      abi: abi.id2asset,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(
        tokenIdToVaults,
        (res) => ({ target: DYAD.address, params: [vaultManagerAddress, res.input.params[0]] }) as const,
      ),
      abi: abi.mintedDyad,
    }),
    multicall({
      ctx,
      calls: mapSuccessFilter(
        tokenIdToVaults,
        (res) => ({ target: vaultManagerAddress, params: [res.input.params[0]] }) as const,
      ),
      abi: abi.collatRatio,
    }),
  ])

  return mapMultiSuccessFilter(
    idToAssetsRes.map((_, i) => [idToAssetsRes[i], idToMintsRes[i], healthsRes[i]]),

    (res) => {
      const [{ output: assetAmount }, { output: dyadAmount }, { output: healthFactorRes }] = res.inputOutputPairs
      const healthFactor = parseFloatBI(healthFactorRes, 18)

      const lend: Balance = {
        ...WETH,
        amount: assetAmount,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      }

      const borrow: Balance = {
        ...DYAD,
        amount: dyadAmount,
        underlyings: undefined,
        rewards: undefined,
        category: 'borrow',
      }

      return { balances: [lend, borrow], healthFactor }
    },
  )
}
