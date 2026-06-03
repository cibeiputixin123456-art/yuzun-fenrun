/**
 * 数据库封装 - 使用 Node.js 24 内置 node:sqlite
 * 提供与 better-sqlite3 兼容的同步 API
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(__dirname, '../../data/yuzun.db');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// 兼容 better-sqlite3 风格的 prepare/run/get/all
const _origPrepare = db.prepare.bind(db);

// 包装 prepare 让它返回支持 run/get/all 的对象
const origPrepare = (sql) => {
  const stmt = _origPrepare(sql);
  return {
    run: (...params) => stmt.run(...params),
    get: (...params) => stmt.get(...params),
    all: (...params) => stmt.all(...params),
  };
};

db.prepare = origPrepare;

// 事务支持
db.transaction = (fn) => {
  return (...args) => {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

module.exports = db;
