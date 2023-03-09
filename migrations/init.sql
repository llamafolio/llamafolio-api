-- Adapters
CREATE TABLE IF NOT EXISTS adapters (
    id varchar,
    chain varchar,
    contracts_expire_at timestamp with time zone,
    contracts_revalidate_props jsonb,
    created_at timestamp with time zone,
    primary key (id, chain)
);

CREATE INDEX IF NOT EXISTS adapters_id_chain_idx ON adapters (id, chain);

-- Balances groups
CREATE TABLE IF NOT EXISTS balances_groups (
    id uuid primary key,
    from_address bytea not null,
    adapter_id varchar not null,
    chain varchar not null,
    category varchar not null,
    balance_usd numeric not null,
    debt_usd numeric,
    reward_usd numeric,
    health_factor numeric,
    timestamp timestamp with time zone
);

-- Balances
CREATE TABLE IF NOT EXISTS balances (
    group_id uuid references balances_groups,
    amount numeric,
    price numeric,
    balance_usd numeric,
    address bytea,
    data jsonb,
    unique (group_id, address)
);

CREATE INDEX IF NOT EXISTS balances_group_id_idx ON balances (group_id);

CREATE TABLE IF NOT EXISTS contracts (
    type varchar,
    standard varchar,
    category varchar,
    name varchar,
    display_name varchar,
    chain varchar,
    address bytea,
    adapter_id varchar,
    stable boolean,
    underlyings bytea [],
    rewards bytea [],
    data jsonb
);

ALTER TABLE
    ONLY contracts
ADD
    CONSTRAINT contracts_key UNIQUE (adapter_id, chain, address, category);