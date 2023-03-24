import { Balance, BalancesContext, Contract } from '@lib/adapter'
import { abi as erc20Abi } from '@lib/erc20'
import { multicall } from '@lib/multicall'
import { isSuccess } from '@lib/type'
import { BigNumber, utils } from 'ethers'
import { keyBy } from 'lodash'

const abi = {
  earned: {
    inputs: [
      { internalType: 'address', name: '_rewardsToken', type: 'address' },
      { internalType: 'address', name: 'account', type: 'address' },
    ],
    name: 'earned',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  exchangeRateCurrent: {
    constant: false,
    inputs: [],
    name: 'exchangeRateCurrent',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
}

const pools: Contract[] = [
  {
    chain: 'optimism',
    address: '0x17533a1bde957979e3977ebbfbc31e6deeb25c7d',
    decimals: 8,
    symbol: 'iWETH',
    staker: '0xf75e85e9127039b4cf818118cc8c5b257edf6684',
    underlyings: [
      { chain: 'optimism', address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    ],
    rewards: ['0x00a35fd824c717879bf370e70ac6868b95870dfb '],
  },
  {
    chain: 'optimism',
    address: '0x4645e0952678e9566fb529d9313f5730e4e1c412',
    decimals: 8,
    symbol: 'iOP',
    staker: '0x553d42d966bf57a50f2d3a48a999845295309fbf',
    underlyings: [
      { chain: 'optimism', address: '0x4200000000000000000000000000000000000042', decimals: 18, symbol: 'OP' },
    ],
    rewards: ['0x00a35fd824c717879bf370e70ac6868b95870dfb '],
  },
  {
    chain: 'optimism',
    address: '0x1d073cf59ae0c169cbc58b6fdd518822ae89173a',
    decimals: 8,
    symbol: 'iUSDC',
    staker: '0x100be116e7d934268db5dfcfad54cb221504c479',
    underlyings: [
      { chain: 'optimism', address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607', decimals: 6, symbol: 'USDC' },
    ],
    rewards: ['0x00a35fd824c717879bf370e70ac6868b95870dfb '],
  },
  {
    chain: 'optimism',
    address: '0x049e04bee77cffb055f733a138a2f204d3750283',
    decimals: 8,
    symbol: 'iDAI',
    staker: '0xd52df1ea7b51b76cc831ed68ff93e92f80271617',
    underlyings: [
      { chain: 'optimism', address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', decimals: 18, symbol: 'DAI' },
    ],
    rewards: ['0x00a35fd824c717879bf370e70ac6868b95870dfb '],
  },
  {
    chain: 'optimism',
    address: '0x04f0fd3cd03b17a3e5921c0170ca6dd3952841ca',
    decimals: 8,
    symbol: 'iSUSD',
    staker: '0xb548db1746aa5468d444c7231876abdc6bf0bd61',
    underlyings: [
      { chain: 'optimism', address: '0x8c6f28f2f1a3c87f0f938b96d27520d9751ec8d9', decimals: 18, symbol: 'sUSD' },
    ],
    rewards: ['0x00a35fd824c717879bf370e70ac6868b95870dfb '],
  },
  {
    chain: 'optimism',
    address: '0x874c01c2d1767efa01fa54b2ac16be96fad5a742',
    decimals: 8,
    symbol: 'iUSDT',
    staker: '0x46e10daf72233dc9e807c7fa3f808c0eac3909fc',
    underlyings: [
      { chain: 'optimism', address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', decimals: 6, symbol: 'USDT' },
    ],
    rewards: ['0x00a35fd824c717879bf370e70ac6868b95870dfb '],
  },
]

const IB: Contract = {
  chain: 'optimism',
  address: '0x00a35fd824c717879bf370e70ac6868b95870dfb',
  decimals: 18,
  symbol: 'IB',
}

export async function getIronFarmBalances(ctx: BalancesContext, markets: Contract[]): Promise<Balance[]> {
  const contracts: Contract[] = []
  const balances: Balance[] = []

  const stakers = keyBy(pools, 'address')

  for (const market of markets) {
    const staker = stakers[market.address]

    if (staker) {
      contracts.push(staker)
    }
  }

  const [balanceOfsRes, earnedOfsRes, exchangeRatesCurrentsRes] = await Promise.all([
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.staker, params: [ctx.address] })),
      abi: erc20Abi.balanceOf,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.staker, params: [IB.address, ctx.address] })),
      abi: abi.earned,
    }),
    multicall({
      ctx,
      calls: contracts.map((contract) => ({ target: contract.address })),
      abi: abi.exchangeRateCurrent,
    }),
  ])

  for (let marketIdx = 0; marketIdx < contracts.length; marketIdx++) {
    const contract = contracts[marketIdx]
    const underlyings = contract.underlyings as Contract[]
    const balanceOfRes = balanceOfsRes[marketIdx]
    const earnedOfRes = earnedOfsRes[marketIdx]
    const exchangeRatesCurrentRes = exchangeRatesCurrentsRes[marketIdx]

    if (!isSuccess(balanceOfRes) || !isSuccess(earnedOfRes) || !isSuccess(exchangeRatesCurrentRes)) {
      continue
    }

    balances.push({
      ...contract,
      amount: BigNumber.from(balanceOfRes.output).mul(exchangeRatesCurrentRes.output).div(utils.parseEther('1.0')),
      decimals: 18,
      underlyings,
      rewards: [{ ...IB, amount: BigNumber.from(earnedOfRes.output) }],
      category: 'farm',
    })
  }

  return balances
}
