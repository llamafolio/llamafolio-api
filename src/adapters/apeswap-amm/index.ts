import { Adapter } from "@lib/adapter";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getPairsBalances } from "@lib/uniswap/v2/pair";
import { Contract } from "@lib/adapter";

const adapter: Adapter = {
  id: "apeswap-amm",
  async getContracts() {
    const UniPairsPolygon = await getPairsContracts({
      chain: "polygon",
      factoryAddress: "0xcf083be4164828f00cae704ec15a36d711491284",
      length: 100,
    });

    const UniPairsBSC = await getPairsContracts({
      chain: "bsc",
      factoryAddress: "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6",
      length: 100,
    });

    const UniPairsETH = await getPairsContracts({
      chain: "ethereum",
      factoryAddress: "0xBAe5dc9B19004883d0377419FeF3c2C8832d7d7B",
      length: 100,
    });

    return {
      contracts: [...UniPairsPolygon, ...UniPairsBSC, ...UniPairsETH],
      revalidate: 60 * 60,
    };
  },

  async getBalances(ctx, contracts) {
    const UniPairsPolygonPools: Contract[] = [];
    const UniPairsBSCPools: Contract[] = [];
    const UniPairsETHPools: Contract[] = [];

    for (const contract of contracts) {
      switch (contract.chain) {
        case "polygon":
          UniPairsPolygonPools.push(contract);
          break;

        case "bsc":
          UniPairsBSCPools.push(contract);
          break;

        case "ethereum":
          UniPairsETHPools.push(contract);
          break;

        default:
          null;
      }
    }

    const [balancesPolygon, balancesBSC, balancesETH] = await Promise.all([
      getPairsBalances(ctx, "polygon", UniPairsPolygonPools),
      getPairsBalances(ctx, "bsc", UniPairsBSCPools),
      getPairsBalances(ctx, "ethereum", UniPairsETHPools),
    ]);

    const balances = [...balancesPolygon, ...balancesBSC, ...balancesETH];

    return {
      balances,
    };
  },
};

export default adapter;
