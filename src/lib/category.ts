export type Category = 'wallet' | 'lend' | 'borrow' | 'stake' | 'vest' | 'lock' | 'lp' | 'farm' | 'farm2' | 'reward'

export interface CategoryInfo {
  category: Category
  title: string
  description: string
}

export const Categories: Record<Category, CategoryInfo> = {
  wallet: {
    category: 'wallet',
    title: 'Wallet',
    description: 'Assets being held in wallet',
  },
  lend: {
    category: 'lend',
    title: 'Lending',
    description: 'Assets being lent on a protocol',
  },
  borrow: {
    category: 'borrow',
    title: 'Borrowing',
    description: 'Assets borrowed from a protocol',
  },
  stake: {
    category: 'stake',
    title: 'Staking',
    description: 'Assets staked on a protocol to generate yield and rewards',
  },
  vest: {
    category: 'vest',
    title: 'Vesting',
    description: 'Assets being vested from a protocol ',
  },
  lock: {
    category: 'lock',
    title: 'Locking',
    description: 'Assets locked in a protocol',
  },
  lp: {
    category: 'lp',
    title: 'Liquidity Providing',
    description: 'Assets being used to provide liquidity to a protocol',
  },
  farm: {
    category: 'farm',
    title: 'Farming',
    description: 'Assets used to yield rewards on a protocol',
  },
  farm2: {
    category: 'farm2',
    title: 'Farming2',
    description: 'Assets used to yield rewards on a protocol',
  },
  reward: {
    category: 'reward',
    title: 'Rewards',
    description: 'Assets rewarded by a protocol',
  },
}
