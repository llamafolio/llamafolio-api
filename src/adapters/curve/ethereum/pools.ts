import { multicall } from "../../lib/multicall";
import { ethers, BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";
import AddressGetterABI from "./../abis/AddressGetter.json";





export async function getAllPools() {

  const provider = providers["ethereum"];



  const addressGetter = new ethers.Contract(
    "0x0000000022d53366457f9d5e68ec105046fc4383",
    AddressGetterABI,
    provider
  );

  const mainRegistry = await addressGetter.get_registry()

  console.log(mainRegistry)




}
