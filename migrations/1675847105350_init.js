exports.up = (pgm) => {
  // adapters
  pgm.createTable('adapters', {
    id: {
      type: 'varchar',
      primaryKey: true,
    },
    chain: {
      type: 'varchar',
      primaryKey: true,
    },
    contracts_expire_at: {
      type: 'timestamptz',
      notNull: false,
    },
    contracts_revalidate_props: {
      type: 'jsonb',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  })

  pgm.createIndex('adapters', ['id', 'chain'])

  // balances
  pgm.createTable('balances', {
    from_address: {
      type: 'bytea',
      notNull: true,
    },
    amount: {
      type: 'numeric',
      notNull: false,
    },
    price: {
      type: 'numeric',
      notNull: false,
    },
    balance_usd: {
      type: 'numeric',
      notNull: false,
    },
    chain: {
      type: 'varchar',
      notNull: true,
    },
    address: {
      type: 'bytea',
      notNull: true,
    },
    name: {
      type: 'varchar',
      notNull: false,
    },
    standard: {
      type: 'varchar',
      notNull: false,
    },
    category: {
      type: 'varchar',
      notNull: false,
    },
    adapter_id: {
      type: 'varchar',
      notNull: false,
    },
    data: {
      type: 'jsonb',
      notNull: false,
    },
    timestamp: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  })

  pgm.createIndex('balances', ['chain', 'from_address'])

  // balances snapshots
  pgm.createTable('balances_snapshots', {
    from_address: {
      type: 'bytea',
      notNull: true,
    },
    balance_usd: {
      type: 'numeric',
      notNull: false,
    },
    chain: {
      type: 'varchar',
      notNull: true,
    },
    adapter_id: {
      type: 'varchar',
      notNull: false,
    },
    metadata: {
      type: 'jsonb',
      notNull: false,
    },
    timestamp: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  })

  pgm.createIndex('balances_snapshots', ['from_address', 'timestamp'])

  // contracts
  pgm.createTable('contracts', {
    chain: {
      type: 'varchar',
      notNull: true,
    },
    address: {
      type: 'bytea',
      notNull: true,
    },
    adapter_id: {
      type: 'varchar',
      notNull: true,
    },
    category: {
      type: 'varchar',
      notNull: true,
    },
    name: {
      type: 'varchar',
      notNull: false,
    },
    standard: {
      type: 'varchar',
      notNull: false,
    },
    data: {
      type: 'jsonb',
      notNull: false,
    },
    timestamp: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  })

  pgm.createIndex('contracts', ['chain', 'address'])
  pgm.createIndex('contracts', 'adapter_id')

  pgm.addConstraint('contracts', 'contracts_key', 'unique (adapter_id, chain, address, category)')

  // labels
  pgm.createTable('labels', {
    address: {
      type: 'bytea',
      notNull: true,
    },
    type: {
      type: 'varchar',
      notNull: true,
    },
    value: {
      type: 'varchar',
      notNull: true,
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  })

  pgm.createIndex('labels', 'address')
}
