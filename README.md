# Llamafolio API

## Prerequisites

- [pnpm v8+](https://pnpm.io/installation)

```sh
npm install --global pnpm
# if already installed, update to latest
pnpm add --global pnpm@latest
```

## Adapters

An adapter specifies how to resolve the balances of an address for your protocol.

To learn more about adapters, check our [docs](https://docs.llamafolio.com).

## Command Line Testing

To test your adapter, run the command below which will output most details an adapter can find

```bash
pnpm run adapter curve ethereum 0x0000000000000000000000000000000000000000
```

## API

### Local development

Start by [setting up your environment](./docs/setup.md).

You can run the API locally using:

```bash
pnpm run dev
```

## Contributing and listing your protocol

To start contributing to the project, read our [docs](https://docs.llamafolio.com) for guided tutorials and check the instructions here

- [Follow those instructions](./docs/contributing.md) to create your adapter and list your protocol on LlamaFolio, most adapters can be created in under an hour!
