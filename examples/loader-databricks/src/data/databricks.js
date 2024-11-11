import "dotenv/config";
import {DBSQLClient, DBSQLLogger, LogLevel} from "@databricks/sql";

const token = process.env.DATABRICKS_TOKEN;
const host = process.env.DATABRICKS_SERVER_HOSTNAME;
const path = process.env.DATABRICKS_HTTP_PATH;

if (!token) throw new Error("missing DATABRICKS_TOKEN");
if (!host) throw new Error("missing DATABRICKS_SERVER_HOSTNAME");
if (!path) throw new Error("missing DATABRICKS_HTTP_PATH");

export async function openSession(f) {
  const logger = new DBSQLLogger({level: LogLevel.error}); // don’t pollute stdout
  const client = new DBSQLClient({logger});
  await client.connect({host, path, token});
  const session = await client.openSession();
  try {
    return await f(session, client);
  } finally {
    await session.close();
    await client.close();
  }
}

export async function executeStatement(statement, options) {
  return await openSession(async (session) => {
    const queryOperation = await session.executeStatement(statement, options);
    try {
      return await queryOperation.fetchAll();
    } finally {
      await queryOperation.close();
    }
  });
}
