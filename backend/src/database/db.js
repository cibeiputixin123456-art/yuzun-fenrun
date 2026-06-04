/**
 * 数据库封装 - 使用 Turso (libsql) 云数据库
 * 提供同步风格 API（通过同步包装异步调用）
 */
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN,
});

// 同步执行 SQL（阻塞等待）
function execSync(sql) {
  const p = client.execute(sql);
  let done = false, result, error;
  p.then(r => { result = r; done = true; }).catch(e => { error = e; done = true; });
  // busy wait（仅用于启动初始化）
  const start = Date.now();
  while (!done) {
    if (Date.now() - start > 10000) throw new Error('DB timeout');
  }
  if (error) throw error;
  return result;
}

// 包装为 better-sqlite3 兼容的同步 API
// 注意：Railway 上用 async/await 路由更稳，但这里为兼容现有代码用同步包装
function runSync(sql, params = []) {
  let done = false, result, error;
  client.execute({ sql, args: params })
    .then(r => { result = r; done = true; })
    .catch(e => { error = e; done = true; });
  const start = Date.now();
  while (!done) { if (Date.now() - start > 10000) throw new Error('DB timeout'); }
  if (error) throw error;
  return { lastInsertRowid: result.lastInsertRowid, changes: result.rowsAffected };
}

function getSync(sql, params = []) {
  let done = false, result, error;
  client.execute({ sql, args: params })
    .then(r => { result = r; done = true; })
    .catch(e => { error = e; done = true; });
  const start = Date.now();
  while (!done) { if (Date.now() - start > 10000) throw new Error('DB timeout'); }
  if (error) throw error;
  if (!result.rows || result.rows.length === 0) return undefined;
  // 转换为普通对象
  const row = result.rows[0];
  const obj = {};
  result.columns.forEach((col, i) => { obj[col] = row[i]; });
  return obj;
}

function allSync(sql, params = []) {
  let done = false, result, error;
  client.execute({ sql, args: params })
    .then(r => { result = r; done = true; })
    .catch(e => { error = e; done = true; });
  const start = Date.now();
  while (!done) { if (Date.now() - start > 10000) throw new Error('DB timeout'); }
  if (error) throw error;
  return result.rows.map(row => {
    const obj = {};
    result.columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

const db = {
  exec: (sql) => {
    // 拆分多条语句分别执行
    const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of stmts) {
      runSync(stmt, []);
    }
  },
  prepare: (sql) => ({
    run: (...params) => runSync(sql, params.flat()),
    get: (...params) => getSync(sql, params.flat()),
    all: (...params) => allSync(sql, params.flat()),
  }),
  transaction: (fn) => {
    return (...args) => {
      runSync('BEGIN', []);
      try {
        const result = fn(...args);
        runSync('COMMIT', []);
        return result;
      } catch (err) {
        try { runSync('ROLLBACK', []); } catch {}
        throw err;
      }
    };
  },
  client, // 暴露原生 client 供需要时使用
};

module.exports = db;
