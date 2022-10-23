import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances, getBondBalances } from "./balances";

const sSPA: Contract = {
  name: "Staked Spartacus",
  displayName: "Staked Spartacus",
  chain: "fantom",
  address: "0x8e2549225E21B1Da105563D419d5689b80343E01",
  decimals: 9,
  symbol: "sSPA",
};

const DaiBond: Contract = {
  name: "Spartacus Bond Depository",
  chain: "fantom",
  address: "0x5D449738986ab34280373502031D1513581Cb649",
  symbol: "DAI BOND",
};

const SpaDaiLpBond: Contract = {
  name: "Spartacus Bond Depository",
  chain: "fantom",
  address: "0x8927a01AcBb4820f848711e2B7353d62172053b9",
  symbol: "SPA-DAI LP BOND",
};

const getContracts = async () => {
  const bond: Contract[] = [DaiBond, SpaDaiLpBond];

  return {
    contracts: { sSPA, bond },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { sSPA, bond }
) => {
  const [stakeBalances, bondBalances] = await Promise.all([
    getStakeBalances(ctx, "fantom", sSPA),
    getBondBalances(ctx, "fantom", bond),
  ]);

  const balances = [...stakeBalances, ...bondBalances];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "spartacus",
  getContracts,
  getBalances,
};

export default adapter;
