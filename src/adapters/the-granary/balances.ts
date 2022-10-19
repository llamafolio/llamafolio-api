import { Chain } from "@defillama/sdk/build/general";
import { Contract, Balance, BaseContext } from "@lib/adapter";
import { multicall } from "@lib/multicall";
import { BigNumber } from "ethers";

export async function getSuppliedBorrowedBalances(
  ctx: BaseContext,
  chain: Chain,
  poolsContracts: Contract[],
  dataProvider: Contract
) {
  const balances: Balance[] = [];

  const calls = poolsContracts.map((token: Contract) => ({
    target: dataProvider.address,
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

  for (let i = 0; i < poolsContracts.length; i++) {
    const suppliedBalances = BigNumber.from(balancesOf[i].currentATokenBalance);
    const borrowedBalances = BigNumber.from(balancesOf[i].currentVariableDebt);

    const supplied: Balance = {
      ...poolsContracts[i],
      amount: suppliedBalances,
      underlyings: [
        { ...poolsContracts[i].underlyings?.[0], amount: suppliedBalances },
      ],
      category: "lend",
    };

    const borrowed: Balance = {
      ...poolsContracts[i],
      amount: borrowedBalances,
      underlyings: [
        { ...poolsContracts[i].underlyings?.[0], amount: borrowedBalances },
      ],
      category: "borrow",
    };

    balances.push(supplied, borrowed);
  }
  return balances;
}
