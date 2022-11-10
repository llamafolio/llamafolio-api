import { Adapter, Contract, GetBalancesHandler } from "@lib/adapter";
import {
  getProxiesContracts,
  getBalancesFromProxies,
  CDPID_Maker,
} from "./lend";
import { Token } from "@lib/token";

const DAI: Token = {
  chain: "ethereum",
  address: "0x6b175474e89094c44da98b954eedeac495271d0f",
  decimals: 18,
  symbol: "DAI",
};

const InstadAppList: Contract = {
  name: "InstadApp List",
  chain: "ethereum",
  address: "0x4c8a1BEb8a87765788946D6B19C6C6355194AbEb",
};

const Proxy_Registry: Contract = {
  name: "Maker Proxy Registry",
  chain: "ethereum",
  address: "0x4678f0a6958e4D2Bc4F1BAF7Bc52E8F3564f3fE4",
};

const CDP_Manager: Contract = {
  name: "Maker CDP Manager",
  chain: "ethereum",
  address: "0x5ef30b9986345249bc32d8928B7ee64DE9435E39",
};

const Get_CDPS: Contract = {
  name: "Maker Get CDPS",
  chain: "ethereum",
  address: "0x36a724Bd100c39f0Ea4D3A20F7097eE01A8Ff573",
  manager: CDP_Manager,
  proxy: [Proxy_Registry, InstadAppList],
};

const IlkRegistry: Contract = {
  name: "Maker IlkRegistry",
  chain: "ethereum",
  address: "0x5a464C28D19848f44199D003BeF5ecc87d090F87",
};

const MCD_Spot: Contract = {
  name: "Maker MCD Spot",
  chain: "ethereum",
  address: "0x65C79fcB50Ca1594B025960e539eD7A9a6D434A3",
};

const MCD_Vat: Contract = {
  name: "Maker MCD Vat",
  chain: "ethereum",
  address: "0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B",
  token: DAI,
  ilk: IlkRegistry,
  spot: MCD_Spot,
};

const getContracts = async () => {
  const proxies: CDPID_Maker[] = await getProxiesContracts(
    "ethereum",
    Get_CDPS
  );

  return {
    contracts: {
      proxies,
      MCD_Vat,
    },
  };
};

const getBalances: GetBalancesHandler<typeof getContracts> = async (
  ctx,
  { proxies, MCD_Vat }
) => {
  const balances: any = await getBalancesFromProxies(
    "ethereum",
    proxies || [],
    MCD_Vat
  );

  console.log(balances);

  return {
    balances: balances?.balances,
    ethereum: {
      healthFactor: balances?.healthFactor,
    },
  };
};

const adapter: Adapter = {
  id: "makerdao",
  getContracts,
  getBalances,
};

export default adapter;
