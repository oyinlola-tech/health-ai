import { executeStatements, id, timestamps } from "./helpers.js";

export async function up(connection) {
  await executeStatements(connection, [
    `create table if not exists user_trials (
      id ${id} primary key,
      user_id ${id} not null,
      start_date datetime not null,
      end_date datetime not null,
      status varchar(40) not null default 'active',
      created_at datetime not null default current_timestamp,
      updated_at datetime not null default current_timestamp on update current_timestamp,
      unique key uq_user_trials_user (user_id),
      index idx_user_trials_status_end (status, end_date)
    )`,
    `create table if not exists coupons (
      id ${id} primary key,
      code varchar(40) not null unique,
      discount_type varchar(20) not null,
      discount_value int not null,
      max_uses int null,
      used_count int not null default 0,
      expiry_date datetime null,
      is_active boolean not null default true,
      created_by ${id} null,
      ${timestamps()},
      index idx_coupons_active_expiry (is_active, expiry_date)
    )`,
    `create table if not exists coupon_redemptions (
      id ${id} primary key,
      user_id ${id} not null,
      coupon_id ${id} not null,
      payment_id ${id} null,
      plan_id ${id} null,
      discount_amount int not null default 0,
      final_amount int not null default 0,
      used_at datetime not null default current_timestamp,
      unique key uq_coupon_redemptions_user_coupon (user_id, coupon_id),
      index idx_coupon_redemptions_coupon (coupon_id, used_at),
      index idx_coupon_redemptions_user (user_id, used_at)
    )`
  ]);
}
