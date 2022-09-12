import { PoolClient } from "pg";
import format from "pg-format";
import { PricedBalance, BasePricedBalance } from "@lib/adapter";
import { bufToStr, strToBuf } from "@lib/buf";
import { sliceIntoChunks } from "@lib/array";
import { ContractStorage } from "@db/contracts";

// balances table share same fields as contracts for few reasons:
// - no join
// - references might be stale as we don't update balances when revalidating contracts
export interface BalanceStorage extends ContractStorage {
  from_address: Buffer;
  amount: string;
  price?: string;
  price_timestamp?: string;
  balance_usd?: string;
  timestamp: string;
}

export function fromStorage(balances: BalanceStorage[]) {
  const res: (PricedBalance & { adapterId: string })[] = [];
  const balanceByKey: { [key: string]: PricedBalance } = {};
  const underlyings: BasePricedBalance[] = [];
  const rewards: BasePricedBalance[] = [];

  for (const balance of balances) {
    const c = {
      fromAddress: bufToStr(balance.from_address),
      type: balance.type,
      standard: balance.standard,
      name: balance.name,
      displayName: balance.display_name,
      chain: balance.chain,
      address: bufToStr(balance.address),
      symbol: balance.symbol,
      decimals: balance.decimals,
      category: balance.category,
      adapterId: balance.adapter_id,
      stable: balance.stable,
      parent: balance.parent ? bufToStr(balance.parent) : undefined,
      price: balance.price ? parseFloat(balance.price) : undefined,
      priceTimestamp: balance.price_timestamp,
      amount: balance.amount,
      balanceUSD: balance.balance_usd
        ? parseFloat(balance.balance_usd)
        : undefined,
      timestamp: balance.timestamp,
      ...balance.data,
    };

    const key = `${c.adapterId}#${c.chain}#${c.address}#${c.category}`;

    if (balance.type === "reward" && balance.parent) {
      rewards.push(c);
    } else if (balance.type === "underlying" && balance.parent) {
      underlyings.push(c);
    } else {
      balanceByKey[key] = c;
      res.push(c);
    }
  }

  // link children to their parents
  for (const reward of rewards) {
    const key = `${reward.adapterId}#${reward.chain}#${reward.parent}#${reward.category}`;
    const parent = balanceByKey[key];
    if (!parent) {
      continue;
    }

    if (!parent.rewards) {
      parent.rewards = [];
    }
    parent.rewards.push(reward);
  }

  for (const underlying of underlyings) {
    const key = `${underlying.adapterId}#${underlying.chain}#${underlying.parent}#${underlying.category}`;
    const parent = balanceByKey[key];
    if (!parent) {
      continue;
    }

    if (!parent.underlyings) {
      parent.underlyings = [];
    }
    parent.underlyings.push(underlying);
  }

  return res;
}

export function toRow(balance: BalanceStorage) {
  return [
    balance.from_address,
    balance.type,
    balance.standard,
    balance.category,
    balance.name,
    balance.display_name,
    balance.chain,
    balance.address,
    balance.symbol,
    balance.decimals,
    balance.adapter_id,
    balance.stable,
    balance.parent,
    balance.price,
    balance.price_timestamp,
    balance.amount,
    balance.balance_usd,
    balance.timestamp,
    balance.data,
  ];
}

export function toStorage(
  balances: PricedBalance[],
  adapterId: string,
  fromAddress: string,
  timestamp: Date
) {
  const res: BalanceStorage[] = [];

  for (const balance of balances) {
    const {
      type,
      standard,
      name,
      displayName,
      chain,
      address,
      symbol,
      decimals,
      category,
      stable,
      price,
      timestamp: priceTimestamp,
      amount,
      balanceUSD,
      rewards,
      underlyings,
      ...data
    } = balance;

    const c = {
      from_address: strToBuf(fromAddress),
      type,
      standard,
      name,
      display_name: displayName,
      chain,
      address: strToBuf(address),
      symbol,
      decimals,
      category,
      adapter_id: adapterId,
      stable,
      price,
      price_timestamp: priceTimestamp ? new Date(priceTimestamp) : undefined,
      amount: amount.toString(),
      balance_usd: balanceUSD,
      timestamp,
      // \\u0000 cannot be converted to text
      data: JSON.parse(JSON.stringify(data).replace(/\\u0000/g, "")),
    };

    res.push(c);

    if (rewards && rewards.length > 0) {
      for (const reward of rewards) {
        res.push({
          from_address: c.from_address,
          type: "reward",
          standard: reward.standard,
          name: reward.name,
          display_name: reward.displayName,
          chain: reward.chain || chain,
          address: strToBuf(reward.address),
          symbol: reward.symbol,
          decimals: reward.decimals,
          category,
          adapter_id: adapterId,
          stable: reward.stable,
          price: reward.price,
          price_timestamp: reward.timestamp
            ? new Date(reward.timestamp)
            : undefined,
          amount: reward.amount.toString(),
          balance_usd: reward.balanceUSD,
          parent: c.address,
          // data: {
          //   claimable,
          //   claimable_usd
          // }
        });
      }
    }
    if (underlyings && underlyings.length > 0) {
      for (const underlying of underlyings) {
        res.push({
          from_address: c.from_address,
          type: "underlying",
          standard: underlying.standard,
          name: underlying.name,
          display_name: underlying.displayName,
          chain: underlying.chain,
          address: strToBuf(underlying.address),
          symbol: underlying.symbol,
          decimals: underlying.decimals,
          category,
          adapter_id: adapterId,
          stable: underlying.stable,
          price: underlying.price,
          price_timestamp: underlying.timestamp
            ? new Date(underlying.timestamp)
            : undefined,
          amount: underlying.amount.toString(),
          balance_usd: underlying.balanceUSD,
          parent: c.address,
        });
      }
    }
  }

  return res;
}

export async function selectBalancesByFromAddress(
  client: PoolClient,
  fromAddress: string
) {
  const balancesRes = await client.query(
    `select * from balances where from_address = $1::bytea;`,
    [strToBuf(fromAddress)]
  );

  return fromStorage(balancesRes.rows);
}

export function insertBalances(
  client: PoolClient,
  balances: PricedBalance[],
  adapterId: string,
  fromAddress: string,
  timestamp: Date
) {
  const values = toStorage(balances, adapterId, fromAddress, timestamp).map(
    toRow
  );

  if (values.length === 0) {
    return;
  }

  return Promise.all(
    sliceIntoChunks(values, 200).map((chunk) =>
      client.query(
        format(
          "INSERT INTO balances (from_address, type, standard, category, name, display_name, chain, address, symbol, decimals, adapter_id, stable, parent, price, price_timestamp, amount, balance_usd, timestamp, data) VALUES %L ON CONFLICT DO NOTHING;",
          chunk
        ),
        []
      )
    )
  );
}
