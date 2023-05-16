# Llamafolio API

## Prerequisites

- [pnpm v8+](https://pnpm.io/installation)
- [Node.js LTS (v18+)](https://nodejs.org/en/download/)
- `.env`: Create a `.env` from `.env.example` and fill in the values

```sh
npm install --global pnpm
# if already installed, update to latest
pnpm add --global pnpm@latest
```

- To run any TypeScript file, you can use [`tsx`](https://github.com/esbuild-kit/tsx) (TypeScript Execute):

```sh
# Any of these should work
pnpx tsx path/to/file.ts
pnpm tsx path/to/file.ts
pnpm dlx tsx path/to/file.ts
npx tsx path/to/file.ts
node_modules/.bin/tsx path/to/file.ts
```

## Adapters

An adapter specifies how to resolve the balances of an address for your protocol.

To learn more about adapters, check our [docs](https://docs.llamafolio.com).

## Command Line Testing

To test your adapter, run the command below which will output most details an adapter can find

```bash
pnpm run adapter curve-dex ethereum 0x0000000000000000000000000000000000000000
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
