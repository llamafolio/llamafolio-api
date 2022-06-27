const { adapters } = require("../adapters");

module.exports.handler = async (event) => {
  const address = event.pathParameters?.address;
  if (!address) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Missing address parameter",
      }),
    };
  }

  const balances = await Promise.all(
    adapters.map((adapter) => adapter.getBalances(address))
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      data: balances,
    }),
  };
};
