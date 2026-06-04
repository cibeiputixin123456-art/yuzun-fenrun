/**
 * 数据库封装 - 使用 Turso (libsql) 云数据库
 * 异步 API，所有路由需要 async/await
 */
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_URL || 'file:./data/yuzun.db',
  authToken: process.env.TURSO_TOKEN,
});

function toObj(result) {
  if (!result || !result.rows || result.rows.length === 0) return undefined;
  const obj = {};
  result.columns.forEach((col, i) => { obj[col] = result.rows[0][i]; });
  return obj;
}

function toArr(result) {
  if (!result || !result.rows) return [];
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

const db = {
  // 初始化建表
  async init(sql) {
    const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of stmts) {
      await client.execute(stmt);
    }
  },

  prepare(sql) {
    return {
      async run(...params) {
        const args = params.flat();
        const r = await client.execute({ sql, args });
        return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.rowsAffected };
      },
      async get(...params) {
        const args = params.flat();
        const r = await client.execute({ sql, args });
        return toObj(r);
      },
      async all(...params) {
        const args = params.flat();
        const r = await client.execute({ sql, args });
        return toArr(r);
      },
    };
  },

  // 事务
  transaction(fn) {
    return async (...args) => {
      await client.execute('BEGIN');
      try {
        const result = await fn(...args);
        await client.execute('COMMIT');
        return result;
      } catch (err) {
        try { await client.execute('ROLLBACK'); } catch {}
        throw err;
      }
    };
  },

  client,
};

module.exports = db;
