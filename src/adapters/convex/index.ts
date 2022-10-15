import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getAllPools, getPoolBalances } from "./pools";
import { getStakeBalances } from "./stake";

const lockerContract: Contract = {
  name: "Locker",
  displayName: "Convex Locker",
  chain: "ethereum",
  address: "0x72a19342e8f1838460ebfccef09f6585e32db86e",
};

const cvxCRVStakerContract: Contract = {
  name: "cvxCRVStaker",
  displayName: "cvxCRV Staker",
  chain: "ethereum",
  address: "0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e",
};

const getContracts = async () => {
  return {
    contracts: [lockerContract, cvxCRVStakerContract].concat(
      await getAllPools()
    ),
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  let balances = await getPoolBalances(ctx, "ethereum", contracts);

  const stakersBalances = await getStakeBalances(ctx, "ethereum", [
    lockerContract,
    cvxCRVStakerContract,
  ]);
  balances = balances.concat(stakersBalances);

  return {
    balances: balances,
  };
};

const adapter: Adapter = {
  id: "convex-finance",
  getContracts,
  getBalances,
};

export default adapter;
