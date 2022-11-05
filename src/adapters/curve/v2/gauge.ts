import { BigNumber } from "ethers";
import { Calls, multicall } from "@lib/multicall";
import { Chain } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { range } from "@lib/array";
import { Token } from "@lib/token";
import { isNotNullish } from "@lib/type";
import { getERC20BalanceOf, getERC20Details } from "@lib/erc20";

const CRVToken: Token = {
  chain: "ethereum",
  address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  decimals: 18,
  symbol: "CRV",
};

export async function getGaugesContracts(
  chain: Chain,
  pools: Contract[],
  gaugeController?: Contract
) {
  const gauges: Contract[] = [];

  if (!gaugeController) {
    return [];
  }

  try {
    const typeGauges: any = {
      0: "ethereum",
      1: "fantom",
      2: "polygon",
      4: "xDai",
      5: "ethereum (crypto pools)",
      7: "arbitrum",
      8: "avalanche",
      9: "harmony",
      11: "optimism",
    };

    const gaugeContractsCountRes = await call({
      chain,
      target: gaugeController.address,
      params: [],
      abi: {
        name: "n_gauges",
        outputs: [
          {
            type: "int128",
            name: "",
          },
        ],
        inputs: [],
        stateMutability: "view",
        type: "function",
      },
    });

    const gaugeContractsAddressesRes = await multicall({
      chain,
      calls: range(0, gaugeContractsCountRes.output).map((i) => ({
        target: gaugeController.address,
        params: [i],
      })),
      abi: {
        name: "gauges",
        outputs: [
          {
            type: "address",
            name: "",
          },
        ],
        inputs: [
          {
            type: "uint256",
            name: "arg0",
          },
        ],
        stateMutability: "view",
        type: "function",
        gas: 2160,
      },
    });

    const gaugeContractsAddresses = gaugeContractsAddressesRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const gaugesTypesRes = await multicall({
      chain,
      calls: gaugeContractsAddresses.map((address) => ({
        target: gaugeController.address,
        params: [address],
      })),
      abi: {
        name: "gauge_types",
        outputs: [
          {
            type: "int128",
            name: "",
          },
        ],
        inputs: [
          {
            type: "address",
            name: "_addr",
          },
        ],
        stateMutability: "view",
        type: "function",
        gas: 1625,
      },
    });

    const gaugesTypes = gaugesTypesRes
      .filter((res) => res.success)
      .map((res) => res.output);

    for (let i = 0; i < gaugesTypesRes.length; i++) {
      if ((typeGauges[gaugesTypes[i]] as any) === chain) {
        gauges.push({ chain, address: gaugeContractsAddresses[i] });
      }
    }

    const lpTokensAddressesRes = await multicall({
      chain,
      calls: gauges.map((gauge) => ({
        target: gauge.address,
        params: [],
      })),
      abi: {
        stateMutability: "view",
        type: "function",
        name: "lp_token",
        inputs: [],
        outputs: [
          {
            name: "",
            type: "address",
          },
        ],
      },
    });

    const lpTokensAddresses = lpTokensAddressesRes
      .filter((res) => res.success)
      .map((res) => res.output.toLowerCase());

    const poolByAddress: { [key: string]: Contract } = {};
    for (const pool of pools) {
      poolByAddress[pool.address.toLowerCase()] = pool;
    }

    return gauges
      .map((gauge, i) => {
        if (!lpTokensAddresses[i]) {
          return null;
        }

        const pool = poolByAddress[lpTokensAddresses[i]];

        if (!pool) {
          return null;
        }

        return {
          ...gauge,
          lpToken: lpTokensAddresses[i],
          tokens: pool.tokens,
          underlyings: pool.underlyings,
          poolAddress: pool.poolAddress,
        };
      })
      .filter(isNotNullish);
  } catch (error) {
    return [];
  }
}

export async function getGaugesBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
) {
  const balances: Balance[] = [];

  interface BalanceWithExtraProps extends Balance {
    poolAddress: string;
    tokens: Token[];
    underlyings: any;
  }

  const nonEmptyPools: Contract[] = (
    await getERC20BalanceOf(ctx, chain, contracts as Token[])
  ).filter((pool) => pool.amount.gt(0));

  let calls: Calls = [];
  const call = nonEmptyPools.map((contract) => {
    if (contract.underlyings)
      for (let i = 0; i < contract.underlyings.length; i++) {
        calls.push({
          target: contract.poolAddress,
          params: [i],
        });
      }
  });

  const [
    /* gaugeBalancesListRes ,*/ totalSupplyRes,
    claimableTokensRes,
    underlyingsBalancesRes,
  ] = await Promise.all([
    multicall({
      chain,
      calls: nonEmptyPools.map((contract) => ({
        target: contract.address,
        params: [],
      })),
      abi: {
        stateMutability: "view",
        type: "function",
        name: "totalSupply",
        inputs: [],
        outputs: [
          {
            name: "",
            type: "uint256",
          },
        ],
        gas: 3240,
      },
    }),

    multicall({
      chain,
      calls: nonEmptyPools.map((contract) => ({
        target: contract.address,
        params: [ctx.address],
      })),
      abi: {
        stateMutability: "nonpayable",
        type: "function",
        name: "claimable_tokens",
        inputs: [
          {
            name: "addr",
            type: "address",
          },
        ],
        outputs: [
          {
            name: "",
            type: "uint256",
          },
        ],
        gas: 2683603,
      },
    }),

    multicall({
      chain,
      calls,
      abi: {
        name: "balances",
        outputs: [{ type: "uint256", name: "" }],
        inputs: [{ type: "uint256", name: "i" }],
        stateMutability: "view",
        type: "function",
        gas: 5076,
      },
    }),
  ]);

  const totalSupply = totalSupplyRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  const claimableTokens = claimableTokensRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  const underlyingsBalances = underlyingsBalancesRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output));

  for (let i = 0; i < nonEmptyPools.length; i++) {
    const contract = nonEmptyPools[i];

    contract.tokens = await getERC20Details(chain, contract.tokens);

    contract.underlyings = await getERC20Details(
      chain,
      contract.underlyings as any
    );

    /**
     *  Updating pool amounts from the fraction of each underlyings
     */

    const formattedUnderlyings = contract.underlyings?.map((underlying, x) => ({
      ...underlying,
      amount:
        underlying.decimals &&
        contract.amount
          .mul(underlyingsBalances[x].mul(10 ** (18 - underlying.decimals)))
          .div(totalSupply[0]),
      decimals: 18,
    }));

    if (contract.amount !== undefined) {
      const balance: BalanceWithExtraProps = {
        chain,
        decimals: 18,
        symbol: contract.tokens?.map((token: Token) => token.symbol).join("-"),
        address: contract.address,
        poolAddress: contract.poolAddress,
        tokens: contract.tokens,
        underlyings: formattedUnderlyings,
        rewards: [{ ...CRVToken, amount: claimableTokens[0] }],
        amount: contract.amount,
        category: "farm",
        yieldKey: contract.lpToken,
      };

      balances.push(balance);
    }
  }
  console.log(balances)
  return balances;
}
