export type Category =
  | "wallet"
  | "lend"
  | "borrow"
  | "stake"
  | "vest"
  | "lock"
  | "lp"
  | "farm"
  | "reward";

export type CategoryInfo = {
  description: string;
};

export const Categories: Record<Category, CategoryInfo> = {
  wallet: {
    description: "Assets being held in wallet",
  },
  lend: {
    description: "Assets being lent on a protocol",
  },
  borrow: {
    description: "Assets borrowed from a protocol",
  },
  stake: {
    description: "Assets staked on a protocol to generate yield and rewards",
  },
  vest: {
    description: "Assets being vested from a protocol ",
  },
  lock: {
    description: "Assets locked in a protocol",
  },
  lp: {
    description: "Assets being used to provide liquidity to a protocol",
  },
  farm: {
    description: "Assets used to yield rewards on a protocol",
  },
  reward: {
    description: "Assets rewarded by a protocol",
  },
};
