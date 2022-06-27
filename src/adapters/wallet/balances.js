const { BigNumber } = require("ethers");
const { providers } = require("@defillama/sdk/build/general");

const BN_ZERO = BigNumber.from("0");

async function getBalances(account) {
  const balances = await Promise.all(
    Object.entries(providers)
      // TODO: Remove this
      .slice(0, 10)
      .map(async ([chain, provider]) => {
        try {
          const balance = await provider.getBalance(account);

          return {
            chain,
            // TODO: get native token name by chain
            name: chain,
            // TODO:
            decimals: 18,
            // TODO:
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
}

module.exports = { getBalances };
