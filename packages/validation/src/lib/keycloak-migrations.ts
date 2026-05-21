export interface RealmMigrationInput {
  filePath: string;
  realm: string;
}

export interface RealmMigrationPlanItem {
  filePath: string;
  fileName: string;
  realm: string;
  order: number;
}

const MIGRATION_FILE_PATTERN = /^(\d{3})-([a-z0-9-]+)\.realm\.json$/;

export function parseRealmMigrationFileName(fileName: string): {
  order: number;
  name: string;
} {
  const match = fileName.match(MIGRATION_FILE_PATTERN);

  if (!match) {
    throw new Error(
      `Invalid migration file name "${fileName}". Expected format NNN-name.realm.json.`,
    );
  }

  return {
    order: Number.parseInt(match[1], 10),
    name: match[2],
  };
}

export function buildRealmMigrationPlan(
  inputs: RealmMigrationInput[],
): RealmMigrationPlanItem[] {
  const seenOrders = new Set<number>();
  const seenRealms = new Set<string>();

  const plan = inputs.map((input) => {
    const fileName = input.filePath.split('/').pop() ?? input.filePath;
    const { order } = parseRealmMigrationFileName(fileName);

    if (seenOrders.has(order)) {
      throw new Error(`Duplicate migration order detected: ${String(order)}.`);
    }

    if (seenRealms.has(input.realm)) {
      throw new Error(
        `Duplicate realm migration detected for realm "${input.realm}".`,
      );
    }

    seenOrders.add(order);
    seenRealms.add(input.realm);

    return {
      filePath: input.filePath,
      fileName,
      realm: input.realm,
      order,
    };
  });

  return plan.sort((a, b) => a.order - b.order);
}
