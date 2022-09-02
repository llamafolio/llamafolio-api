import { multicall } from "@lib/multicall";
import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@defillama/sdk/build/general";
import { getERC20Balances } from "@lib/erc20";
import GMXStakerAbi from "./abis/GMXStaker.json";


const GMXTokens = [
  "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
  "0xf42Ae1D54fd613C9bb14810b0588FaAa09a426cA" //sGMX
]

export async function getBalances(ctx, chain, contracts) {

  const provider = providers[chain];
  const balances = []

  for (var i = 0; i < contracts.length; i++) {
    const contract = contracts[i]

    if (contract.name === 'sGLP') {
      const sGLP = (await getERC20Balances(ctx, chain, [contract.address]))[0]
      balances.push({
            chain,
            category: "stake",
            symbol: sGLP.symbol,
            decimals: sGLP.decimals,
            address: sGLP.address,
            amount: BigNumber.from(sGLP.amount),
            priceSubstitute: "0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258"
      })

      const GMXStaker = new ethers.Contract(
        "0x4e971a87900b931ff39d1aad67697f49835400b6",
        GMXStakerAbi,
        provider
      );

      const pendingETHRewards = await GMXStaker.claimable(ctx.address)
      balances.push({
            chain,
            category: "rewards",
            symbol: "WETH",
            decimals: 18,
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            amount: BigNumber.from(pendingETHRewards),
            parent: sGLP.address
      })


    }

    if (contract.name === 'sGMX') {
      const GMXStaker = new ethers.Contract(
        contract.address,
        GMXStakerAbi,
        provider
      );
      const stakedGMX = await GMXStaker.depositBalances(ctx.address, GMXTokens[0])

      balances.push({
            chain,
            category: "stake",
            symbol: "GMX",
            decimals: 18,
            address: GMXTokens[0],
            amount: BigNumber.from(stakedGMX),
      })

      const stakedesGMX = await GMXStaker.depositBalances(ctx.address, GMXTokens[1])

      balances.push({
            chain,
            category: "stake",
            symbol: "esGMX",
            decimals: 18,
            address: GMXTokens[1],
            amount: BigNumber.from(stakedesGMX),
            priceSubstitute: GMXTokens[0]
      })


      const pendingesGMXRewards = await GMXStaker.claimable(ctx.address)
      balances.push({
            chain,
            category: "rewards",
            symbol: "GMX",
            decimals: 18,
            address: GMXTokens[0],
            amount: BigNumber.from(pendingesGMXRewards),
            parent: "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a"
      })

      const GMXStakerFees = new ethers.Contract(
        "0xd2D1162512F927a7e282Ef43a362659E4F2a728F",
        GMXStakerAbi,
        provider
      );

      const pendingETHRewardsFromGMX = await GMXStakerFees.claimable(ctx.address)
      balances.push({
            chain,
            category: "rewards",
            symbol: "WETH",
            decimals: 18,
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            amount: BigNumber.from(pendingETHRewardsFromGMX),
            parent: GMXTokens[0]
      })




    }
  }

  return balances;

}
