import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getMarketsContracts,
  getMarketsBalances,
} from "@lib/compound/v2/lending";

const getContracts = async () => {
  const poolsMarketsETH = await getMarketsContracts("ethereum", {
    // Iron-Bank Unitroller on ETH chain
    comptrollerAddress: "0xAB1c342C7bf5Ec5F02ADEA1c2270670bCa144CbB",
  });

  const poolsMarketsAVAX = await getMarketsContracts("avax", {
    // Iron-Bank Unitroller on AVAX chain
    comptrollerAddress: "0x2eE80614Ccbc5e28654324a66A396458Fa5cD7Cc",
  });

  const poolsMarketsOPT = await getMarketsContracts("optimism", {
    // Iron-Bank Unitroller on Optimism chain
    comptrollerAddress: "0xE0B57FEEd45e7D908f2d0DaCd26F113Cf26715BF",
  });

  const poolsMarketsFTM = await getMarketsContracts("fantom", {
    // Iron-Bank Unitroller on Fantom chain
    comptrollerAddress: "0x4250A6D3BD57455d7C6821eECb6206F507576cD2",
  });

  return {
    contracts: [
      ...poolsMarketsETH,
      ...poolsMarketsAVAX,
      ...poolsMarketsOPT,
      ...poolsMarketsFTM,
    ],
    revalidate: 60 * 60,
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  contracts
) => {
  const poolsETH: Contract[] = [];
  const poolsAVAX: Contract[] = [];
  const poolsOPT: Contract[] = [];
  const poolsFTM: Contract[] = [];

  for (const contract of contracts) {
    switch (contract.chain) {
      case "ethereum":
        poolsETH.push(contract);
        break;

      case "avax":
        poolsAVAX.push(contract);
        break;

      case "optimism":
        poolsOPT.push(contract);
        break;

      case "fantom":
        poolsFTM.push(contract);
        break;

      default:
        null;
    }
  }

  const [balancesETH, balancesAVAX, balancesOPT, balancesFTM] =
    await Promise.all([
      getMarketsBalances(ctx, "ethereum", poolsETH),
      getMarketsBalances(ctx, "avax", poolsAVAX),
      getMarketsBalances(ctx, "optimism", poolsOPT),
      getMarketsBalances(ctx, "fantom", poolsFTM),
    ]);

  const balances = [
    ...balancesETH,
    ...balancesAVAX,
    ...balancesOPT,
    ...balancesFTM,
  ];

  return {
    balances,
  };
};

const adapter: Adapter = {
  id: "iron-bank",
  getContracts,
  getBalances,
};

export default adapter;
