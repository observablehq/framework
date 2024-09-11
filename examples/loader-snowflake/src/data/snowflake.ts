import "dotenv/config";
import type {Binds, Connection, ConnectionOptions} from "snowflake-sdk";
import snowflake from "snowflake-sdk";

const {
  SNOWFLAKE_ACCOUNT,
  SNOWFLAKE_USERNAME,
  SNOWFLAKE_PASSWORD,
  SNOWFLAKE_DATABASE,
  SNOWFLAKE_SCHEMA,
  SNOWFLAKE_WAREHOUSE,
  SNOWFLAKE_ROLE
} = process.env;

if (!SNOWFLAKE_ACCOUNT) throw new Error("missing SNOWFLAKE_ACCOUNT");
if (!SNOWFLAKE_USERNAME) throw new Error("missing SNOWFLAKE_USERNAME");

const options: ConnectionOptions = {
  account: SNOWFLAKE_ACCOUNT,
  username: SNOWFLAKE_USERNAME,
  password: SNOWFLAKE_PASSWORD,
  database: SNOWFLAKE_DATABASE,
  schema: SNOWFLAKE_SCHEMA,
  warehouse: SNOWFLAKE_WAREHOUSE,
  role: SNOWFLAKE_ROLE
};

export async function run<T>(f: (query: (sql: string, params?: Binds) => Promise<any[]>) => Promise<T>): Promise<T> {
  const connection = await connect(options);
  try {
    return await f((sql, params) => execute(connection, sql, params));
  } finally {
    await destroy(connection);
  }
}

async function connect(options: ConnectionOptions): Promise<Connection> {
  const connection = (snowflake as any).createConnection(options);
  await new Promise<void>((resolve, reject) => {
    connection.connect((error) => {
      if (error) return reject(error);
      resolve();
    });
  });
  return connection;
}

async function destroy(connection: Connection): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    connection.destroy((error) => {
      if (error) return reject(error);
      resolve();
    });
  });
}

async function execute(connection: Connection, sql: string, params?: Binds): Promise<any[]> {
  return await new Promise<any[]>((resolve, reject) => {
    connection.execute({
      sqlText: sql,
      binds: params,
      complete(error, statement, rows) {
        if (error) return reject(error);
        resolve(rows!);
      }
    });
  });
}
