// @ts-nocheck

import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import GaugeControllerAbi from "./abis/GaugeController.json";
import { getERC20Details } from "@lib/erc20";
import { CATEGORIES } from "@lib/category";
import { BaseContext } from "@lib/adapter";

const typeKeys = {
  0: 'ethereum',
  1: 'fantom',
  2: 'polygon',
  4: 'gnosis',
  5: 'crypto-ethereum',
  7: 'arbitrum',
  8: 'avalanche',
  9: 'harmony',
  10: 'fundraising-gauge'
}


export async function getGaugeBalances(ctx: BaseContext, chain: Chain) {

    const gauges = await getGauges(chain)

    let calls = []
    for (let index = 0; index < gauges.length; index++) {
      const element = gauges[index];
      calls.push({
        params: [ctx.address],
        target: gauges[index].address
      })
    }

    const gaugeBalancesListRes = await multicall({
      chain: "ethereum",
      calls: calls,
      abi:  {
          constant: true,
          inputs: [{ internalType: "address", name: "", type: "address" }],
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          payable: false,
          stateMutability: "view",
          type: "function",
        }
    });


    const gaugeBalancesList = gaugeBalancesListRes
      .filter(res => res.success)
      .map(res => res.output);


    calls = []
    for (let index = 0; index < gauges.length; index++) {
      const element = gauges[index];
      calls.push({
        params: [ctx.address],
        target: gauges[index].address
      })
    }
    const claimableTokensRes = await multicall({
      chain: "ethereum",
      calls: calls,
      abi: {
            "stateMutability": "nonpayable",
            "type": "function",
            "name": "claimable_tokens",
            "inputs": [
              {
                "name": "addr",
                "type": "address"
              }
            ],
            "outputs": [
              {
                "name": "",
                "type": "uint256"
              }
            ],
            "gas": 2683603
        }
    });

    let balances = []

    const pendingRewards = []
    for (let index =  0; index < claimableTokensRes.length; index++) {
      let claimableBalance = claimableTokensRes[index].output
      balances.push(
        {
          chain: chain,
          category: CATEGORIES['liquidity-mining'].category,
          symbol: "CRV",
          parent: "stake",
          poolGenerating: claimableTokensRes[index].input.target.toLowerCase(),
          decimals: 18,
          address: claimableTokensRes[index].input.target,
          priceSubstitute: "0xD533a949740bb3306d119CC777fa900bA034cd52",
          amount: BigNumber.from((claimableBalance > 0)?claimableBalance:0)
        }

      )
    }




    for (let index = 0; index < gaugeBalancesList.length; index++) {

      const balance = gaugeBalancesListRes.find((o) => o.input.target === gauges[index].address);
      if (balance.output !== null) {
        balances.push(
          {
            chain: chain,
            address: gauges[index].address,
            symbol: gauges[index].name,
            decimals: 18,
            amount: BigNumber.from(balance.output),
            category: CATEGORIES['stake'].category,
            priceSubstitute: gauges[index].priceSubstitute,
            yieldsAddress: gauges[index].priceSubstitute,
          }
        )
      } else {
        console.log(`Failed to get balance for ${gauges[index].address}`)
      }
    }

    return balances;

}

export async function getGauges(chain) {

  const provider = providers[chain];


  const gaugeController = new ethers.Contract(
    "0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB",
    GaugeControllerAbi,
    provider
  );


  const gaugeCount = await gaugeController.n_gauges()

  let calls = []
  for (var i = 0; i < gaugeCount; i++) {
    calls.push({
      params: [i],
      target: gaugeController.address
    })
  }

  const gaugesListRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi:  {
        "name": "gauges",
        "outputs": [
          {
            "type": "address",
            "name": ""
          }
        ],
        "inputs": [
          {
            "type": "uint256",
            "name": "arg0"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
  });

  const gaugesList = gaugesListRes
    .filter(res => res.success)
    .map(res => res.output);

  calls = []
  for (var i = 0; i < gaugesList.length; i++) {
    calls.push({
      params: gaugesList[i],
      target: gaugeController.address
    })
  }

  const gaugeTypesRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi:  {
        "name": "gauge_types",
        "outputs": [
          {
            "type": "int128",
            "name": ""
          }
        ],
        "inputs": [
          {
            "type": "address",
            "name": "_addr"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      }
  });

  const gaugeTypes = gaugeTypesRes
    .filter(res => res.success)
    .map(res => res.output);

  const gauges = []

  for (var i = 0; i < gaugesList.length; i++) {

    const gaugeType = gaugeTypesRes.find((o) => o.input.params[0] === gaugesList[i]);

    if (gaugeType.output !== null) {
      if (typeKeys[gaugeType.output] === chain) {
        gauges.push({
          chain: chain,
          type: 'gauge',
          address: gaugesList[i],
          poolAddress: gaugesList[i]
        })
      }
    }
  }

  console.log(`Found ${gauges.length} gauges on ${chain}`)


  calls = []
  for (let index = 0; index < gauges.length; index++) {
    calls.push(
      {
        target: gauges[index].address,
      }
    )
  }

  const lpTokensRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi: {
        "stateMutability": "view",
        "type": "function",
        "name": "lp_token",
        "inputs": [],
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ]
      }
  });

  const lpTokens = lpTokensRes
    .filter(res => res.success)
    .map(res => res.output);

    const lpTokenDetails = await getERC20Details(chain, lpTokens)

    for (let index = 0; index < gauges.length; index++) {

      const token = lpTokensRes.find((o) => o.input.target === gauges[index].address);
      const tokenDetail = lpTokenDetails.find((o) => o.address === token.output);

      if (tokenDetail) {
        gauges[index].name = tokenDetail.symbol
        gauges[index].dName = `Curve.fi Gauge ${tokenDetail.symbol}`
        gauges[index].priceSubstitute = token.output
      } else {
        console.log(`Could not load LP token for gauge: ${gauges[index].address}`)
      }

    }

  return gauges;
}
