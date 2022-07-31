export type Balance = {
  chain: string;
  address: string;
  amount: string;
  decimals: number;
};

export type Context = {
  // TODO: rename to 'address' ?
  account: string;
};

export type Call = {
  chain: string;
  target: string;
  params: any[];
  abi: object | string;
};

export type Fetcher = {
  chain: string;
  address: string;

  getCalls?: (ctx: Context) => Call[];
  getBalances: (ctx: Context) => Promise<Balance[]> | Balance[];
};

export type Category = "lend" | "borrow" | "farm";

export type Group = {
  category: Category;
};

export interface Adapter {
  name: string;

  // ???
  groups: any[];
  breakdowns: any[];

  // getBalances: (ctx: Context) => Promise<Balance[]>;
}

export function run(adapters: Adapter[]) {}
