package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Store struct {
	*Queries
	db *pgxpool.Pool
}

func NewStore(connString string) (*Store, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	dbpool, err := pgxpool.New(ctx, connString)
	if err != nil {
		return nil, fmt.Errorf("failed to create connection pool: %w", err)
	}
	if err := dbpool.Ping(ctx); err != nil {
		dbpool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	if err := ensureSchema(ctx, dbpool); err != nil {
		dbpool.Close()
		return nil, err
	}

	return &Store{
		Queries: New(dbpool),
		db:      dbpool,
	}, nil
}
func (s *Store) Close() {
	s.db.Close()
}
func (s *Store) execTx(ctx context.Context, fn func(*Queries) error) error {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	q := New(tx)
	err = fn(q)
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}
