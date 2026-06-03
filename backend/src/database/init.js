const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = path.join(__dirname, '../../data/yuzun.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// 建表
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// 创建管理员账号
const adminPhone = process.env.ADMIN_PHONE || '13800000000';
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
const existing = db.prepare('SELECT id FROM members WHERE phone = ?').get(adminPhone);

if (!existing) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  const stmt = db.prepare(`
    INSERT INTO members (name, phone, password_hash, role, level, rank)
    VALUES (?, ?, ?, 'admin', 'xingyao', 'xingyao')
  `);
  const result = stmt.run('管理员', adminPhone, hash);
  db.prepare('INSERT INTO tier_progress (member_id) VALUES (?)').run(result.lastInsertRowid);
  console.log(`✅ 管理员账号创建成功：${adminPhone} / ${adminPassword}`);
} else {
  console.log('ℹ️  管理员已存在，跳过创建');
}

db.close();
console.log('✅ 数据库初始化完成');
