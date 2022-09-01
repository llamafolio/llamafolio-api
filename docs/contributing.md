# Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -m "Add some feature"`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request.


## How to create your adapter

1. **Your protocol must be [listed on DeFiLlama](https://docs.llama.fi/list-your-project/submit-a-project) before proceeding**
2. Take a few minutes to review existing adapters
3. Copy the adapter_template and rename the folder with your project name
4. Retrieve all contracts holding users' funds in the `getContracts()` method
5. Retrieve all balances in the `getBalances()` method of the adapter 
6. Be sure to use multicall when possible, LlamaFolio runs thousands of adapters and it is important they run as quickly as possible
7. If your protocol is a fork of a known protocol, you will likely have a helper in the library (Uniswap v2/AAVE v2 etc)


## Testing your adapter

1. Run your adapter `npm run adapter convex 0x000000` with a few different addresses to make sure it behaves as expected
2. Run the test suite to make sure there is no missing metadata
3. Make sure your adapter runs in under 15 seconds, if it doesn't, explain why and try to improve it if possible
