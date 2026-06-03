/**
 * 御尊养生局 · 佣金计算引擎
 * 严格两级分润，硬编码规则，不可修改
 */

const UNIT_PRICE = 826;

// 阶梯激励规则（累计制）
const TIER_RULES = [
  { min: 0,         max: 600000,   rate: 0,    level: 'xingyao',    label: '星耀分享官' },
  { min: 600000,    max: 1300000,  rate: 0.05, level: 'senior',     label: '高级服务顾问' },
  { min: 1300000,   max: 1990000,  rate: 0.06, level: 'expert',     label: '资深服务顾问' },
  { min: 1990000,   max: 3000000,  rate: 0.07, level: 'city',       label: '城市运营负责人' },
  { min: 3000000,   max: 5000000,  rate: 0.08, level: 'region',     label: '大区运营负责人' },
  { min: 5000000,   max: 10000000, rate: 0.10, level: 'strategy',   label: '战略共建合伙人' },
  { min: 10000000,  max: Infinity, rate: 0,    level: 'shareholder',label: '公司股东董事' },
];

/**
 * 根据累计服务销售额计算当前职级
 */
function getRankByServiceSales(sales) {
  for (let i = TIER_RULES.length - 1; i >= 0; i--) {
    if (sales >= TIER_RULES[i].min) {
      return TIER_RULES[i].level;
    }
  }
  return 'xingyao';
}

/**
 * 计算阶梯激励金额（跨区间拆分）
 * @param {number} oldSales - 之前的累计服务销售额
 * @param {number} addAmount - 本次新增销售额
 * @returns {{ bonus: number, newRank: string, tierDetails: Array }}
 */
function calcTierBonus(oldSales, addAmount) {
  const newSales = oldSales + addAmount;
  let bonus = 0;
  const tierDetails = [];

  for (const tier of TIER_RULES) {
    if (tier.rate === 0) continue; // 无激励区间跳过
    if (newSales <= tier.min) break;
    if (oldSales >= tier.max) continue;

    const overlapStart = Math.max(oldSales, tier.min);
    const overlapEnd = Math.min(newSales, tier.max);

    if (overlapEnd > overlapStart) {
      const tierBonus = (overlapEnd - overlapStart) * tier.rate;
      bonus += tierBonus;
      tierDetails.push({
        level: tier.level,
        label: tier.label,
        amount: tierBonus,
        rate: tier.rate,
      });
    }
  }

  return {
    bonus: Math.round(bonus * 100) / 100,
    newRank: getRankByServiceSales(newSales),
    tierDetails,
  };
}

/**
 * 判断1.5%培育补贴是否触发
 * 规则：链条中存在"非星耀"节点（星享/普通客户/会员）时触发
 * 对于 self_order / upgrade：看 seller 是否为星享
 * 对于 customer_sale：星享卖触发（有星享节点）；星耀卖也触发（买家是普通客户）
 */
function shouldTriggerTrainingSubsidy(orderType, sellerLevel) {
  if (orderType === 'customer_sale') {
    // 星享卖：链中有星享，触发
    // 星耀卖：买家是普通客户（非星耀），触发
    return true;
  }
  if (orderType === 'self_order' || orderType === 'upgrade') {
    // 只有 seller 是星享时触发
    return sellerLevel === 'xinxiang';
  }
  return false;
}

/**
 * 主佣金计算函数
 * @param {Object} params
 * @param {Object} params.seller - 下单会员 { id, level }
 * @param {Object|null} params.level1 - 直接上级 { id, level } 或 null
 * @param {Object|null} params.level2 - 上级的上级 { id, level } 或 null
 * @param {number} params.totalAmount - 订单总金额
 * @param {string} params.orderType - self_order / customer_sale / upgrade
 * @param {number} params.orderId - 订单ID
 * @returns {Array} commissions - 要写入数据库的佣金记录列表
 */
function calcCommissions({ seller, level1, level2, totalAmount, orderType, orderId }) {
  const commissions = [];

  // ============================================================
  // 情况一：self_order（会员自己复购/自用）
  // ============================================================
  if (orderType === 'self_order') {
    // seller 自己不拿

    if (level1) {
      if (level1.level === 'xingyao') {
        // 上级是星耀，拿 28%
        commissions.push({
          order_id: orderId,
          member_id: level1.id,
          commission_type: 'referral_income',
          rate: 0.28,
          amount: round(totalAmount * 0.28),
        });

        // level2 是否触发 1.5%（seller 是星享则触发）
        if (level2 && level2.level === 'xingyao' && shouldTriggerTrainingSubsidy('self_order', seller.level)) {
          commissions.push({
            order_id: orderId,
            member_id: level2.id,
            commission_type: 'training_subsidy',
            rate: 0.015,
            amount: round(totalAmount * 0.015),
          });
        }
      }
      // level1 是星享：不能收下级佣金，level2 也不越级，全部归平台
    }
  }

  // ============================================================
  // 情况二：customer_sale（卖给客户）
  // ============================================================
  else if (orderType === 'customer_sale') {
    if (seller.level === 'xinxiang') {
      // 星享：拿 23% 零售提成
      commissions.push({
        order_id: orderId,
        member_id: seller.id,
        commission_type: 'self_retail',
        rate: 0.23,
        amount: round(totalAmount * 0.23),
      });

      if (level1 && level1.level === 'xingyao') {
        // 上级星耀：拿 5% 服务津贴
        commissions.push({
          order_id: orderId,
          member_id: level1.id,
          commission_type: 'service_subsidy',
          rate: 0.05,
          amount: round(totalAmount * 0.05),
        });

        // level2：1.5% 培育补贴（链中有星享，触发）
        if (level2 && level2.level === 'xingyao') {
          commissions.push({
            order_id: orderId,
            member_id: level2.id,
            commission_type: 'training_subsidy',
            rate: 0.015,
            amount: round(totalAmount * 0.015),
          });
        }
      }
    } else if (seller.level === 'xingyao') {
      // 星耀：拿 28% 零售提成
      commissions.push({
        order_id: orderId,
        member_id: seller.id,
        commission_type: 'self_retail',
        rate: 0.28,
        amount: round(totalAmount * 0.28),
      });

      // 上级星耀：1.5% 培育补贴（买家是普通客户，非星耀，触发）
      if (level1 && level1.level === 'xingyao') {
        commissions.push({
          order_id: orderId,
          member_id: level1.id,
          commission_type: 'training_subsidy',
          rate: 0.015,
          amount: round(totalAmount * 0.015),
        });
      }
      // level2：不超两级，不拿
    }
  }

  // ============================================================
  // 情况三：upgrade（星享升级补购4盒）
  // ============================================================
  else if (orderType === 'upgrade') {
    // seller 自己不拿

    if (level1 && level1.level === 'xingyao') {
      // 上级星耀：拿 28% 升级补差价
      commissions.push({
        order_id: orderId,
        member_id: level1.id,
        commission_type: 'upgrade_bonus',
        rate: 0.28,
        amount: round(totalAmount * 0.28),
      });

      // level2：seller 此时还是星享身份，触发 1.5%
      if (level2 && level2.level === 'xingyao') {
        commissions.push({
          order_id: orderId,
          member_id: level2.id,
          commission_type: 'training_subsidy',
          rate: 0.015,
          amount: round(totalAmount * 0.015),
        });
      }
    }
  }

  return commissions;
}

function round(val) {
  return Math.round(val * 100) / 100;
}

module.exports = {
  calcCommissions,
  calcTierBonus,
  getRankByServiceSales,
  TIER_RULES,
  UNIT_PRICE,
};
