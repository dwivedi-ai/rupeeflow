package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTMaker struct {
	secretKey string
}
type Payload struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

func NewJWTMaker(secretKey string) (*JWTMaker, error) {
	if len(secretKey) < 32 {
		return nil, fmt.Errorf("invalid key size: must be at least 32 characters")
	}
	return &JWTMaker{secretKey}, nil
}
func (maker *JWTMaker) CreateToken(userID uuid.UUID, duration time.Duration) (string, error) {
	payload := &Payload{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)
	return token.SignedString([]byte(maker.secretKey))
}
func (maker *JWTMaker) VerifyToken(tokenString string) (*Payload, error) {
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(maker.secretKey), nil
	}
	token, err := jwt.ParseWithClaims(tokenString, &Payload{}, keyFunc)
	if err != nil {
		return nil, err
	}
	payload, ok := token.Claims.(*Payload)
	if !ok {
		return nil, fmt.Errorf("invalid token claims")
	}
	return payload, nil
}
