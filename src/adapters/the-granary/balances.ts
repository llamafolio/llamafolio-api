import { Chain } from "@defillama/sdk/build/general";
import { Contract, Balance, BaseContext } from "@lib/adapter";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";

const DataProvider: Contract = {
  name: "DataProvider FTM",
  chain: "fantom",
  address: "0x3132870d08f736505FF13B19199be17629085072",
};

export async function getSuppliedBorrowedBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[],
) {
  const balances: Balance[] = [];

  const calls = contracts.map((token: Contract) => ({
    target: DataProvider.address,
    params: [token.underlyings?.[0].address, ctx.address],
  }));

  const balancesOfRes = await multicall({
    chain,
    calls,
    abi: {
      inputs: [
        { internalType: "address", name: "asset", type: "address" },
        { internalType: "address", name: "user", type: "address" },
      ],
      name: "getUserReserveData",
      outputs: [
        {
          internalType: "uint256",
          name: "currentATokenBalance",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "currentStableDebt",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "currentVariableDebt",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "principalStableDebt",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "scaledVariableDebt",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "stableBorrowRate",
          type: "uint256",
        },
        { internalType: "uint256", name: "liquidityRate", type: "uint256" },
        {
          internalType: "uint40",
          name: "stableRateLastUpdated",
          type: "uint40",
        },
        {
          internalType: "bool",
          name: "usageAsCollateralEnabled",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const balancesOf = balancesOfRes
    .filter((res) => res.success)
    .map((res) => res.output);

  for (let i = 0; i < contracts.length; i++) {
    const suppliedBalances = BigNumber.from(balancesOf[i].currentATokenBalance);
    const borrowedBalances = BigNumber.from(balancesOf[i].currentVariableDebt);

    const supplied:Balance = {
      ...contracts[i],
      amount: suppliedBalances,
      underlyings: [
        { ...contracts[i].underlyings?.[0], amount: suppliedBalances },
      ],
      category: "lend",
    };

    const borrowed:Balance = {
      ...contracts[i],
      amount: borrowedBalances,
      underlyings: [
        { ...contracts[i].underlyings?.[0], amount: borrowedBalances },
      ],
      category: "borrow",
    };

    balances.push(supplied, borrowed);
  }
  return balances;
}
