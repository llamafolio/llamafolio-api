-- Replace functions when adding new chain support

-- Stats on indexer syncing
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
		tx_input_decoded_named_args boolean,
		tx_input_decoded jsonb,
		tx_success boolean,
		tt_token_address bytea,
		tt_from_address bytea,
		tt_to_address bytea,
		tt_value numeric,
		tt_transaction_hash bytea
	)
	LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chains.chain as _chain
        FROM chains WHERE is_evm;
	multichainTxsQuery text := '';
	multichainQuery text := '';
BEGIN 
	FOR rec IN tables LOOP
		multichainTxsQuery := multichainTxsQuery || 
		format('
			select 
				%L::varchar as chain,
				block_number as b_number,
				timestamp as b_timestamp,
				%I.transactions.hash as tx_hash,
				%I.transactions.from_address as tx_from_address,
				%I.transactions.to_address as tx_to_address,
				%I.transactions.value as tx_value,
				%I.transactions.gas_used as tx_gas_used,
				cast(gas_price as decimal(38,0)) as tx_gas_price,
				input_decoded_named_args as tx_input_decoded_named_args,
				input_decoded as tx_input_decoded,
				success as tx_success
			from %I.transactions
			inner join %I.blocks on block_number = number
			where (from_address = %L or to_address = %L) and (timestamp < %L::timestamp)',
			rec._chain, rec._chain, rec._chain, rec._chain, rec._chain, rec._chain, rec._chain, rec._chain, address, address, _timestamp_before
		) || 
		' union all ';
	END LOOP;
	
	-- remove the last ' union all '
	multichainTxsQuery := left(multichainTxsQuery, -10);
	multichainTxsQuery := multichainTxsQuery || format('limit %L', _limit);
	
	FOR rec IN tables LOOP
    	multichainQuery := multichainQuery || format(
			'select 
				chain,
				b_number,
				b_timestamp,
				tx_hash,
				tx_from_address,
				tx_to_address,
				tx_value,
				tx_gas_used,
				tx_gas_price,
				tx_input_decoded_named_args,
				tx_input_decoded,
				tx_success,
				token_address as tt_token_address,
				from_address as tt_from_address,
				to_address as tt_to_address,
				value as tt_value,
				transaction_hash as tt_transaction_hash
			from (
				%s
			) txs
			left join %I.token_transfers
			on txs.tx_hash = %I.token_transfers.transaction_hash',
        multichainTxsQuery, rec._chain, rec._chain) ||
		' union all ';
	END LOOP;
	
	-- remove the last ' union all '
	multichainQuery := left(multichainQuery, -10);
	
	return query execute multichainQuery || ' order by b_timestamp desc';
END
$$;

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
								SELECT DISTINCT ON (c.chain, c.address, c.parent, c.type) c.* FROM (
									SELECT c.* FROM ( %s ) AS uc
									INNER JOIN contracts c ON (
										c.chain = uc.chain AND
										c.address = uc.contract_address
									) UNION ALL
									SELECT c.* FROM ( %s ) AS uc
									INNER JOIN contracts c ON (
										c.chain = uc.chain AND
										c.parent = uc.contract_address
									)
							   	) c
								', multichainQuery, multichainQuery);
END
$$;

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
			format('
				(SELECT token_address, %L::varchar as chain
				FROM %I.token_transfers t
				WHERE t.to_address = %L)
				UNION ALL 
				(SELECT %L::bytea as token_address, %L::varchar AS chain 
				FROM %I.transactions 
				WHERE to_address = %L AND value > 0 LIMIT 1)',
				rec._chain, rec._chain, address, '\x0000000000000000000000000000000000000000', rec._chain, rec._chain, address
			) || 
		' union all ';
	END LOOP;
  
	-- remove the last ' union all '
	multichainQuery := left(multichainQuery, -10);
  
	return query execute format('SELECT DISTINCT ON (chain, token_address) c.* FROM ( %s ) AS uc
								INNER JOIN contracts c ON c.address = uc.token_address AND c.chain = uc.chain AND adapter_id = %L', multichainQuery, 'wallet');
END
$$;