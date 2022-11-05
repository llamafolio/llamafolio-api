import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import { getContractsFromUnderlyingsLendingPool } from "./pool";
import { getSuppliedBorrowedBalances } from "./balances";

const lendingPoolFTM: Contract = {
  name: "lendingpool Ftm",
  chain: "fantom",
  address: "0x7220FFD5Dc173BA3717E47033a01d870f06E5284",
};

const dataProviderFTM: Contract = {
  name: "DataProvider Ftm",
  chain: "fantom",
  address: "0x3132870d08f736505FF13B19199be17629085072",
};

const lendingPoolAVAX: Contract = {
  name: "lendingpool Avax",
  chain: "avax",
  address: "0xb702ce183b4e1faa574834715e5d4a6378d0eed3",
};

const dataProviderAVAX: Contract = {
  name: "DataProvider Avax",
  chain: "avax",
  address: "0xed984a0e9c12ee27602314191fc4487a702bb83f",
};

const lendingPoolOPT: Contract = {
  name: "lendingpool Optimism",
  chain: "optimism",
  address: "0x8fd4af47e4e63d1d2d45582c3286b4bd9bb95dfe",
};

const dataProviderOPT: Contract = {
  name: "DataProvider Optimism",
  chain: "optimism",
  address: "0x9546f673ef71ff666ae66d01fd6e7c6dae5a9995",
};

const lendingPoolETH: Contract = {
  name: "lendingpool Eth",
  chain: "ethereum",
  address: "0xb702ce183b4e1faa574834715e5d4a6378d0eed3",
};

const dataProviderETH: Contract = {
  name: "DataProvider Eth",
  chain: "ethereum",
  address: "0x33c62bc416309f010c4941163abea3725e4645bf",
};

const getContracts = async () => {
  const [
    poolsContractsFTM,
    poolsContractsAVAX,
    poolsContractsOPT,
    poolsContractsETH,
  ] = await Promise.all([
    getContractsFromUnderlyingsLendingPool(
      "fantom",
      lendingPoolFTM,
      dataProviderFTM
    ),
    getContractsFromUnderlyingsLendingPool(
      "avax",
      lendingPoolAVAX,
      dataProviderAVAX
    ),
    getContractsFromUnderlyingsLendingPool(
      "optimism",
      lendingPoolOPT,
      dataProviderOPT
    ),
    getContractsFromUnderlyingsLendingPool(
      "ethereum",
      lendingPoolETH,
      dataProviderETH
    ),
  ]);

  return {
    contracts: {
      poolsContractsFTM,
      dataProviderFTM,
      poolsContractsAVAX,
      dataProviderAVAX,
      poolsContractsOPT,
      dataProviderOPT,
      poolsContractsETH,
      dataProviderETH,
    },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  {
    poolsContractsFTM,
    dataProviderFTM,
    poolsContractsAVAX,
    dataProviderAVAX,
    poolsContractsOPT,
    dataProviderOPT,
    poolsContractsETH,
    dataProviderETH,
  }
) => {
  const [balancesFTM, balancesAVAX, balancesOPT, balancesETH] =
    await Promise.all([
      getSuppliedBorrowedBalances(
        ctx,
        "fantom",
        poolsContractsFTM || [],
        dataProviderFTM
      ),
      getSuppliedBorrowedBalances(
        ctx,
        "avax",
        poolsContractsAVAX || [],
        dataProviderAVAX
      ),
      getSuppliedBorrowedBalances(
        ctx,
        "optimism",
        poolsContractsOPT || [],
        dataProviderOPT
      ),
      getSuppliedBorrowedBalances(
        ctx,
        "ethereum",
        poolsContractsETH || [],
        dataProviderETH
      ),
    ]);

  const balances = [
    ...balancesFTM,
    ...balancesAVAX,
    ...balancesOPT,
    ...balancesETH,
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "granary-finance",
  getContracts,
  getBalances,
};

export default adapter;
