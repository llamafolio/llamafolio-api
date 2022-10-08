import { Chain } from "@defillama/sdk/build/general";

export interface Contract {
  chain: Chain;
  address: string;
}

/**
 * Multi chain lowercased contracts map
 */
export class ContractsMap<V> {
  _chains = new Map<Chain | string, Map<string, V>>();

  constructor(iterable?: Iterable<[Contract, V]>) {
    if (iterable) {
      for (const [key, value] of iterable) {
        this.set(key, value);
      }
    }
  }

  set(key: Contract, value: V) {
    const chain = key.chain;
    const address = key.address.toLowerCase();
    if (!this._chains.has(chain)) {
      this._chains.set(chain, new Map());
    }

    this._chains.get(chain)?.set(address, value);
    return this;
  }

  add(key: Contract) {
    return this.set(key, key as V);
  }

  get(key: Contract): V | undefined {
    const chain = key.chain;
    const address = key.address.toLowerCase();

    return this._chains.get(chain)?.get(address);
  }

  has(key: Contract): boolean {
    const chain = key.chain;
    const address = key.address.toLowerCase();

    return this._chains.get(chain)?.has(address) ?? false;
  }

  delete(key: Contract): boolean {
    const chain = key.chain;
    const address = key.address.toLowerCase();

    return this._chains.get(chain)?.delete(address) ?? true;
  }

  *chains(): IterableIterator<Chain> {
    for (const chain of this._chains.keys()) {
      yield chain as Chain;
    }
  }

  *contracts(chain: Chain): IterableIterator<V> {
    const chainMap = this._chains.get(chain);
    if (chainMap) {
      yield* chainMap.values();
    }
  }

  *entries(): IterableIterator<[Chain, IterableIterator<V>]> {
    for (const chain of this.chains()) {
      yield [chain, this.contracts(chain)];
    }
  }

  map(cb: (item: [Chain, V[]]) => any) {
    return Array.from(this).map(([key, contractsIter]) =>
      cb([key, Array.from(contractsIter)])
    );
  }

  [Symbol.iterator]() {
    return this.entries();
  }
}
