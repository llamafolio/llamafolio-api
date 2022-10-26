import { Chain } from "@defillama/sdk/build/general";
import { Contract } from "@lib/adapter";
import { call } from "@defillama/sdk/build/abi";
import { BigNumber } from "ethers";

const Helper: Contract = {
  name: "TORCurve Helper",
  address: "0x2cFC70B2c114De258F05069c8f8416f6215C4A68",
  chain: "fantom",
};

export async function getRatioTokens(chain: Chain) {
  const shareRes = await call({
    chain,
    target: Helper.address,
    params: [],
    abi: {
      inputs: [],
      name: "getTorAndDaiAndUsdc",
      outputs: [
        { internalType: "uint256", name: "torAmount", type: "uint256" },
        { internalType: "uint256", name: "daiAmount", type: "uint256" },
        { internalType: "uint256", name: "usdcAmount", type: "uint256" },
      ],
      stateMutability: "view",
      type: "function",
    },
  });

  const TORAmount = BigNumber.from(shareRes.output.torAmount);
  const DAIAmount = BigNumber.from(shareRes.output.daiAmount);
  const USDCAmount = BigNumber.from(shareRes.output.usdcAmount);

  const totalToken = TORAmount.add(DAIAmount).add(USDCAmount);

  /**
   *  Mul to prevent underflow from BigNumber, the highter mul is, the highter precision we get on share %
   */

  const TOR = TORAmount.mul(10 ** 8).div(totalToken);
  const DAI = DAIAmount.mul(10 ** 8).div(totalToken);
  const USDC = USDCAmount.mul(10 ** 8).div(totalToken);

  return [TOR, DAI, USDC];
}
