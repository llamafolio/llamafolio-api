import { ethers, BigNumber } from "ethers";
import { multicall } from "@lib/multicall";
import { Chain, providers } from "@defillama/sdk/build/general";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import GaugeControllerAbi from "./abis/GaugeController.json";
import { isNotNullish } from "@lib/type";
import { getBalances } from "@lib/balance";

const abi = {
  gauges: {
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
  },
  gauge_types: {
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
  },
  lp_token: {
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
  balance_of: {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  claimable_tokens: {
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
  totalSupply: {
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
};

const typeKeys = {
  0: "ethereum",
  1: "fantom",
  2: "polygon",
  4: "gnosis",
  5: "crypto-ethereum",
  7: "arbitrum",
  8: "avalanche",
  9: "harmony",
  10: "fundraising-gauge",
};

export async function getGaugesContracts(chain: Chain, pools: Contract[]) {
  const provider = providers[chain];

  const gaugeController = new ethers.Contract(
    "0x2f50d538606fa9edd2b11e2446beb18c9d5846bb",
    GaugeControllerAbi,
    provider
  );

  const gaugeCount = await gaugeController.n_gauges();

  let calls = [];
  for (var i = 0; i < gaugeCount; i++) {
    calls.push({
      params: [i],
      target: gaugeController.address,
    });
  }

  const gaugesListRes = await multicall({
    chain,
    calls,
    abi: abi.gauges,
  });

  const gaugesList = gaugesListRes
    .filter((res) => res.success)
    .map((res) => res.output);

  calls = [];
  for (var i = 0; i < gaugesList.length; i++) {
    calls.push({
      params: [gaugesList[i]],
      target: gaugeController.address,
    });
  }

  const gaugeTypesRes = await multicall({
    chain,
    calls,
    abi: abi.gauge_types,
  });

  const gauges: Contract[] = [];

  for (var i = 0; i < gaugeTypesRes.length; i++) {
    if (
      gaugeTypesRes[i].success &&
      typeKeys[gaugeTypesRes[i].output] === chain
    ) {
      gauges.push({ chain, address: gaugesList[i] });
    }
  }

  console.log(`Found ${gauges.length} gauges on ${chain}`);

  calls = [];
  for (let i = 0; i < gauges.length; i++) {
    calls.push({
      target: gauges[i].address,
    });
  }

  const lpTokensRes = await multicall({
    chain,
    calls,
    abi: abi.lp_token,
  });

  // get pools from lpTokens
  const poolByAddress: { [key: string]: Contract } = {};
  for (const pool of pools) {
    poolByAddress[pool.address.toLowerCase()] = pool;
  }

  return gauges
    .map((gauge, i) => {
      if (!lpTokensRes[i].success) {
        console.log(`Could not load LP token for gauge: ${gauge.address}`);
        return null;
      }

      const lpTokenAddress = lpTokensRes[i].output?.toLowerCase();

      const pool = poolByAddress[lpTokenAddress];
      if (!pool) {
        console.log(`Could not load pool for gauge: ${gauge.address}`);
        return null;
      }

      // gauge.name = tokenDetail.symbol;
      // gauge.displayName = `Curve.fi Gauge ${tokenDetail.symbol}`;
      // gauges[i].priceSubstitute = token.output;
      // gauges[i].underlyings = [tokenDetail];

      return {
        ...gauge,
        // name:
        priceSubstitute: lpTokenAddress,
        lpToken: lpTokenAddress,
        underlyings: pool.underlyings,
        poolAddress: pool.poolAddress,
      };
    })
    .filter(isNotNullish);
}

export async function getGaugeBalances(
  ctx: BaseContext,
  chain: Chain,
  gauges: Contract[]
) {
  const balances: Balance[] = [];

  let calls = [];
  for (let i = 0; i < gauges.length; i++) {
    calls.push({
      params: [ctx.address],
      target: gauges[i].address,
    });
  }

  const gaugeBalancesListRes = await multicall({
    chain,
    calls,
    abi: abi.balance_of,
  });

  calls = [];
  for (let i = 0; i < gauges.length; i++) {
    calls.push({
      params: [],
      target: gauges[i].address,
    });
  }
  const totalSupplyRes = await multicall({
    chain,
    calls,
    abi: abi.totalSupply,
  });

  calls = [];
  for (let i = 0; i < gauges.length; i++) {
    calls.push({
      params: [ctx.address],
      target: gauges[i].address,
    });
  }
  const claimableTokensRes = await multicall({
    chain,
    calls,
    abi: abi.claimable_tokens,
  });

  for (let i = 0; i < gauges.length; i++) {
    if (!gaugeBalancesListRes[i].success || !totalSupplyRes[i].success) {
      console.log(`Failed to get balance for ${gauges[i].address}`);
      continue;
    }

    const balance = {
      ...gauges[i],
      category: "stake",
      yieldKey: gauges[i].priceSubstitute,
    };

    const stakedAmount = BigNumber.from(gaugeBalancesListRes[i].output || "0");
    const totalSupply = BigNumber.from(totalSupplyRes[i].output);

    // amount
    balance.amount = stakedAmount;

    // Underlyings
    if (
      stakedAmount.gt(0) &&
      balance.underlyings?.length > 0 &&
      totalSupply.gt(0)
    ) {
      const underlyingBalances = await getBalances(
        {
          address: balance.poolAddress,
        },
        balance.underlyings
      );

      // no error when fetching balances
      if (underlyingBalances.length === balance.underlyings.length) {
        for (let i = 0; i < balance.underlyings?.length; i++) {
          balance.underlyings[i].amount = stakedAmount
            .mul(underlyingBalances[i].amount)
            .div(totalSupply);
        }
      }
    }

    // CRV rewards
    if (claimableTokensRes[i].success && claimableTokensRes[i].output) {
      const claimableBalance = BigNumber.from(claimableTokensRes[i].output);

      balance.rewards = [
        {
          chain,
          symbol: "CRV",
          decimals: 18,
          address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
          amount: claimableBalance,
          claimable: claimableBalance,
        },
      ];
    }

    balances.push(balance);
  }

  return balances;
}
