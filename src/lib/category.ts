export type Category =
  | "wallet"
  | "lend"
  | "borrow"
  | "stake"
  | "vest"
  | "lock"
  | "lp"
  | "farm"
  | "reward"
  | "vestable-reward";

export type CategoryInfo = {
  category: string; // allow adapter-based extra categories
  title: string;
  description: string;
};

export const Categories: Record<Category, CategoryInfo> = {
  wallet: {
    category: "wallet",
    title: "Wallet",
    description: "Assets being held in wallet",
  },
  lend: {
    category: "lend",
    title: "Lending",
    description: "Assets being lent on a protocol",
  },
  borrow: {
    category: "borrow",
    title: "Borrowing",
    description: "Assets borrowed from a protocol",
  },
  stake: {
    category: "stake",
    title: "Staking",
    description: "Assets staked on a protocol to generate yield and rewards",
  },
  vest: {
    category: "vest",
    title: "Vesting",
    description: "Assets being vested from a protocol ",
  },
  lock: {
    category: "lock",
    title: "Locking",
    description: "Assets locked in a protocol",
  },
  lp: {
    category: "lp",
    title: "Liquidity Providing",
    description: "Assets being used to provide liquidity to a protocol",
  },
  farm: {
    category: "farm",
    title: "Farming",
    description: "Assets used to yield rewards on a protocol",
  },
  reward: {
    category: "reward",
    title: "Rewards",
    description: "Assets rewarded by a protocol",
  },
  "vestable-reward": {
    category: "vestable-reward",
    title: "Vestable Rewards",
    description: "Vestable assets rewarded by a protocol",
  },
};
