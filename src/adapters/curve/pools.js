import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import AddressGetterABI from "./abis/AddressGetter.json";
import MainRegistryABI from "./abis/MainRegistry.json";


const registryIds = {
  stableswap: 0,
  stableFactory: 3,
  crypto: 5,
  cryptoFactory: 6
};

const chains = [
  "ethereum",
  "polygon",
  "arbitrum",
  "aurora",
  "avax",
  "fantom",
  "optimism",
  "xdai",
  "moonbeam"
];


export async function getAllPools() {

  const provider = providers["ethereum"];

  const addressGetter = new ethers.Contract(
    "0x0000000022d53366457f9d5e68ec105046fc4383",
    AddressGetterABI,
    provider
  );


  let calls = Object.values(registryIds).map(r => ({
      params: [r],
      target: "0x0000000022d53366457f9d5e68ec105046fc4383"
    }))


  const registriesListRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi: {
        "name": "get_address",
        "outputs": [
          {
            "type": "address",
            "name": ""
          }
        ],
        "inputs": [
          {
            "type": "uint256",
            "name": "_id"
          }
        ],
        "stateMutability": "view",
        "type": "function",
        "gas": 1308
      },
  });

  const registriesList = registriesListRes
    .filter(res => res.success)
    .map(res => res.output);



  calls = Object.values(registryIds).map((r, i) => ({
      target: registriesList[i]
  }))

  const registriesPoolCountRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi: {
      "stateMutability": "view",
      "type": "function",
      "name": "pool_count",
      "inputs": [],
      "outputs": [
        {
          "name": "",
          "type": "uint256"
        }
      ],
      "gas": 2138
    },
  });

  const registriesPoolCount = registriesPoolCountRes
    .filter(res => res.success)
    .map(res => res.output);



  const registryMain = new ethers.Contract(
    registriesList[0],
    MainRegistryABI,
    provider
  );

  calls = []
  for (var i = 0; i < registriesPoolCount[0]; i++) {
    calls.push({
      params: [i],
      target: registriesList[0]
    })
  }


  const mainRegistryPoolsRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi:  {
        "stateMutability": "view",
        "type": "function",
        "name": "pool_list",
        "inputs": [
          {
            "name": "arg0",
            "type": "uint256"
          }
        ],
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "gas": 2217
      }
  });

  const mainRegistryPoolsList = mainRegistryPoolsRes
    .filter(res => res.success)
    .map(res => res.output);

  calls = []
  for (var i = 0; i < mainRegistryPoolsList.length; i++) {
    calls.push({
      params: [mainRegistryPoolsList[i]],
      target: registriesList[0]
    })
  }


  const mainPoolsDetailsNamesRes = await multicall({
    chain: "ethereum",
    calls: calls,
    abi:
      {
          "stateMutability": "view",
          "type": "function",
          "name": "get_pool_name",
          "inputs": [
            {
              "name": "_pool",
              "type": "address"
            }
          ],
          "outputs": [
            {
              "name": "",
              "type": "string"
            }
          ],
          "gas": 8323
        }
  });

  const mainPoolsDetailsNames = mainPoolsDetailsNamesRes
    .filter(res => res.success)
    .map(res => res.output);


    const mainPoolLPTokensRes = await multicall({
      chain: "ethereum",
      calls: calls,
      abi: {
          "stateMutability": "view",
          "type": "function",
          "name": "get_lp_token",
          "inputs": [
            {
              "name": "arg0",
              "type": "address"
            }
          ],
          "outputs": [
            {
              "name": "",
              "type": "address"
            }
          ],
          "gas": 2473
        }
    });

    const mainPoolLPTokens = mainPoolLPTokensRes
      .filter(res => res.success)
      .map(res => res.output);


   const formattedPools = mainRegistryPoolsList.map((address, i) => ({
     name: mainPoolsDetailsNames[i],
     dName: `${mainPoolsDetailsNames[i]} Curve Pool`,
     chain: "ethereum",
     address: mainPoolLPTokens[i],
     poolAddress: address
   }));


   return formattedPools
}
