import { pool } from "../../config/database.js";
import { createId } from "../../utils/uuid.js";

export const couponRepository = {
  async createCoupon(input, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into coupons (id, code, discount_type, discount_value, max_uses, expiry_date, is_active, created_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [id, input.code, input.discountType, input.discountValue, input.maxUses ?? null, input.expiryDate ?? null, input.isActive ?? true, input.createdBy ?? null]
    );
    return rows[0];
  },

  async listCoupons(client = pool) {
    const { rows } = await client.query(
      `select c.*,
              coalesce(stats.redemption_count, 0) as redemption_count,
              coalesce(stats.total_discount_amount, 0) as total_discount_amount
       from coupons c
       left join (
         select coupon_id,
                count(id) as redemption_count,
                coalesce(sum(discount_amount), 0) as total_discount_amount
         from coupon_redemptions
         group by coupon_id
       ) stats on stats.coupon_id = c.id
       order by c.created_at desc`
    );
    return rows;
  },

  async findByCode(code, client = pool, lock = false) {
    const { rows } = await client.query(`select * from coupons where code = $1 ${lock ? "for update" : ""}`, [String(code || "").trim().toUpperCase()]);
    return rows[0] || null;
  },

  async findById(id, client = pool) {
    const { rows } = await client.query("select * from coupons where id = $1", [id]);
    return rows[0] || null;
  },

  async disableCoupon(id, client = pool) {
    const { rows } = await client.query("update coupons set is_active = false, updated_at = now() where id = $1 returning *", [id]);
    return rows[0] || null;
  },

  async findRedemption({ userId, couponId }, client = pool) {
    const { rows } = await client.query("select * from coupon_redemptions where user_id = $1 and coupon_id = $2 limit 1", [userId, couponId]);
    return rows[0] || null;
  },

  async redeem({ userId, couponId, paymentId = null, planId = null, discountAmount, finalAmount }, client = pool) {
    const id = createId();
    const { rows } = await client.query(
      `insert into coupon_redemptions (id, user_id, coupon_id, payment_id, plan_id, discount_amount, final_amount)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning *`,
      [id, userId, couponId, paymentId, planId, discountAmount, finalAmount]
    );
    await client.query("update coupons set used_count = used_count + 1, updated_at = now() where id = $1", [couponId]);
    return rows[0];
  },

  async usageStats(couponId, client = pool) {
    const { rows } = await client.query(
      `select cr.*, u.email
       from coupon_redemptions cr
       left join users u on u.id = cr.user_id
       where cr.coupon_id = $1
       order by cr.used_at desc`,
      [couponId]
    );
    return rows;
  }
};
