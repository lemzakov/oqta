-- CreateTable (with IF NOT EXISTS to handle existing databases)
CREATE TABLE IF NOT EXISTS "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "customer_sessions" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "linked_by" TEXT,
    "notes" TEXT,

    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "free_zone_integrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "api_endpoint" TEXT,
    "api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "free_zone_integrations_pkey" PRIMARY KEY ("id")
);

-- Update existing invoices table
DO $$ 
BEGIN
    -- Add customer_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='customer_id') THEN
        ALTER TABLE "invoices" ADD COLUMN "customer_id" TEXT;
    END IF;

    -- Add invoice_number column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='invoice_number') THEN
        ALTER TABLE "invoices" ADD COLUMN "invoice_number" TEXT;
    END IF;

    -- Add currency column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='currency') THEN
        ALTER TABLE "invoices" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'AED';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='description') THEN
        ALTER TABLE "invoices" ADD COLUMN "description" TEXT;
    END IF;

    -- Add due_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='due_date') THEN
        ALTER TABLE "invoices" ADD COLUMN "due_date" TIMESTAMP(3);
    END IF;

    -- Add sent_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='sent_at') THEN
        ALTER TABLE "invoices" ADD COLUMN "sent_at" TIMESTAMP(3);
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='invoices' AND column_name='updated_at') THEN
        ALTER TABLE "invoices" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- CreateIndex
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'customers_email_idx') THEN
        CREATE INDEX "customers_email_idx" ON "customers"("email");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'customer_sessions_customer_id_idx') THEN
        CREATE INDEX "customer_sessions_customer_id_idx" ON "customer_sessions"("customer_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'customer_sessions_session_id_idx') THEN
        CREATE INDEX "customer_sessions_session_id_idx" ON "customer_sessions"("session_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'free_zone_integrations_code_key') THEN
        CREATE UNIQUE INDEX "free_zone_integrations_code_key" ON "free_zone_integrations"("code");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invoices_customer_id_idx') THEN
        CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'invoices_invoice_number_key') THEN
        CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");
    END IF;
END $$;

-- AddForeignKey (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'customer_sessions_customer_id_fkey'
    ) THEN
        ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customer_id_fkey" 
        FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoices_customer_id_fkey'
    ) THEN
        ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" 
        FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
