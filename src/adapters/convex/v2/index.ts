import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getStakeBalances } from "./stake";
import { Token } from "@lib/token";
import { getLockerBalances } from "./locker";

const cvxCRV: Token = {
  chain: "ethereum",
  address: "0x62b9c7356a2dc64a1969e19c23e4f579f9810aa7",
  symbol: "cvxCRV",
  decimals: 18,
};

const CRV: Token = {
  chain: "ethereum",
  address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  symbol: "CRV",
  decimals: 18,
};

const CVX: Token = {
  chain: "ethereum",
  address: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b",
  symbol: "CVX",
  decimals: 18,
};

const lockerContract: Contract = {
  name: "Locker",
  displayName: "Convex Locker",
  chain: "ethereum",
  address: "0x72a19342e8f1838460ebfccef09f6585e32db86e",
  underlyings: [CVX],
};

const cvxCRVStaker: Contract = {
  name: "cvxCRVStaker",
  displayName: "cvxCRV Staker",
  chain: "ethereum",
  address: "0x3fe65692bfcd0e6cf84cb1e7d24108e434a7587e",
  underlyings: [cvxCRV],
  rewards: [CRV, CVX],
};

const getContracts = async () => {
  return {
    contracts: { cvxCRVStaker, lockerContract },
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { cvxCRVStaker, lockerContract }
) => {
  const [stakeBalance, lockedBalance] = await Promise.all([
    getStakeBalances(ctx, "ethereum", cvxCRVStaker),
    getLockerBalances(ctx, "ethereum", lockerContract),
  ]);

  const balances = [...stakeBalance, ...lockedBalance];

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
