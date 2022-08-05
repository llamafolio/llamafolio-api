import { Category } from '@lib/adapter';

export type CategoryInfo = {
  id: number;
  category: Category;
  description: string;
}

// TODO: remove Partial
export const CATEGORIES: Partial<Record<Category, CategoryInfo>> = {
  "wallet": {
    id: 0,
    category: "wallet",
    description: "Assets being held in wallet"
  },
  "lend": {
    id: 1,
    category: "lend",
    description: "Assets being lent on a protocol"
  },
  "borrow": {
    id: 2,
    category: "borrow",
    description: "Assets borrowed from a protocol"
  },
  "stake": {
    id: 3,
    category: "stake",
    description: "Assets staked on a protocol to generate yield and rewards"
  },
  "vest": {
    id: 4,
    category: "vest",
    description: "Assets being vested from a protocol "
  },
  "lock": {
    id: 5,
    category: "lock",
    description: "Assets locked in a protocol"
  },
  "lp": {
    id: 6,
    category: "lp",
    description: "Assets being used to provide liquidity to a protocol"
  },
  "lp-stable": {
    id: 7,
    category: "lp-stable",
    description: "Assets being used to provide liquidity to a protocol on pool with minimal or no impermanent loss"
  },
  "farm": {
    id: 8,
    category: "farm",
    description: "Assets used to yield rewards on a protocol"
  },
}
