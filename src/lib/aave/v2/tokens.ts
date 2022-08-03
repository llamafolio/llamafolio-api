import { ethers } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import { multicall } from "../../multicall";
import { BaseContract } from "../../adapter";
import LendingPoolABI from "./abis/LendingPool.json";

export type GetReserveTokensParams = {
  chain: string;
  lendingPoolAddress: string;
};

export async function getReserveTokens({
  chain,
  lendingPoolAddress,
}: GetReserveTokensParams) {
  const provider = providers[chain];

  const lendingPool = new ethers.Contract(
    lendingPoolAddress,
    LendingPoolABI,
    provider
  );

  const reservesList: string[] = await lendingPool.getReservesList();

  const reservesDataRes = await multicall({
    chain,
    calls: reservesList.map((reserveTokenAddress) => ({
      target: lendingPool.address,
      params: [reserveTokenAddress],
    })),
    abi: {
      inputs: [{ internalType: "address", name: "asset", type: "address" }],
      name: "getReserveData",
      outputs: [
        {
          components: [
            {
              components: [
                { internalType: "uint256", name: "data", type: "uint256" },
              ],
              internalType: "struct DataTypes.ReserveConfigurationMap",
              name: "configuration",
              type: "tuple",
            },
            {
              internalType: "uint128",
              name: "liquidityIndex",
              type: "uint128",
            },
            {
              internalType: "uint128",
              name: "variableBorrowIndex",
              type: "uint128",
            },
            {
              internalType: "uint128",
              name: "currentLiquidityRate",
              type: "uint128",
            },
            {
              internalType: "uint128",
              name: "currentVariableBorrowRate",
              type: "uint128",
            },
            {
              internalType: "uint128",
              name: "currentStableBorrowRate",
              type: "uint128",
            },
            {
              internalType: "uint40",
              name: "lastUpdateTimestamp",
              type: "uint40",
            },
            {
              internalType: "address",
              name: "aTokenAddress",
              type: "address",
            },
            {
              internalType: "address",
              name: "stableDebtTokenAddress",
              type: "address",
            },
            {
              internalType: "address",
              name: "variableDebtTokenAddress",
              type: "address",
            },
            {
              internalType: "address",
              name: "interestRateStrategyAddress",
              type: "address",
            },
            { internalType: "uint8", name: "id", type: "uint8" },
          ],
          internalType: "struct DataTypes.ReserveData",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const reservesData = reservesDataRes.map((res) => res.output);
  const reserveTokens = reservesData.map((reserveData, i) => ({
    underlyingTokenAddress: reservesList[i],
    aTokenAddress: reserveData.aTokenAddress,
    stableDebtTokenAddress: reserveData.stableDebtTokenAddress,
    variableDebtTokenAddress: reserveData.variableDebtTokenAddress,
  }));

  return reserveTokens;
}
