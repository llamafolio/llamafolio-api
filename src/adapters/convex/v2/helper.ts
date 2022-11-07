import { call } from "@defillama/sdk/build/abi";
import { Chain } from "@defillama/sdk/build/general";
import { BigNumber, utils } from "ethers";
import { Contract } from "@lib/adapter";

export async function getCVXRatio(
  chain: Chain,
  contract?: Contract,
  earnedBalances?: BigNumber
) {
  if (!contract || !earnedBalances) {
    console.log("Missing CVX contract or balance");

    return [];
  }

  const totalSupplyRes = await call({
    chain,
    target: contract.address,
    params: [],
    abi: {
      inputs: [],
      name: "totalSupply",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const cvxTotalSupply = BigNumber.from(totalSupplyRes.output);

  const CLIFFSIZE = BigNumber.from(10 ** 5).mul(utils.parseEther("1.0"));
  const MAXSUPPLY = BigNumber.from(10 ** 8).mul(utils.parseEther("1.0"));
  const CLIFFCOUNT = BigNumber.from(10 ** 3);

  const currentCliff = cvxTotalSupply.div(CLIFFSIZE);

  if (currentCliff.lt(MAXSUPPLY)) {
    const remainingCliff = CLIFFCOUNT.sub(currentCliff);

    return earnedBalances.mul(remainingCliff).div(CLIFFCOUNT);
  }
  return BigNumber.from(0);
}
