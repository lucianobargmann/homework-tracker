-- AddApprovalFields
ALTER TABLE "users" ADD COLUMN "approval_status" TEXT;
ALTER TABLE "users" ADD COLUMN "approved_at" DATETIME;