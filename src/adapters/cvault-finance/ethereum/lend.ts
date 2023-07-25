import type { Balance, BalancesContext, Contract } from '@lib/adapter'
import { keyBy } from '@lib/array'
import { call } from '@lib/call'
import type { Token } from '@lib/token'

const abi = {
  userCollaterals: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userCollaterals',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'collateralAddress', type: 'address' },
          { internalType: 'uint256', name: 'amountCollateral', type: 'uint256' },
        ],
        internalType: 'struct Collateral[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  userTotalDebt: {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'userTotalDebt',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
} as const

const assets: { [key: string]: Token } = {
  '0x62359ed7505efc61ff1d56fef82158ccaffa23d7': {
    chain: 'ethereum',
    address: '0x62359ed7505efc61ff1d56fef82158ccaffa23d7',
    decimals: 18,
    symbol: 'CORE',
  },
  '0xf66cd2f8755a21d3c8683a10269f795c0532dd58': {
    chain: 'ethereum',
    address: '0xf66cd2f8755a21d3c8683a10269f795c0532dd58',
    decimals: 18,
    symbol: 'CoreDAO',
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    chain: 'ethereum',
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
    symbol: 'DAI',
  },
}

const DAI: Token = {
  chain: 'ethereum',
  address: '0x6b175474e89094c44da98b954eedeac495271d0f',
  decimals: 18,
  symbol: 'DAI',
}

export async function getCVaultLendBalances(ctx: BalancesContext, lendingPool: Contract): Promise<Balance[]> {
  const balances: Balance[] = []

  const [userLendBalancesRes, userDebtBalances] = await Promise.all([
    call({ ctx, target: lendingPool.address, params: [ctx.address], abi: abi.userCollaterals }),
    call({ ctx, target: lendingPool.address, params: [ctx.address], abi: abi.userTotalDebt }),
  ])

  const userLendBalances: any = keyBy(userLendBalancesRes as any, 'collateralAddress', { lowercase: true })

  for (const key in userLendBalances) {
    if (key in assets) {
      const asset = Object.assign({}, userLendBalances[key], assets[key])

      balances.push({
        ...asset,
        amount: asset.amountCollateral,
        underlyings: undefined,
        rewards: undefined,
        category: 'lend',
      })
    }
  }

  balances.push({ ...DAI, amount: userDebtBalances, underlyings: undefined, rewards: undefined, category: 'borrow' })

  return balances
}
