-- CreateTable
CREATE TABLE "conversation_summaries" (
    "id" TEXT NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "customer_name" TEXT,
    "summary" TEXT NOT NULL,
    "next_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversation_summaries_session_id_key" ON "conversation_summaries"("session_id");

-- CreateIndex
CREATE INDEX "conversation_summaries_session_id_idx" ON "conversation_summaries"("session_id");
