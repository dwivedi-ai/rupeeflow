package main

import (
	"log"
	"net/http"
	"rupeeflow/internal/api"
	"rupeeflow/internal/auth"
	"rupeeflow/internal/config"
	"rupeeflow/internal/storage/postgres"
)

func main() {
	cfg, err := config.LoadConfig(".env")
	if err != nil {
		log.Fatalf("cannot load config: %v", err)
	}
	store, err := postgres.NewStore(cfg.DBSource)
	if err != nil {
		log.Fatalf("cannot connect to db: %v", err)
	}
	defer store.Close()
	log.Println("Database connection successful")
	googleOAuthConfig := auth.NewGoogleOAuthConfig(cfg)
	jwtMaker, err := auth.NewJWTMaker(cfg.JWTSecretKey)
	if err != nil {
		log.Fatalf("cannot create token maker: %v", err)
	}
	handler := api.NewAPIHandler(store, googleOAuthConfig, jwtMaker, cfg)
	router := api.NewRouter(handler, cfg)
	log.Printf("Starting server on port %s", cfg.ServerPort)
	if err := http.ListenAndServe(":"+cfg.ServerPort, router); err != nil {
		log.Fatalf("could not start server: %v", err)
	}
}
