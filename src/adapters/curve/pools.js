import { multicall } from "../../lib/multicall";
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


  const calls = Object.values(registryIds).map(r => ({
    params: r,
    target: "0x0000000022d53366457f9d5e68ec105046fc4383"
  }))


  const registeredTokensRes = await multicall({
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


  const mainRegistry = await addressGetter.get_registry()

  // const registryMain = new ethers.Contract(
  //   "0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5",
  //   MainRegistryABI,
  //   provider
  // );
  //
  //
  // const poolCount = await registryMain.pool_count()
  // console.log(poolCount)
  //
  //

}
