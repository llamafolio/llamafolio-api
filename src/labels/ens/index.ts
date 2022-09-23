import { ethers } from "ethers";

export function fetchENSName(address: string) {
  const provider = ethers.getDefaultProvider();

  return provider.lookupAddress(address);
}
