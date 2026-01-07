-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "price_monthly_usd" DECIMAL(10,2) NOT NULL,
    "price_yearly_usd" DECIMAL(10,2) NOT NULL,
    "stripe_price_id_monthly" TEXT,
    "stripe_price_id_yearly" TEXT,
    "features" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "billing_cycle" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "stripe_subscription_id" TEXT,
    "stripe_customer_id" TEXT,
    "payment_provider" TEXT NOT NULL,
    "auto_renew" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "subscription_id" TEXT,
    "invoice_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payment_intent_id" TEXT,
    "crypto_transaction_hash" TEXT,
    "crypto_wallet_address" TEXT,
    "crypto_amount" DECIMAL(20,8),
    "crypto_network" TEXT,
    "exchange_rate" DECIMAL(20,8),
    "failure_reason" TEXT,
    "refunded_at" TIMESTAMP(3),
    "refund_amount" DECIMAL(10,2),
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "subscription_id" TEXT,
    "status" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billing_reason" TEXT,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "stripe_invoice_id" TEXT,
    "pdf_url" TEXT,
    "hosted_invoice_url" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_amount" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "proration" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "payment_type" TEXT NOT NULL,
    "payment_provider" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "stripe_payment_method_id" TEXT,
    "card_brand" TEXT,
    "card_last4" TEXT,
    "card_exp_month" INTEGER,
    "card_exp_year" INTEGER,
    "crypto_wallet_address" TEXT,
    "crypto_network" TEXT,
    "billing_email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_usage" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "user_address" TEXT NOT NULL,
    "metric_name" TEXT NOT NULL,
    "usage_value" INTEGER NOT NULL,
    "usage_limit" INTEGER,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_analytics" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "metric_type" TEXT NOT NULL,
    "metric_value" DECIMAL(12,2) NOT NULL,
    "dimension_key" TEXT,
    "dimension_value" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_stripe_price_id_monthly_key" ON "subscription_plans"("stripe_price_id_monthly");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_stripe_price_id_yearly_key" ON "subscription_plans"("stripe_price_id_yearly");

-- CreateIndex
CREATE UNIQUE INDEX "user_subscriptions_stripe_subscription_id_key" ON "user_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_user_address_status_idx" ON "user_subscriptions"("user_address", "status");

-- CreateIndex
CREATE INDEX "user_subscriptions_stripe_subscription_id_idx" ON "user_subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_current_period_end_idx" ON "user_subscriptions"("current_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_intent_id_key" ON "payments"("payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_user_address_status_idx" ON "payments"("user_address", "status");

-- CreateIndex
CREATE INDEX "payments_payment_intent_id_idx" ON "payments"("payment_intent_id");

-- CreateIndex
CREATE INDEX "payments_crypto_transaction_hash_idx" ON "payments"("crypto_transaction_hash");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripe_invoice_id_key" ON "invoices"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "invoices_user_address_status_idx" ON "invoices"("user_address", "status");

-- CreateIndex
CREATE INDEX "invoices_invoice_number_idx" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_stripe_invoice_id_idx" ON "invoices"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "invoice_line_items_invoice_id_idx" ON "invoice_line_items"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_stripe_payment_method_id_key" ON "payment_methods"("stripe_payment_method_id");

-- CreateIndex
CREATE INDEX "payment_methods_user_address_is_default_idx" ON "payment_methods"("user_address", "is_default");

-- CreateIndex
CREATE INDEX "payment_methods_stripe_payment_method_id_idx" ON "payment_methods"("stripe_payment_method_id");

-- CreateIndex
CREATE INDEX "subscription_usage_subscription_id_metric_name_period_start_idx" ON "subscription_usage"("subscription_id", "metric_name", "period_start");

-- CreateIndex
CREATE INDEX "subscription_usage_user_address_metric_name_recorded_at_idx" ON "subscription_usage"("user_address", "metric_name", "recorded_at");

-- CreateIndex
CREATE INDEX "payment_analytics_date_metric_type_idx" ON "payment_analytics"("date", "metric_type");

-- CreateIndex
CREATE INDEX "payment_analytics_metric_type_dimension_key_idx" ON "payment_analytics"("metric_type", "dimension_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_analytics_date_metric_type_dimension_key_dimension__key" ON "payment_analytics"("date", "metric_type", "dimension_key", "dimension_value");

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "user_subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_usage" ADD CONSTRAINT "subscription_usage_user_address_fkey" FOREIGN KEY ("user_address") REFERENCES "users"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
