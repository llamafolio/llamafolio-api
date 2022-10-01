import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import GaugeControllerAbi from "./abis/GaugeController.json";
import { getERC20Details } from "@lib/erc20";
import { Balance, BaseContext, Contract } from "@lib/adapter";

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

export async function getGaugesContracts(chain: Chain) {
  const provider = providers[chain];

  const gaugeController = new ethers.Contract(
    "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
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
    },
  });

  const gaugesList = gaugesListRes
    .filter((res) => res.success)
    .map((res) => res.output);

  calls = [];
  for (var i = 0; i < gaugesList.length; i++) {
    calls.push({
      params: gaugesList[i],
      target: gaugeController.address,
    });
  }

  const gaugeTypesRes = await multicall({
    chain,
    calls,
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
    },
  });

  const gauges: Contract[] = [];

  for (var i = 0; i < gaugesList.length; i++) {
    const gaugeType = gaugeTypesRes.find(
      (o) => o.input.params[0] === gaugesList[i]
    );

    if (gaugeType.output !== null) {
      if (typeKeys[gaugeType.output] === chain) {
        gauges.push({
          chain: chain,
          type: "gauge",
          address: gaugesList[i],
          poolAddress: gaugesList[i],
        });
      }
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

  const lpTokens = lpTokensRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const lpTokenDetails = await getERC20Details(chain, lpTokens);

  for (let i = 0; i < gauges.length; i++) {
    const token = lpTokensRes.find(
      (o) => o.input.target.toLowerCase() === gauges[i].address.toLowerCase()
    );

    const tokenDetail = lpTokenDetails.find(
      (o) => o.address.toLowerCase() === token?.output?.toLowerCase()
    );

    if (tokenDetail) {
      gauges[i].name = tokenDetail.symbol;
      gauges[i].displayName = `Curve.fi Gauge ${tokenDetail.symbol}`;
      gauges[i].priceSubstitute = token.output;
      gauges[i].underlyings = [tokenDetail];
    } else {
      console.log(`Could not load LP token for gauge: ${gauges[i].address}`);
    }
  }

  return gauges;
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
    abi: {
      constant: true,
      inputs: [{ internalType: "address", name: "", type: "address" }],
      name: "balanceOf",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
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
  });

  for (let i = 0; i < gauges.length; i++) {
    if (!gaugeBalancesListRes[i].success && !claimableTokensRes[i].success) {
      console.log(`Failed to get balance for ${gauges[i].address}`);
      continue;
    }

    const balance = {
      ...gauges[i],
      category: "stake",
      yieldsAddress: gauges[i].priceSubstitute,
    };

    // amount
    balance.amount = BigNumber.from(gaugeBalancesListRes[i].output || "0");
    // underlyings
    if (balance.underlyings?.[0]) {
      balance.underlyings[0].amount = balance.amount;
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
