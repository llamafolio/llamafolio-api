import { Adapter, Contract } from "@lib/adapter";
import {
  getMarketsContracts,
  getMarketsBalances,
} from "@lib/compound/v2/lending";

const adapter: Adapter = {
  id: "iron-bank",
  async getContracts() {
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
  },

  async getBalances(ctx, contracts) {
    const poolsETH: Contract[] = [];
    const poolsAVAX: Contract[] = [];
    const poolsOPT: Contract[] = [];
    const poolsFTM: Contract[] = [];

    contracts.map((contract) => {
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
    });

    let balancesETH = await getMarketsBalances(ctx, "ethereum", poolsETH);
    let balancesAVAX = await getMarketsBalances(ctx, "avax", poolsAVAX);
    let balancesOPT = await getMarketsBalances(ctx, "optimism", poolsOPT);
    let balancesFTM = await getMarketsBalances(ctx, "fantom", poolsFTM);

    let balances = [
      ...balancesETH,
      ...balancesAVAX,
      ...balancesOPT,
      ...balancesFTM,
    ];

    return {
      balances,
    };
  },
};

export default adapter;
