const db = require('./db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

(async () => {
  // 建表
  await db.init(schema);

  // 兼容升级：如果没有 external_id 列则添加
  try {
    await db.prepare("ALTER TABLE members ADD COLUMN external_id TEXT").run();
    console.log('✅ 添加 external_id 字段');
  } catch {}

  // 创建管理员账号
  const adminPhone = process.env.ADMIN_PHONE || '13800000000';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  const existing = await db.prepare('SELECT id FROM members WHERE phone = ?').get(adminPhone);

  if (!existing) {
    const hash = bcrypt.hashSync(adminPassword, 10);
    const result = await db.prepare(`
      INSERT INTO members (name, phone, password_hash, role, level, rank)
      VALUES (?, ?, ?, 'admin', 'xingyao', 'xingyao')
    `).run('管理员', adminPhone, hash);
    await db.prepare('INSERT INTO tier_progress (member_id) VALUES (?)').run(result.lastInsertRowid);
    console.log(`✅ 管理员账号创建成功：${adminPhone} / ${adminPassword}`);
  } else {
    console.log('ℹ️  管理员已存在，跳过创建');
  }

  console.log('✅ 数据库初始化完成');
})().catch(e => console.error('DB init error:', e.message));
