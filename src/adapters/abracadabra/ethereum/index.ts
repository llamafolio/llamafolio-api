import { GetBalancesHandler, Contract } from "@lib/adapter";
import {
  getMarketsContracts,
  getMarketsBalances,
  getHealthFactor,
} from "../common/markets";
import { getMStakeContract, getMStakeBalance } from "../common/mStake";
import { getSStakeContract, getSStakeBalance } from "./sStake";

const mSPELL: Contract = {
  name: "mSpellStaking",
  chain: "ethereum",
  address: "0xbD2fBaf2dc95bD78Cf1cD3c5235B33D1165E6797",
  decimals: 18,
  symbol: "mSPELL",
};

const sSPELL: Contract = {
  name: "sSpellStaking",
  chain: "ethereum",
  address: "0x26fa3fffb6efe8c1e69103acb4044c26b9a106a9",
  decimals: 18,
  symbol: "sSPELL",
};

type Chains = "ethereum";

const Cauldron: Record<Chains, string[]> = {
  ethereum: [
    "0x7ce7d9ed62b9a6c5ace1c6ec9aeb115fa3064757",
    "0x7b7473a76D6ae86CE19f7352A1E89F6C9dc39020",
    "0xf179fe36a36B32a4644587B8cdee7A23af98ed37",
    "0x05500e2Ee779329698DF35760bEdcAAC046e7C27",
    "0x003d5A75d284824Af736df51933be522DE9Eed0f",
    "0x98a84EfF6e008c5ed0289655CcdCa899bcb6B99F",
    "0xEBfDe87310dc22404d918058FAa4D56DC4E93f0A",
    "0x0BCa8ebcB26502b013493Bf8fE53aA2B1ED401C1",
    "0x920D9BD936Da4eAFb5E25c6bDC9f6CB528953F9f",
    "0x252dCf1B621Cc53bc22C256255d2bE5C8c32EaE4",
    "0xc1879bf24917ebE531FbAA20b0D05Da027B592ce",
    "0x9617b633EF905860D919b88E1d9d9a6191795341",
    "0xCfc571f3203756319c231d3Bc643Cee807E74636",
    "0x3410297D89dCDAf4072B805EFc1ef701Bb3dd9BF",
    "0x257101F20cB7243E2c7129773eD5dBBcef8B34E0",
    "0x390Db10e65b5ab920C19149C919D970ad9d18A41",
    "0x5ec47EE69BEde0b6C2A2fC0D9d094dF16C192498",
    "0xd31E19A0574dBF09310c3B06f3416661B4Dc7324",
    "0xc6B2b3fE7c3D7a6f823D9106E22e66660709001e",
    "0x53375adD9D2dFE19398eD65BAaEFfe622760A9A6",
    "0x8227965A7f42956549aFaEc319F4E444aa438Df5",
  ],
};

export const getContracts = async () => {
  const [mStakeContracts_eth, sStakeContracts_eth, marketsContracts_eth] =
    await Promise.all([
      getMStakeContract("ethereum", mSPELL),
      getSStakeContract("ethereum", sSPELL),
      getMarketsContracts("ethereum", Cauldron.ethereum),
    ]);

  return {
    contracts: {
      mStakeContracts_eth,
      sStakeContracts_eth,
      marketsContracts_eth,
    },
  };
};

export const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { mStakeContracts_eth, sStakeContracts_eth, marketsContracts_eth }
) => {
  const [mStakeBalances_eth, sStakeBalances_eth, marketsBalances_eth] =
    await Promise.all([
      getMStakeBalance(ctx, "ethereum", mStakeContracts_eth),
      getSStakeBalance(ctx, "ethereum", sStakeContracts_eth),
      getMarketsBalances(ctx, "ethereum", marketsContracts_eth || []),
    ]);

  const healthFactor_eth = await getHealthFactor(marketsBalances_eth || []);

  const balances = [
    ...mStakeBalances_eth,
    ...sStakeBalances_eth,
    ...marketsBalances_eth,
  ];

  return {
    balances,
    ethereum: {
      healthFactor: healthFactor_eth,
    },
  };
};
