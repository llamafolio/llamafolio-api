import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances, getERC20Details } from "@lib/erc20";

import StabilityPoolAbi from "./abis/StabilityPool.json";
import TroveManagerAbi from "./abis/TroveManager.json";


export async function getBalances(ctx, chain, contracts) {

  const balances = []

  const provider = providers[chain]

  for (let index = 0; index < contracts.length; index++) {
    const contract = contracts[index];

    if (contract.name === 'stabPool') {

      const StabilityPool = new ethers.Contract(
        contract.address,
        StabilityPoolAbi,
        provider
      );

      const [LUSDBalance, ETHBalance, LQTYBalance] = await Promise.all(
        [
          StabilityPool.getCompoundedLUSDDeposit(ctx.address),
          StabilityPool.getDepositorETHGain(ctx.address),
          StabilityPool.getDepositorLQTYGain(ctx.address)
        ]
      )


      balances.push({
        chain: chain,
        category: "stake",
        symbol: "LUSD",
        decimals: 18,
        address: contract.address,
        priceSubstitute: "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
        amount: BigNumber.from(LUSDBalance),
      });

      balances.push({
        chain: chain,
        category: "rewards",
        symbol: "LQTY",
        decimals: 18,
        address: "0x6dea81c8171d0ba574754ef6f8b412f2ed88c54d",
        amount: BigNumber.from(LQTYBalance),
        reward: true,
        parent: contract.address
      });

      balances.push({
        chain: chain,
        category: "rewards",
        symbol: "ETH",
        decimals: 18,
        address: "0x0000000000000000000000000000000000000000",
        amount: BigNumber.from(ETHBalance),
        reward: true,
        parent: contract.address
      });





    }

    if (contract.name === 'trove') {
      const TroveManager = new ethers.Contract(
        contract.address,
        TroveManagerAbi,
        provider
      );

      const TroveDetails = await TroveManager.Troves(ctx.address)

      balances.push(
        {
          chain: chain,
          category: "lend",
          symbol: "ETH",
          decimals: 18,
          address: "0x0000000000000000000000000000000000000000",
          amount: BigNumber.from(TroveDetails.coll),
        }
      )

      balances.push(
        {
          chain: chain,
          category: "borrow",
          symbol: "LUSD",
          debt: true,
          decimals: 18,
          address: "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
          amount: BigNumber.from(TroveDetails.debt),
        }
      )
    }
  }

  return balances;


}
