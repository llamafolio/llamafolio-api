import fetch from "node-fetch";
import { Chain, providers } from "@defillama/sdk/build/general";
import { ethers, BigNumber } from "ethers";



export async function fetchENSName(address) {


  const provider = ethers.getDefaultProvider()
  let name = null
  try {
    name = await provider.lookupAddress(address);
    return name

  } catch (e) {
  }

}
