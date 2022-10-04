-- Queries examples

-- Blocks synced
create or replace function blocks_synced()
  RETURNS TABLE (
      count bigint,
      max bigint,
      chain varchar
  )
  LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
        FROM chains WHERE is_evm;
    multichainQuery text := '';
BEGIN 
  FOR rec IN tables LOOP
    multichainQuery := multichainQuery ||
        format('select reltuples::bigint as count,
			   (select max(number) from %I.blocks) as max,
			   %L::varchar as chain
			   from pg_class where oid = ''%I.blocks''::regclass', rec._chain, rec._chain, rec._chain) || 
        ' union all ';
  END LOOP;
  
  -- remove the last ' union all '
  multichainQuery := left(multichainQuery, -10);
  
  return query execute multichainQuery;
END
$$;

-- Usage:
select * from blocks_synced();


create or replace function all_transactions_history(address bytea, _limit integer)
	returns table (
		"chain" varchar,
		b_number bigint,
		b_timestamp timestamp,
		tx_hash bytea,
		tx_from_address bytea,
		tx_to_address bytea,
		tx_value numeric,
		tx_gas_used bigint,
		tx_gas_price decimal(38,0),
		tx_input_function_name varchar,
		tx_success boolean
	)
	LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
		FROM chains WHERE is_evm;
	multichainTxsQuery text := '';
BEGIN 
	FOR rec IN tables LOOP
		multichainTxsQuery := multichainTxsQuery || 
		format('
			select 
				%L::varchar as chain,
				block_number as b_number,
				timestamp as b_timestamp,
				t.hash as tx_hash,
				t.from_address as tx_from_address,
				t.to_address as tx_to_address,
				t.value as tx_value,
				t.gas_used as tx_gas_used,
				cast(gas_price as decimal(38,0)) as tx_gas_price,
				input_function_name as tx_input_function_name,
				success as tx_success
			from %I.transactions t
			inner join %I.blocks b on (t.block_number = b.number)
			where (t.from_address = %L or t.to_address = %L)',
			rec._chain, rec._chain, rec._chain, address, address
		) || 
		' union all ';
	END LOOP;
	
	-- remove the last ' union all '
	multichainTxsQuery := left(multichainTxsQuery, -10);
	-- limit the number of cross-chain transactions as we want a fixed size of transactions
	-- with all of their token transfers (no limit)
	multichainTxsQuery := format('%s order by b_timestamp desc limit %L', multichainTxsQuery, _limit);
	
	return query execute multichainTxsQuery;
END
$$;


-- Multi chain transactions history from and to given address, sorted by block.timestamp, with token_transfers:
create or replace function all_transactions_history(address bytea, _limit integer, _timestamp_before timestamp)
	returns table (
		"chain" varchar,
		b_number bigint,
		b_timestamp timestamp,
		tx_hash bytea,
		tx_from_address bytea,
		tx_to_address bytea,
		tx_value numeric,
		tx_gas_used bigint,
		tx_gas_price decimal(38,0),
		tx_input_function_name varchar,
		tx_success boolean
	)
	LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
		FROM chains WHERE is_evm;
	multichainTxsQuery text := '';
BEGIN 
	FOR rec IN tables LOOP
		multichainTxsQuery := multichainTxsQuery || 
		format('
			select 
				%L::varchar as chain,
				block_number as b_number,
				timestamp as b_timestamp,
				t.hash as tx_hash,
				t.from_address as tx_from_address,
				t.to_address as tx_to_address,
				t.value as tx_value,
				t.gas_used as tx_gas_used,
				cast(gas_price as decimal(38,0)) as tx_gas_price,
				input_function_name as tx_input_function_name,
				success as tx_success
			from %I.transactions t
			inner join %I.blocks b on (t.block_number = b.number)
			where (t.from_address = %L or t.to_address = %L) and (timestamp < %L::timestamp)',
			rec._chain, rec._chain, rec._chain, address, address, _timestamp_before
		) || 
		' union all ';
	END LOOP;
	
	-- remove the last ' union all '
	multichainTxsQuery := left(multichainTxsQuery, -10);
	-- limit the number of cross-chain transactions as we want a fixed size of transactions
	-- with all of their token transfers (no limit)
	multichainTxsQuery := format('%s order by b_timestamp desc limit %L', multichainTxsQuery, _limit);
	
	return query execute multichainTxsQuery;
END
$$;

-- Usage:
select * from all_transactions_history('\x0000000000000000000000000000000000000000', 20);

-- Get transactions from and to given address, ordered by timestamp with aggregated token transfers
SELECT *, 'fantom' as chain
FROM (
  SELECT *, fantom.transactions.hash as txhash FROM fantom.transactions INNER JOIN fantom.blocks on fantom.transactions.block_number = fantom.blocks.number
  WHERE fantom.transactions.from_address = '\x0000000000000000000000000000000000000000' OR fantom.transactions.to_address = '\x0000000000000000000000000000000000000000'
  ORDER BY fantom.blocks.timestamp desc
  LIMIT 20
) txs
LEFT JOIN fantom.token_transfers on fantom.token_transfers.transaction_hash = txs.txhash;


-- Given an address, get all distinct contract addresses interacted with (also looks at interaction through logs)
create or replace function all_contract_interactions(address bytea)
	RETURNS setof public.contracts
	LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
		-- TODO: put polygon back
        FROM chains WHERE is_evm and chain <> 'polygon';
    multichainQuery text := '';
BEGIN 
	FOR rec IN tables LOOP
		multichainQuery := multichainQuery ||
			format('SELECT contract_address, %L::varchar as chain
				FROM %I.transactions t
				INNER JOIN %I.logs l ON t.hash = l.transaction_hash
				WHERE t.from_address = %L', 
				rec._chain, rec._chain, rec._chain, address
			) || 
		' union all ';
	END LOOP;
  
	-- remove the last ' union all '
	multichainQuery := left(multichainQuery, -10);
	
	return query execute format('
								SELECT DISTINCT ON (c.chain, c.address) c.* FROM ( %s ) AS uc
								INNER JOIN contracts c ON (
									c.chain = uc.chain AND
									c.address = uc.contract_address
								) UNION ALL
								SELECT DISTINCT ON (c.chain, c.address) c.* FROM ( %s ) AS uc
								INNER JOIN contracts c ON (
									c.chain = uc.chain AND
									c.parent = uc.contract_address
								)
								', multichainQuery, multichainQuery);
END
$$;

-- Usage
select * from all_contract_interactions('\x0000000000000000000000000000000000000000');

-- Given an address, returns distinct recipient of multichain transactions
create or replace function distinct_transactions_to(address bytea)
  RETURNS TABLE (
      to_address bytea,
      chain varchar
  )
  LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
        FROM chains WHERE is_evm;
    multichainQuery text := '';
BEGIN 
  FOR rec IN tables LOOP
    multichainQuery := multichainQuery ||
		format('
			SELECT
			   	to_address,
			   	%L::varchar as chain 
			FROM %I.transactions
			WHERE from_address = %L', 
		rec._chain, rec._chain, address) || 
        ' union all ';
  END LOOP;
  
  -- remove the last ' union all '
  multichainQuery := left(multichainQuery, -10);
  
  return query execute format('select distinct(to_address), chain from ( %s ) as _', multichainQuery);
END
$$;

-- Usage:
select * from distinct_transactions_to('\x0000000000000000000000000000000000000000');

-- Given an address, get all distinct token_address received
create or replace function all_distinct_tokens_received(address bytea)
  RETURNS TABLE (
      token_address bytea,
      chain varchar
  )
  LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
        FROM chains WHERE is_evm;
    multichainQuery text := '';
BEGIN 
  FOR rec IN tables LOOP
    multichainQuery := multichainQuery ||
        format('SELECT token_address, %L::varchar as chain FROM %I.token_transfers WHERE to_address = %L', rec._chain, rec._chain, address) || 
        ' union all ';
  END LOOP;
  
  -- remove the last ' union all '
  multichainQuery := left(multichainQuery, -10);
  
  return query execute format('select distinct(token_address), chain from ( %s ) as _', multichainQuery);
END
$$;

select * from all_distinct_tokens_received('\x0000000000000000000000000000000000000000') limit 500;

-- All tokens contracts received by an account
create or replace function all_token_received(address bytea)
	RETURNS setof public.contracts
	LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
        FROM chains WHERE is_evm;
    multichainQuery text := '';
BEGIN 
	FOR rec IN tables LOOP
		multichainQuery := multichainQuery ||
			format('SELECT token_address, %L::varchar as chain
				FROM %I.token_transfers t
				WHERE t.to_address = %L', 
				rec._chain, rec._chain, address
			) || 
		' union all ';
	END LOOP;
  
	-- remove the last ' union all '
	multichainQuery := left(multichainQuery, -10);
  
	return query execute format('SELECT DISTINCT ON (chain, token_address) c.* FROM ( %s ) AS uc
								INNER JOIN contracts c ON c.address = uc.token_address AND c.chain = uc.chain AND adapter_id = %L', multichainQuery, 'wallet');
END
$$;
