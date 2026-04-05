package api

import (
	"context"
	"net/http"
	"rupeeflow/internal/auth"
	"strings"
)

type contextKey string

const authPayloadKey = contextKey("auth_payload")

func AuthMiddleware(tokenMaker *auth.JWTMaker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if len(authHeader) == 0 {
				http.Error(w, "authorization header is not provided", http.StatusUnauthorized)
				return
			}
			fields := strings.Fields(authHeader)
			if len(fields) < 2 {
				http.Error(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}
			authType := strings.ToLower(fields[0])
			if authType != "bearer" {
				http.Error(w, "unsupported authorization type", http.StatusUnauthorized)
				return
			}
			accessToken := fields[1]
			payload, err := tokenMaker.VerifyToken(accessToken)
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), authPayloadKey, payload)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
