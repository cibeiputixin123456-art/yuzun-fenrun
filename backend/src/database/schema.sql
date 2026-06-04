-- 御尊养生局分润系统数据库结构

-- 会员表
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  wechat_id TEXT,
  external_id TEXT,                            -- 外部平台ID（手动填入，用于对账）
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',        -- member / admin
  level TEXT NOT NULL DEFAULT 'huiyuan',      -- huiyuan(会员) / xinxiang(星享) / xingyao(星耀)
  rank TEXT NOT NULL DEFAULT 'xingyao',       -- xingyao/senior/expert/city/region/strategy/shareholder
  referrer_id INTEGER,                         -- 直接上级ID
  registered_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  upgraded_at TEXT,
  total_personal_sales REAL NOT NULL DEFAULT 0,
  total_service_sales REAL NOT NULL DEFAULT 0,
  total_commission_earned REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY (referrer_id) REFERENCES members(id)
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seller_id INTEGER NOT NULL,
  buyer_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 826,
  total_amount REAL NOT NULL,
  order_type TEXT NOT NULL,  -- self_order / customer_sale / upgrade
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (seller_id) REFERENCES members(id)
);

-- 佣金记录表
CREATE TABLE IF NOT EXISTS commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  member_id INTEGER NOT NULL,
  commission_type TEXT NOT NULL,
  -- self_retail(自营零售) / referral_income(下级下单推荐收益28%)
  -- service_subsidy(服务津贴5%) / training_subsidy(培育补贴1.5%)
  -- upgrade_bonus(升级补差价) / tier_incentive(阶梯激励)
  rate REAL,
  amount REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  status TEXT NOT NULL DEFAULT 'pending'  -- pending / paid
);

-- 阶梯进度表
CREATE TABLE IF NOT EXISTS tier_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL UNIQUE,
  tier_level TEXT NOT NULL DEFAULT 'xingyao',
  cumulative_sales REAL NOT NULL DEFAULT 0,
  tier_bonus_earned REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (member_id) REFERENCES members(id)
);
