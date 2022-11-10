import { Contract, Balance } from "@lib/adapter";
import { Chain } from "@defillama/sdk/build/general";
import { call } from "@defillama/sdk/build/abi";
import { multicall } from "@lib/multicall";
import { BigNumber, utils } from "ethers";

const DECIMALS = {
  wad: utils.parseEther("1.0"), // 10 ** 18,
  ray: utils.parseEther("1000000000"), //  10 ** 27
};

export interface CDPID_Maker extends Contract {
  ids?: string[];
  urns?: string[];
  ilks?: string[];
}

interface BalanceWithExtraProps extends Balance {
  proxy: { name: string; address: string };
  ilkMat?: BigNumber;
  urnSpot?: BigNumber;
}

interface Urn {
  ids?: string;
  address?: string;
  ilks?: string;
}

export async function getProxiesContracts(chain: Chain, contract?: Contract) {
  if (!contract) {
    console.log("Missing proxy contract");

    return [];
  }

  try {
    const MAKER = contract.proxy[0];
    const INSTADAPP = contract.proxy[1];

    let users: Contract[] = [];

    /**
     *    Check if user's address uses Maker proxies
     */

    const proxyAddressRes = await call({
      chain,
      target: MAKER.address,
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
    const makerAddressesProxies: string[] = [];
    makerAddressesProxies.push(proxyAddressRes.output);

    /**
     *    Check if user's address uses InstadApp proxies
     */

    const userLinkCountRes = await call({
      chain,
      target: INSTADAPP.address,
      params: [process.argv[3]],
      abi: {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "userLink",
        outputs: [
          { internalType: "uint64", name: "first", type: "uint64" },
          { internalType: "uint64", name: "last", type: "uint64" },
          { internalType: "uint64", name: "count", type: "uint64" },
        ],
        stateMutability: "view",
        type: "function",
      },
    });
    const instadAppIDProxies: string[] = [];
    const userLinkCount = userLinkCountRes.output.count;
    const userLinkFirst = userLinkCountRes.output.first;

    instadAppIDProxies.push(userLinkFirst);

    for (let i = 1; i < userLinkCount; i++) {
      const userLinksRes = await call({
        chain,
        target: INSTADAPP.address,
        params: [
          process.argv[3],
          instadAppIDProxies[instadAppIDProxies.length - 1],
        ],
        abi: {
          inputs: [
            { internalType: "address", name: "", type: "address" },
            { internalType: "uint64", name: "", type: "uint64" },
          ],
          name: "userList",
          outputs: [
            { internalType: "uint64", name: "prev", type: "uint64" },
            { internalType: "uint64", name: "next", type: "uint64" },
          ],
          stateMutability: "view",
          type: "function",
        },
      });

      instadAppIDProxies.push(userLinksRes.output.next);
    }

    const instadAppAddressesProxiesRes = await multicall({
      chain,
      calls: instadAppIDProxies.map((id) => ({
        target: INSTADAPP.address,
        params: [id],
      })),
      abi: {
        inputs: [{ internalType: "uint64", name: "", type: "uint64" }],
        name: "accountAddr",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
    });

    const instadAppAddressesProxies = instadAppAddressesProxiesRes
      .filter((res) => res.output)
      .map((res) => res.output);

    const usersAddresses: { maker: string[]; instadApp: string[] } = {
      maker: [],
      instadApp: [],
    };
    usersAddresses.maker = makerAddressesProxies;
    usersAddresses.instadApp = instadAppAddressesProxies;

    const [cdpidFromMakerRes, cdpidFromInstadAppRes] = await Promise.all([
      multicall({
        chain,
        calls: usersAddresses.maker.map((proxy) => ({
          target: contract.address,
          params: [contract.manager.address, proxy],
        })),
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
      }),

      multicall({
        chain,
        calls: usersAddresses.instadApp.map((proxy) => ({
          target: contract.address,
          params: [contract.manager.address, proxy],
        })),
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
      }),
    ]);

    const cdpidFromMaker = cdpidFromMakerRes
      .filter((res) => res.success)
      .map((res) => res.output);

    const cdpidFromInstadApp = cdpidFromInstadAppRes
      .filter((res) => res.success)
      .map((res) => res.output);

    for (let i = 0; i < cdpidFromMaker.length; i++) {
      const cdpidMaker = cdpidFromMaker[i];

      const maker: CDPID_Maker = {
        chain,
        address: process.argv[3],
        proxy: { name: "Maker Proxy", proxy: usersAddresses.maker[i] },
        ids: cdpidMaker.ids,
        urns: cdpidMaker.urns,
        ilks: cdpidMaker.ilks,
      };

      if (maker.ids?.length !== 0) {
        users.push(maker);
      }
    }

    for (let i = 0; i < cdpidFromInstadApp.length; i++) {
      const cdpidInstadApp = cdpidFromInstadApp[i];

      const instadApp: CDPID_Maker = {
        chain,
        address: process.argv[3],
        proxy: { name: "InstadApp Proxy", proxy: usersAddresses.instadApp[i] },
        ids: cdpidInstadApp.ids,
        urns: cdpidInstadApp.urns,
        ilks: cdpidInstadApp.ilks,
      };

      if (instadApp.ids?.length !== 0) {
        users.push(instadApp);
      }
    }

    return users;
  } catch (error) {
    console.log("Failed to get proxies contracts from Maker or InstadApp");
    return [];
  }
}

export async function getBalancesFromProxies(
  chain: Chain,
  proxies: CDPID_Maker[],
  Vat: Contract
) {
  if (!Vat) {
    console.log("Missing Vat contract");

    return;
  }

  try {
    const balances: BalanceWithExtraProps[] = [];
    const ilks: Contract[] = [];
    const urnHandler: Urn[] = [];

    /**
     *    Retrieve ilk (Collateral Token) infos
     */

    for (let i = 0; i < proxies.length; i++) {
      const proxy = proxies[i];

      if (!proxy.ilks || !proxy.urns) {
        return [];
      }

      const [ilksInfosRes, ilkMatRes] = await Promise.all([
        multicall({
          chain,
          calls: proxy.ilks?.map((ilk) => ({
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
          calls: proxy.ilks.map((ilk) => ({
            target: Vat.spot.address,
            params: [ilk],
          })),
          abi: {
            constant: true,
            inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
            name: "ilks",
            outputs: [
              {
                internalType: "contract PipLike",
                name: "pip",
                type: "address",
              },
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

      const ilkMat = ilkMatRes
        .filter((res) => res.success)
        .map((res) => BigNumber.from(res.output.mat));

      for (let x = 0; x < ilksInfos.length; x++) {
        const info = ilksInfos[x];
        const mat = ilkMat[x];

        urnHandler.push({
          ids: proxy.ids?.[x],
          address: proxy.urns?.[x],
          ilks: proxy.ilks?.[x],
        });

        ilks.push({
          chain,
          name: info.name,
          symbol: info.symbol,
          address: info.gem,
          decimals: info.dec,
          proxy: proxy.proxy,
          urns: urnHandler[x],
          mat,
        });
      }
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

    const urnSpot = urnSupplyRes
      .filter((res) => res.success)
      .map((res) => BigNumber.from(res.output.spot));

    const formattedRate = urnSupply.map((urn) => BigNumber.from(urn.rate));

    const userSupply = urnsBalances.map((balance) =>
      BigNumber.from(balance.output.ink)
    );
    const userBorrow = urnsBalances.map((balance) =>
      BigNumber.from(balance.output.art)
    );

    for (let o = 0; o < userBorrow.length; o++) {
      const ilk = ilks[o];

      const userBorrowFormatted = userBorrow[o]
        .mul(formattedRate[o])
        .div(DECIMALS.ray);

      const lend: BalanceWithExtraProps = {
        chain,
        name: ilk.name,
        proxy: ilk.proxy,
        decimals: 18,
        address: ilk.address,
        symbol: ilk.symbol,
        amount: userSupply[o],
        ilkMat: ilk.mat,
        urnSpot: urnSpot[o],
        category: "lend",
      };

      balances.push(lend);

      const borrow: BalanceWithExtraProps = {
        chain,
        proxy: ilk.proxy,
        decimals: Vat.token.decimals,
        address: Vat.token.address,
        symbol: Vat.token.symbol,
        amount: userBorrowFormatted,
        category: "borrow",
      };

      balances.push(borrow);
    }

    const healthFactor = await getHealthFactor(balances);

    return { balances: balances, healthFactor: healthFactor };
  } catch (error) {
    console.log("Failed to get balances");

    return [];
  }
}

export async function getHealthFactor(balances: BalanceWithExtraProps[]) {
  const balance = balances.filter((balance) => balance.amount.gt(0));

  const lends = balance.filter((lend) => lend.category === "lend");
  const borrows = balance.filter((lend) => lend.category === "borrow");

  const health: number[] = [];

  for (let i = 0; i < lends.length; i++) {
    const lend = lends[i];
    const borrow = borrows[i];

    /**
     * Art: wad
     * rate: ray
     * spot: ray
     * mat: ray
     * formula: Collateralization Ratio = Vat.urn.ink * Vat.ilk.spot * Spot.ilk.mat / (Vat.urn.art * Vat.ilk.rate)
     */

    if (!lend.ilkMat || !lend.urnSpot) {
      return 0;
    }

    const CollateralizationRatio = lend.amount
      .mul(100) // To prevent result as "0x01" ~~ e.g: 1.65 -> "0x01"
      .mul(lend.ilkMat.div(DECIMALS.ray))
      .mul(lend.urnSpot.div(DECIMALS.ray))
      .div(borrow.amount);

    const formattedCollateralizationRatio =
      parseFloat(CollateralizationRatio.toString()) / 100 > 10
        ? 10
        : parseFloat(CollateralizationRatio.toString()) / 100;

    health.push(formattedCollateralizationRatio);
  }
  return health;
}
