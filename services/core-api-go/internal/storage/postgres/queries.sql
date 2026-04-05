-- queries.sql
-- name: CreateUser :one
INSERT INTO users (google_id, email, full_name, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *;
-- name: CreateManualUser :one
INSERT INTO users (email, full_name, password_hash) VALUES ($1, $2, $3) RETURNING *;
-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1 LIMIT 1;
-- name: GetUserByGoogleID :one
SELECT * FROM users WHERE google_id = $1 LIMIT 1;
-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;
-- name: UpdateUserProfile :one
UPDATE users SET full_name = $2, email = $3 WHERE id = $1 RETURNING *;
-- name: UpdateUserPassword :one
UPDATE users SET password_hash = $2 WHERE id = $1 RETURNING *;
-- name: CreateTransaction :one
INSERT INTO transactions (user_id, amount, description, type, transaction_date, category) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;
-- name: GetTransactionByID :one
SELECT * FROM transactions WHERE id = $1 AND user_id = $2 LIMIT 1;
-- name: ListTransactionsByUserID :many
SELECT * FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC, created_at DESC LIMIT $2 OFFSET $3;
-- name: UpdateTransaction :one
UPDATE transactions SET amount = $2, description = $3, type = $4, transaction_date = $5, category = $6 WHERE id = $1 AND user_id = $7 RETURNING *;
-- name: DeleteTransaction :exec
DELETE FROM transactions WHERE id = $1 AND user_id = $2;
-- name: GetDashboardSummary :one
SELECT COALESCE(SUM(amount) FILTER (WHERE type = 'INCOME'), 0)::NUMERIC(19, 4) AS total_income, COALESCE(SUM(amount) FILTER (WHERE type = 'EXPENSE'), 0)::NUMERIC(19, 4) AS total_expenses FROM transactions WHERE user_id = $1 AND transaction_date >= $2 AND transaction_date <= $3;
-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;
