-- Multi chain transactions from and to given address, sorted by timestamp:
CREATE OR REPLACE VIEW multichain_transactions AS 
SELECT *, null::varchar AS chain, null::timestamp AS timestamp
FROM   ethereum.transactions
WHERE  false;

create or replace function all_transactions_history(address bytea)
  returns setof multichain_transactions
  LANGUAGE plpgsql
as
$$
declare
    tables CURSOR FOR
        SELECT chain
        FROM chains WHERE is_evm;
BEGIN 
  FOR rec IN tables LOOP
    return query EXECUTE format('SELECT %I.transactions.*, %L::varchar as chain, timestamp FROM %I.transactions inner join %I.blocks on block_number = number WHERE from_address = %L or to_address = %L', rec.chain, rec.chain, rec.chain, rec.chain, address, address);
  END LOOP;
END
$$;

-- Usage:
select * from all_transactions_history('\x0000000000000000000000000000000000000000')
order by timestamp desc
limit 25;