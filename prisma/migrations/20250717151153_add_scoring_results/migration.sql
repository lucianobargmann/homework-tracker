-- CreateTable
CREATE TABLE "scoring_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "github_url" TEXT NOT NULL,
    "total_score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "percentage" REAL NOT NULL,
    "report_data" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "scoring_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
