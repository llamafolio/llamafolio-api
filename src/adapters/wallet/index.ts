import { BigNumber } from "ethers";
import { providers } from "@defillama/sdk/build/general";

const BN_ZERO = BigNumber.from("0");

const adapter = {
  name: "Wallet",
  async getBalances(account: string) {
    const balances = await Promise.all(
      Object.entries(providers)
        // TODO: Remove this
        .slice(0, 10)
        .map(async ([chain, provider]) => {
          try {
            const balance = await provider.getBalance(account);

            return {
              chain,
              // TODO:
              decimals: 18,
              // TODO: map chains - token(s)
              symbol: chain.toLowerCase(),
              balance,
            };
          } catch (error) {
            console.error(`[${chain}]: could not getBalance`, error);
            return null;
          }
        })
    );

    return balances.filter(
      (balanceRes) => balanceRes != null && balanceRes.balance.gt(BN_ZERO)
    );
  },
};

export default adapter;
