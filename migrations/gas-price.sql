CREATE MATERIALIZED VIEW ethereum.gas_price_1D AS
SELECT date_trunc('hour', timestamp) as timestamp,
	min(gas_price) / 10^9 AS min_gas_price,
	(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gas_price)) / 10^9 AS median_gas_price 
FROM ethereum.blocks
JOIN ethereum.transactions on block_number = number
WHERE success AND timestamp > now() - interval '1 day'
GROUP BY 1
ORDER BY 1 DESC;

CREATE MATERIALIZED VIEW ethereum.gas_price_1W AS
SELECT t.timestamp + interval '4 hours' * t.bucket as timestamp, t.min_gas_price, t.median_gas_price FROM (
	SELECT date_trunc('day', timestamp) as timestamp,
		(extract(hour FROM timestamp)::int / 4) AS bucket,
		min(gas_price) / 10^9 AS min_gas_price,
		(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gas_price)) / 10^9 AS median_gas_price 
	FROM ethereum.blocks
	JOIN ethereum.transactions on block_number = number
	WHERE success AND timestamp > now() - interval '7 days'
	GROUP BY 1, 2
	ORDER BY 1, 2
) t ORDER BY timestamp ASC;

CREATE MATERIALIZED VIEW ethereum.gas_price_1M AS
SELECT t.timestamp + interval '12 hours' * t.bucket as timestamp, t.min_gas_price, t.median_gas_price FROM (
	SELECT date_trunc('day', timestamp) as timestamp,
		(extract(hour FROM timestamp)::int / 12) AS bucket,
		min(gas_price) / 10^9 AS min_gas_price,
		(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gas_price)) / 10^9 AS median_gas_price 
	FROM ethereum.blocks
	JOIN ethereum.transactions on block_number = number
	WHERE success AND timestamp > now() - interval '1 month'
	GROUP BY 1, 2
	ORDER BY 1, 2
) t ORDER BY timestamp ASC;

CREATE MATERIALIZED VIEW ethereum.gas_price_1Y AS
SELECT date_trunc('day', timestamp) as timestamp,
	min(gas_price) / 10^9 AS min_gas_price,
	(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY gas_price)) / 10^9 AS median_gas_price 
FROM ethereum.blocks
JOIN ethereum.transactions on block_number = number
WHERE success AND timestamp > now() - interval '12 months'
GROUP BY 1
ORDER BY 1 DESC;
