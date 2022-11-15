import { ethers, BigNumber } from "ethers";
import { Chain, providers } from "@lib/providers";
import { Balance, BaseContext, Contract } from "@lib/adapter";
import { getERC20Balances } from "@lib/erc20";
import GMXStakerAbi from "./abis/GMXStaker.json";

const GMXTokens = [
  "0xfc5a1a6eb076a2c7ad06ed22c90d7e710e35ad0a",
  "0xf42Ae1D54fd613C9bb14810b0588FaAa09a426cA", //sGMX
];

export async function getStakeBalances(
  ctx: BaseContext,
  chain: Chain,
  contracts: Contract[]
): Promise<Balance[]> {
  const provider = providers[chain];
  const balances = [];

  for (var i = 0; i < contracts.length; i++) {
    const contract = contracts[i];

    if (contract.name === "sGLP") {
      const sGLP = (await getERC20Balances(ctx, chain, [contract.address]))[0];

      const GMXStaker = new ethers.Contract(
        "0x4e971a87900b931ff39d1aad67697f49835400b6",
        GMXStakerAbi,
        provider
      );

      const pendingETHRewards = await GMXStaker.claimable(ctx.address);

      balances.push({
        chain,
        category: "stake",
        symbol: sGLP.symbol,
        decimals: sGLP.decimals,
        address: sGLP.address,
        amount: BigNumber.from(sGLP.amount),
        priceSubstitute: "0x4277f8F2c384827B5273592FF7CeBd9f2C1ac258",
        yieldKey: "0x1aDDD80E6039594eE970E5872D247bf0414C8903",
        rewards: [
          {
            chain,
            symbol: "WETH",
            decimals: 18,
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            amount: BigNumber.from(pendingETHRewards),
          },
        ],
      });
    }

    if (contract.name === "sGMX") {
      const GMXStaker = new ethers.Contract(
        contract.address,
        GMXStakerAbi,
        provider
      );

      //you can stake GMX and esGMX
      const stakedGMX = await GMXStaker.depositBalances(
        ctx.address,
        GMXTokens[0]
      );

      //either assets earn ETH and GMX
      const pendingesGMXRewards = await GMXStaker.claimable(ctx.address);

      const GMXStakerFees = new ethers.Contract(
        "0xd2D1162512F927a7e282Ef43a362659E4F2a728F",
        GMXStakerAbi,
        provider
      );

      const pendingETHRewardsFromGMX = await GMXStakerFees.claimable(
        ctx.address
      );

      balances.push({
        chain,
        category: "stake",
        symbol: "GMX",
        decimals: 18,
        address: GMXTokens[0],
        amount: BigNumber.from(stakedGMX),
        yieldKey: "0x908C4D94D34924765f1eDc22A1DD098397c59dD4",
        rewards: [
          {
            chain,
            symbol: "GMX",
            decimals: 18,
            address: GMXTokens[0],
            amount: BigNumber.from(pendingesGMXRewards),
          },
          {
            chain,
            symbol: "WETH",
            decimals: 18,
            address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
            amount: BigNumber.from(pendingETHRewardsFromGMX),
          },
        ],
      });

      const stakedesGMX = await GMXStaker.depositBalances(
        ctx.address,
        GMXTokens[1]
      );

      balances.push({
        chain,
        category: "stake",
        symbol: "esGMX",
        decimals: 18,
        address: GMXTokens[1],
        amount: BigNumber.from(stakedesGMX),
        priceSubstitute: GMXTokens[0],
      });
    }
  }

  return balances;
}
