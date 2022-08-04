import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import GaugeControllerAbi from "./abis/GaugeController.json";

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

export async function getGauges() {


  const provider = providers["ethereum"];

  const chain = "ethereum" //use ctx there in future

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
        "type": "function",
        "gas": 2160
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
        "type": "function",
        "gas": 1625
      }
  });

  const gaugeTypes = gaugeTypesRes
    .filter(res => res.success)
    .map(res => res.output);

  const gauges = []
  for (var i = 0; i < gaugesList.length; i++) {


    if (typeKeys[gaugeTypes[i]] === chain) {
      gauges.push({
        name: 'Curve Gauge', //get lp token name
        dName: `Curve Gauge`,
        chain: "ethereum",
        type: 'gauge',
        address: gaugesList[i],
        poolAddress: gaugesList[i]
      })
    }
  }
  
  return gauges;
}
