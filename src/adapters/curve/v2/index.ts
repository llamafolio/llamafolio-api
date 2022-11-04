import { Adapter, GetBalancesHandler } from "@lib/adapter";
import { Contract } from "@lib/adapter";
import { getPoolsContracts, getPoolsBalances } from "./pools";
import { Token } from "@lib/token";
import { getLockerBalances } from "./locker";

/**
 * ========== LOCKER ==========
 */

const CRVToken: Token = {
  chain: "ethereum",
  address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  decimals: 18,
  symbol: "CRV",
};

const IIICrvToken: Token = {
  chain: "ethereum",
  address: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
  decimals: 18,
  symbol: "3Crv",
};

const feeDistributorContract: Contract = {
  chain: "ethereum",
  address: "0xa464e6dcda8ac41e03616f95f4bc98a13b8922dc",
  name: "FeeDistributor",
  underlyings: [IIICrvToken],
};

const lockerContract: Contract = {
  chain: "ethereum",
  address: "0x5f3b5dfeb7b28cdbd7faba78963ee202a494e2a2",
  name: "Locker",
  underlyings: [CRVToken],
  rewards: [feeDistributorContract],
};

/**
 * ========== POOL ==========
 */

const MetaRegistry: Contract = {
  chain: "ethereum",
  address: "0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC",
};

/**
 * ==============================
 */

const getContracts = async () => {
  const pools = await getPoolsContracts("ethereum", MetaRegistry);

  return {
    contracts: { pools, MetaRegistry, lockerContract },
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { pools, MetaRegistry, lockerContract }
) => {
  const [lockedBalances, poolsBalances] = await Promise.all([
    getLockerBalances(ctx, "ethereum", lockerContract),
    getPoolsBalances(ctx, "ethereum", pools || [], MetaRegistry),
  ]);

  const balances = [...lockedBalances, ...poolsBalances];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "curve",
  getContracts,
  getBalances,
};

export default adapter;
