-- Adapters
CREATE TABLE IF NOT EXISTS adapters (
    id varchar,
    chain varchar,
    contracts_expire_at timestamp with time zone,
    contracts_revalidate_props jsonb,
    contracts_props jsonb,
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
    category varchar not null,
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

-- Protocols
CREATE TABLE protocols (
    name VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    logo VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    slug VARCHAR NOT NULL,
    chain VARCHAR NOT NULL,
    chains VARCHAR [] NOT NULL,
    symbol VARCHAR,
    tvl DECIMAL NOT NULL,
    twitter VARCHAR,
    description VARCHAR,
    address VARCHAR,
    color VARCHAR
);

-- Labels
create table labels (
    address text not null,
    type text not null,
    value text not null,
    updated_at timestamp with time zone not null
);

CREATE INDEX IF NOT EXISTS labels_address_idx ON labels (address);