-- Apply after schema.sql. These additions support coupon discovery and redemption.

BEGIN;

ALTER TABLE coupons
    ADD COLUMN category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('food', 'shopping', 'books', 'travel', 'other', 'general'));

ALTER TABLE coupons
    ADD COLUMN redemption_instructions TEXT;

COMMIT;
