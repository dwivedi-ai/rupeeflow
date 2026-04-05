package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerPort         string
	DBSource           string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	JWTSecretKey       string
	FrontendURL        string
	NLPServiceURL      string
}

func LoadConfig(path string) (*Config, error) {
	_ = godotenv.Load(path)
	serverPort := os.Getenv("SERVER_PORT")
	if serverPort == "" {
		serverPort = "8080"
	}
	dbSource := os.Getenv("DB_SOURCE")
	if dbSource == "" {
		return nil, fmt.Errorf("DB_SOURCE environment variable is required")
	}
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	if googleClientID == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_ID environment variable is required")
	}
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if googleClientSecret == "" {
		return nil, fmt.Errorf("GOOGLE_CLIENT_SECRET environment variable is required")
	}
	googleRedirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if googleRedirectURL == "" {
		return nil, fmt.Errorf("GOOGLE_REDIRECT_URL environment variable is required")
	}
	jwtSecretKey := os.Getenv("JWT_SECRET_KEY")
	if jwtSecretKey == "" {
		return nil, fmt.Errorf("JWT_SECRET_KEY environment variable is required")
	}
	if len(jwtSecretKey) < 32 {
		return nil, fmt.Errorf("JWT_SECRET_KEY must be at least 32 characters long for security")
	}
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		return nil, fmt.Errorf("FRONTEND_URL environment variable is required")
	}
	nlpServiceURL := os.Getenv("NLP_SERVICE_URL")
	if nlpServiceURL == "" {
		return nil, fmt.Errorf("NLP_SERVICE_URL environment variable is required")
	}
	return &Config{
		ServerPort:         serverPort,
		DBSource:           dbSource,
		GoogleClientID:     googleClientID,
		GoogleClientSecret: googleClientSecret,
		GoogleRedirectURL:  googleRedirectURL,
		JWTSecretKey:       jwtSecretKey,
		FrontendURL:        frontendURL,
		NLPServiceURL:      nlpServiceURL,
	}, nil
}
