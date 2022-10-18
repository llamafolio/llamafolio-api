import { Adapter, GetBalancesHandler } from "@lib/adapter";
import { getPairsContracts } from "@lib/uniswap/v2/factory";
import { getPairsBalances } from "@lib/uniswap/v2/pair";

const getContracts = async () => {
  const [pairsPolygon, pairsBSC, pairsETH] = await Promise.all([
    getPairsContracts({
      chain: "polygon",
      factoryAddress: "0xcf083be4164828f00cae704ec15a36d711491284",
      length: 100,
    }),
    getPairsContracts({
      chain: "bsc",
      factoryAddress: "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6",
      length: 100,
    }),
    getPairsContracts({
      chain: "ethereum",
      factoryAddress: "0xBAe5dc9B19004883d0377419FeF3c2C8832d7d7B",
      length: 100,
    }),
  ]);

  return {
    contracts: { pairsPolygon, pairsBSC, pairsETH },
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { pairsPolygon, pairsBSC, pairsETH }
) => {
  const balances = (
    await Promise.all([
      getPairsBalances(ctx, "polygon", pairsPolygon || []),
      getPairsBalances(ctx, "bsc", pairsBSC || []),
      getPairsBalances(ctx, "ethereum", pairsETH || []),
    ])
  ).flat();

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "apeswap-amm",
  getContracts,
  getBalances,
};

export default adapter;
