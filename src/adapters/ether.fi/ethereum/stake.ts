import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { mapSuccessFilter } from '@lib/array'
import { multicall } from '@lib/multicall'
import type { Token } from '@lib/token'

const abi = {
  depositInfo: {
    inputs: [{ internalType: 'address', name: '', type: 'address' }],
    name: 'depositInfo',
    outputs: [
      { internalType: 'uint256', name: 'depositTime', type: 'uint256' },
      { internalType: 'uint256', name: 'etherBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'totalERC20Balance', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userToErc20Balance: {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'userToErc20Balance',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const assets: Token[] = [
  { chain: 'ethereum', address: '0xae78736cd615f374d3085123a210448e74fc6393', decimals: 18, symbol: 'rETH' },
  { chain: 'ethereum', address: '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0', decimals: 18, symbol: 'wstETH' },
  { chain: 'ethereum', address: '0xac3e018457b222d93114458476f3e3416abbe38f', decimals: 18, symbol: 'sfrxETH' },
  { chain: 'ethereum', address: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704', decimals: 18, symbol: 'cbETH' },
  { chain: 'ethereum', address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', decimals: 18, symbol: 'WETH' },
]

const assetByAddress: { [key: string]: Token } = {}
assets.forEach((asset) => {
  assetByAddress[asset.address] = asset
})

export async function getEtherBalances(ctx: BalancesContext, staker: Contract): Promise<Balance[]> {
  const userEthBalances = await multicall({
    ctx,
    calls: assets.map((asset) => ({ target: staker.address, params: [ctx.address, asset.address] } as const)),
    abi: abi.userToErc20Balance,
  })

  return mapSuccessFilter(userEthBalances, (res) => ({
    ...staker,
    decimals: 18,
    amount: res.output,
    underlyings: [assetByAddress[res.input.params[1]]],
    rewards: undefined,
    category: 'stake',
  }))
}
