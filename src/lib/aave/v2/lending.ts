import { ethers, BigNumber } from "ethers";
import { Chain } from "@lib/providers";
import { multicall } from "@lib/multicall";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";
import { Token } from "@lib/token";
import { call } from "@defillama/sdk/build/abi";

const abi = {
  getReservesList: {
    inputs: [],
    name: "getReservesList",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  getReserveData: {
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
};

export async function getLendingPoolContracts(
  chain: Chain,
  lendingPool: Contract
) {
  try {
    const contracts: Contract[] = [];

    const reservesListRes = await call({
      chain,
      target: lendingPool.address,
      abi: abi.getReservesList,
    });

    const reservesList: string[] = reservesListRes.output;

    const reservesDataRes = await multicall({
      chain,
      calls: reservesList.map((reserveTokenAddress) => ({
        target: lendingPool.address,
        params: [reserveTokenAddress],
      })),
      abi: abi.getReserveData,
    });

    const underlyingTokensAddresses: string[] = [];
    const aTokensAddresses: string[] = [];
    const stableDebtTokenAddresses: string[] = [];
    const variableDebtTokenAddresses: string[] = [];
    const underlyingTokenAddressByAddress: { [key: string]: string } = {};

    for (let i = 0; i < reservesDataRes.length; i++) {
      if (reservesDataRes[i].success) {
        const reserveData = reservesDataRes[i].output;

        const underlyingTokenAddress = reservesList[i].toLowerCase();

        underlyingTokensAddresses.push(underlyingTokenAddress);
        aTokensAddresses.push(reserveData.aTokenAddress);
        stableDebtTokenAddresses.push(reserveData.stableDebtTokenAddress);
        variableDebtTokenAddresses.push(reserveData.variableDebtTokenAddress);

        // map aTokens, stable debt tokens and variable debt tokens to their underlyings
        underlyingTokenAddressByAddress[reserveData.aTokenAddress] =
          underlyingTokenAddress;
        underlyingTokenAddressByAddress[reserveData.stableDebtTokenAddress] =
          underlyingTokenAddress;
        underlyingTokenAddressByAddress[reserveData.variableDebtTokenAddress] =
          underlyingTokenAddress;
      }
    }

    // TODO: 1 multicall to get all ERC20 details at once
    const [underlyingTokens, aTokens, stableDebtTokens, variableDebtTokens] =
      await Promise.all([
        getERC20Details(chain, underlyingTokensAddresses),
        getERC20Details(chain, aTokensAddresses),
        getERC20Details(chain, stableDebtTokenAddresses),
        getERC20Details(chain, variableDebtTokenAddresses),
      ]);

    const underlyingTokenByAddress: { [key: string]: Token } = {};
    for (const token of underlyingTokens) {
      underlyingTokenByAddress[token.address] = token;
    }

    for (let i = 0; i < aTokens.length; i++) {
      const aToken = aTokens[i];

      const underlyingTokenAddress =
        underlyingTokenAddressByAddress[aToken.address];
      const underlyingToken = underlyingTokenByAddress[underlyingTokenAddress];

      if (underlyingToken) {
        contracts.push({
          ...aToken,
          priceSubstitute: underlyingToken.address,
          underlyings: [underlyingToken],
          category: "lend",
        });
      }
    }

    for (let i = 0; i < stableDebtTokens.length; i++) {
      const stableDebtToken = stableDebtTokens[i];

      const underlyingTokenAddress =
        underlyingTokenAddressByAddress[stableDebtToken.address];
      const underlyingToken = underlyingTokenByAddress[underlyingTokenAddress];

      if (underlyingToken) {
        contracts.push({
          ...stableDebtToken,
          priceSubstitute: underlyingToken.address,
          underlyings: [underlyingToken],
          type: "debt",
          category: "borrow",
          stable: true,
        });
      }
    }

    for (let i = 0; i < variableDebtTokens.length; i++) {
      const variableDebtToken = variableDebtTokens[i];

      const underlyingTokenAddress =
        underlyingTokenAddressByAddress[variableDebtToken.address];
      const underlyingToken = underlyingTokenByAddress[underlyingTokenAddress];

      if (underlyingToken) {
        contracts.push({
          ...variableDebtToken,
          priceSubstitute: underlyingToken.address,
          underlyings: [underlyingToken],
          type: "debt",
          category: "borrow",
          stable: false,
        });
      }
    }

    return contracts;
  } catch (error) {
    return [];
  }
}

export async function getLendingPoolBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  try {
    const balances: Balance[] = await getERC20BalanceOf(
      ctx,
      chain,
      contracts as Token[]
    );

    // use the same amount for underlyings
    for (const balance of balances) {
      if (balance.amount.gt(0) && balance.underlyings) {
        balance.underlyings[0] = {
          ...balance.underlyings[0],
          amount: BigNumber.from(balance.amount),
        };
      }
    }

    return balances;
  } catch (error) {
    return [];
  }
}

export async function getLendingPoolHealthFactor(
  ctx: BaseContext,
  chain: Chain,
  lendingPool: Contract
) {
  try {
    const userAccountDataRes = await call({
      chain,
      target: lendingPool.address,
      params: [ctx.address],
      abi: {
        inputs: [{ internalType: "address", name: "user", type: "address" }],
        name: "getUserAccountData",
        outputs: [
          {
            internalType: "uint256",
            name: "totalCollateralBase",
            type: "uint256",
          },
          { internalType: "uint256", name: "totalDebtBase", type: "uint256" },
          {
            internalType: "uint256",
            name: "availableBorrowsBase",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "currentLiquidationThreshold",
            type: "uint256",
          },
          { internalType: "uint256", name: "ltv", type: "uint256" },
          { internalType: "uint256", name: "healthFactor", type: "uint256" },
        ],
        stateMutability: "view",
        type: "function",
      },
    });

    // no borrowed balance
    if (
      ethers.constants.MaxUint256.eq(userAccountDataRes.output.healthFactor)
    ) {
      return;
    }

    const healthFactor = parseFloat(
      ethers.utils.formatUnits(userAccountDataRes.output.healthFactor, 18)
    );

    // TODO: return other metadata like LTV, available borrow etc
    return healthFactor;
  } catch (error) {
    console.log("Failed to get aave-v2 lending pool health factory", error);
    return;
  }
}
