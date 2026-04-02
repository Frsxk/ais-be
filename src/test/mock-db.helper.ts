export function createMockQueryBuilder(resolveValue: unknown = []) {
  const builder: Record<string, jest.Mock> = {};
  const methods = [
    'select',
    'from',
    'where',
    'set',
    'values',
    'returning',
    'innerJoin',
    'insert',
    'update',
    'delete',
  ];

  for (const method of methods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }

  builder['then'] = jest.fn((resolve: (val: unknown) => void) =>
    resolve(resolveValue),
  );

  return builder;
}

export function createMockDb() {
  const defaultBuilder = createMockQueryBuilder([]);

  return {
    select: jest.fn().mockReturnValue(defaultBuilder),
    insert: jest.fn().mockReturnValue(defaultBuilder),
    update: jest.fn().mockReturnValue(defaultBuilder),
    delete: jest.fn().mockReturnValue(defaultBuilder),
    execute: jest.fn().mockResolvedValue([]),
    transaction: jest.fn(),
  };
}
