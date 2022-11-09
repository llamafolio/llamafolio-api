import { BaseContext, Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { multicall } from "@lib/multicall";
import { BigNumber, utils } from "ethers";

const DECIMALS = {
  wad: utils.parseEther("1.0"), // 10 ** 18,
  ray: utils.parseEther("1000000000"), //  10 ** 27
};

export interface CDPID_Maker extends Contract {
  proxy: string;
  ids: string;
  urns: string[];
  ilks: string[];
}

interface Urn {
  ids: string;
  address: string;
  ilks: string;
}

export async function getProxiesContractsFromUsers(
  chain: Chain,
  contract: Contract
) {
  const proxyAddressRes = await call({
    chain,
    target: contract.address,
    params: [process.argv[3]],
    abi: {
      constant: true,
      inputs: [{ name: "", type: "address" }],
      name: "proxies",
      outputs: [{ name: "", type: "address" }],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  return proxyAddressRes.output;
}

export async function getCDPIDFromProxyAddress(
  chain: Chain,
  proxy: string,
  contract: Contract
) {
  const cdpidInfoRes = await call({
    chain,
    target: contract.address,
    params: [contract.manager.address, proxy],
    abi: {
      constant: true,
      inputs: [
        { internalType: "address", name: "manager", type: "address" },
        { internalType: "address", name: "guy", type: "address" },
      ],
      name: "getCdpsAsc",
      outputs: [
        { internalType: "uint256[]", name: "ids", type: "uint256[]" },
        { internalType: "address[]", name: "urns", type: "address[]" },
        { internalType: "bytes32[]", name: "ilks", type: "bytes32[]" },
      ],
      payable: false,
      stateMutability: "view",
      type: "function",
    },
  });

  const cdpidInfo = cdpidInfoRes.output;

  const userInfos: CDPID_Maker = {
    proxy: proxy,
    ids: cdpidInfo.ids,
    urns: cdpidInfo.urns,
    ilks: cdpidInfo.ilks,
  };

  return userInfos;
}

export async function getBalancesFromCDPIDUserInfos(
  chain: Chain,
  cdpidContract: CDPID_Maker,
  Vat: Contract
) {
  const balances: Balance[] = [];

  /**
   *    Retrieve ilk (Collateral Token) infos
   */

  const [ilksInfosRes, ilkSpotRes] = await Promise.all([
    multicall({
      chain,
      calls: cdpidContract.ilks.map((ilk) => ({
        target: Vat.ilk.address,
        params: [ilk],
      })),
      abi: {
        inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        name: "ilkData",
        outputs: [
          { internalType: "uint96", name: "pos", type: "uint96" },
          { internalType: "address", name: "join", type: "address" },
          { internalType: "address", name: "gem", type: "address" },
          { internalType: "uint8", name: "dec", type: "uint8" },
          { internalType: "uint96", name: "class", type: "uint96" },
          { internalType: "address", name: "pip", type: "address" },
          { internalType: "address", name: "xlip", type: "address" },
          { internalType: "string", name: "name", type: "string" },
          { internalType: "string", name: "symbol", type: "string" },
        ],
        stateMutability: "view",
        type: "function",
      },
    }),

    multicall({
      chain,
      calls: cdpidContract.ilks.map((ilk) => ({
        target: Vat.spot.address,
        params: [ilk],
      })),
      abi: {
        constant: true,
        inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        name: "ilks",
        outputs: [
          { internalType: "contract PipLike", name: "pip", type: "address" },
          { internalType: "uint256", name: "mat", type: "uint256" },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const ilksInfos = ilksInfosRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const ilkSpot = ilkSpotRes
    .filter((res) => res.success)
    .map((res) => BigNumber.from(res.output.mat));

  const ilks: Contract[] = [];
  const urnHandler: Urn[] = [];

  for (let i = 0; i < ilksInfos.length; i++) {
    const info = ilksInfos[i];
    const spot = ilkSpot[i];

    urnHandler.push({
      ids: cdpidContract.ids[i],
      address: cdpidContract.urns[i],
      ilks: cdpidContract.ilks[i],
    });

    ilks.push({
      chain,
      name: info.name,
      symbol: info.symbol,
      address: info.gem,
      decimals: info.dec,
      urns: urnHandler[i],
      spot,
    });
  }

  const [urnsBalancesRes, urnSupplyRes] = await Promise.all([
    multicall({
      chain,
      calls: ilks.map((ilk) => ({
        target: Vat.address,
        params: [ilk.urns.ilks, ilk.urns.address],
      })),
      abi: {
        constant: true,
        inputs: [
          { internalType: "bytes32", name: "", type: "bytes32" },
          { internalType: "address", name: "", type: "address" },
        ],
        name: "urns",
        outputs: [
          { internalType: "uint256", name: "ink", type: "uint256" },
          { internalType: "uint256", name: "art", type: "uint256" },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),

    multicall({
      chain,
      calls: ilks.map((ilk) => ({
        target: Vat.address,
        params: [ilk.urns.ilks],
      })),
      abi: {
        constant: true,
        inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
        name: "ilks",
        outputs: [
          { internalType: "uint256", name: "Art", type: "uint256" },
          { internalType: "uint256", name: "rate", type: "uint256" },
          { internalType: "uint256", name: "spot", type: "uint256" },
          { internalType: "uint256", name: "line", type: "uint256" },
          { internalType: "uint256", name: "dust", type: "uint256" },
        ],
        payable: false,
        stateMutability: "view",
        type: "function",
      },
    }),
  ]);

  const urnsBalances = urnsBalancesRes
    .filter((res) => res.success)
    .map((res) => ({ input: res.input.params, output: res.output }));

  const urnSupply = urnSupplyRes
    .filter((res) => res.success)
    .map((res) => res.output);

  const formattedRate = urnSupply.map((urn) => BigNumber.from(urn.rate));

  const userSupply = urnsBalances.map((balance) =>
    BigNumber.from(balance.output.ink)
  );
  const userBorrow = urnsBalances.map((balance) =>
    BigNumber.from(balance.output.art)
  );

  for (let i = 0; i < userBorrow.length; i++) {
    const ilk = ilks[i];

    const userBorrowFormatted = userBorrow[i]
      .mul(formattedRate[i])
      .div(DECIMALS.ray);

    const lend: Balance = {
      chain,
      name: ilk.name,
      decimals: 18,
      address: ilk.address,
      symbol: ilk.symbol,
      amount: userSupply[i],
      category: "lend",
    };

    balances.push(lend);

    const borrow: Balance = {
      chain,
      decimals: Vat.token.decimals,
      address: Vat.token.address,
      symbol: Vat.token.symbol,
      amount: userBorrowFormatted,
      category: "borrow",
    };

    // if (userBorrowFormatted.gt(0)) {
    //   const CollateralizationRatio =
    //     userSupply[i]
    //       .mul(100)
    //       .mul(BigNumber.from(urnSupply[i].spot).div(DECIMALS.ray))
    //       .mul(ilks[i].spot.div(DECIMALS.ray))
    //       .div(userBorrowFormatted)
    //       .toNumber() / 100;

    //       console.log(CollateralizationRatio);

    // }

    balances.push(borrow);
  }

  return balances;
}
