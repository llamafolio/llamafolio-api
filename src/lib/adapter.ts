interface Adapter {
  name: string;
  // TODO:
  getBalances: (account: string) => Promise<any>;
}
