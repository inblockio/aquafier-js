-- CreateIndex
CREATE INDEX "contract_sender_created_at_idx" ON "contract"("sender", "created_at");

-- CreateIndex
CREATE INDEX "latest_user_created_at_idx" ON "latest"("user", "created_at");

-- CreateIndex
CREATE INDEX "notifications_receiver_created_on_idx" ON "notifications"("receiver", "created_on");

-- CreateIndex
CREATE INDEX "revision_created_at_idx" ON "revision"("created_at");

-- CreateIndex
CREATE INDEX "revision_previous_idx" ON "revision"("previous");
