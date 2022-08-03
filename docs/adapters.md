# Installation

The API is built using NodeJS and Serverless framework.

Install project dependencies:

```sh
npm i
```

# Create your first adapter

In this tutorial, we will create an adapter for UniswapV2.

Create a new folder in `src/adapters` with the name of your protocol (`src/adapters/uniswapv2-tutorial`).

Create an index file in your newly created folder: you can use Javascript or Typescript for this (`src/adapters/uniswapv2-tutorial/index.(js|ts)`).

TODO: switch between Javascript / Typescript

```javascript
const adapter = {
  name: "UniswapV2 tutorial",
  description: "AMM",
  links: {
    website: "https://uniswap.org",
  },
};

module.exports = adapter;
```

This describes the metadata of your protocol:

- `name` and `description` will appear in our app
- `links` allow users to navigate to your app directly

## Contracts resolver

As an optimization, we only run adapters if a user interacted with a specific contracts; this describes the list of said contracts.

```javascript
const adapter = {
  ...
  getContracts() {
    return {
      contracts: [
        {
          chain: 'ethereum',
          address: '0xTODO',
        }
      ]
    }
  }
};
```

### Factories

This function can be async if your logic requires to fetch more data, for instance it lets you collect all contracts created by a Factory.

`revalidate` lets you specify an interval to re-run this function

```javascript
const adapter = {
  ...
  async getContracts() {
    const pooLength = await factory.poolLength();
    const pools = await multicall({
      chain: 'ethereum',
      calls: [],
      abi: {}
    });

    return {
      contracts,
      revalidate: 15 * 60 // in seconds
    }
  }
};
```

## Balances resolver

```javascript
const adapter = {
  ...
  getBalances() {
    return {
      balances: []
    }
  }
};
```

# Local development

To run an adapter:

```bash
npm run adapter adapter_name address
```

Replace `adapter_name` by the name of your adapter (ex: uniswap) and `address` by your address (ex: x0000000000000000000000000000000000000000)
