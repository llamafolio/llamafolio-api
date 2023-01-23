# Llamafolio API

## Adapters

An adapter specifies how to resolve the balances of an address for your protocol.

To learn more about adapters, check our [docs](https://docs.llamafolio.com).

## Command Line Testing

To test your adapter, run the command below which will output most details an adapter can find

```bash
npm run adapter curve ethereum 0x0000000000000000000000000000000000000000
```

## API

## Local development

### Setting up the environment
Llamafolio uses AWS with [serverless](https://www.serverless.com/framework).
1. Create .env file in the root directory.
2. Put any value to `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
```
AWS_ACCESS_KEY_ID="RANDOM_STRING"
AWS_SECRET_ACCESS_KEY="RANDOM_STRING"
```
3. TODO: Describe other steps

Then you can run the API locally using:

```bash
npm run dev
```

## Contributing and listing your protocol

To start contributing to the project, read our [docs](https://docs.llamafolio.com) for guided tutorials and check the instructions here

- [Follow those instructions](./docs/contributing.md) to create your adapter and list your protocol on LlamaFolio, most adapters can be created in under an hour!
