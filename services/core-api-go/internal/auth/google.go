package auth

import (
	"crypto/rand"
	"encoding/base64"
	"rupeeflow/internal/config"

	"golang.org/x/oauth2"
	googleoauth "golang.org/x/oauth2/google"
)

type GoogleOAuthConfig struct {
	*oauth2.Config
}

func NewGoogleOAuthConfig(cfg *config.Config) *GoogleOAuthConfig {
	return &GoogleOAuthConfig{
		Config: &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.GoogleRedirectURL,
			Endpoint:     googleoauth.Endpoint,
			Scopes:       []string{"https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"},
		},
	}
}
func GenerateStateOauthCookie() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}
