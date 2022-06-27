const { multiCall } = require("@defillama/sdk/build/abi/index");

// TODO: manage large multicall: make a class to accumulate and split into chunks if necessary
async function getBalances(tokens, account) {
  const tokensByChain = {};
  for (const token of tokens) {
    if (tokensByChain[token.chain] === undefined) {
      tokensByChain[token.chain] = [];
    }
    tokensByChain[token.chain].push(token);
  }

  const chains = Object.keys(tokensByChain);

  const chainBalances = await Promise.all(
    chains.map(async (chain) => {
      try {
        const res = await multiCall({
          chain,
          calls: tokensByChain[chain].map((token) => ({
            target: token.address,
            params: [account],
          })),
          abi: {
            constant: true,
            inputs: [{ internalType: "address", name: "", type: "address" }],
            name: "balanceOf",
            outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
            payable: false,
            stateMutability: "view",
            type: "function",
          },
        });

        return res;
      } catch (error) {
        return null;
      }
    })
  );

  return chains.flatMap(
    (chain, i) =>
      chainBalances[i]?.output
        // balance not 0
        .filter((balanceRes) => balanceRes.success && balanceRes.output !== "0")
        .map((balanceRes, i) => ({
          ...tokensByChain[chain][i],
          balance: balanceRes.output,
        })) ?? []
  );
}

module.exports = { getBalances };
