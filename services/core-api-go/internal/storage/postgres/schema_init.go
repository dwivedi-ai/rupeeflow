package postgres

import (
	"context"
	_ "embed"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

func ensureSchema(ctx context.Context, db *pgxpool.Pool) error {
	if _, err := db.Exec(ctx, schemaSQL); err != nil {
		return fmt.Errorf("failed to apply database schema: %w", err)
	}

	return nil
}
