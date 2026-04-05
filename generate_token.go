package main

import (
	"fmt"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Payload struct {
	UserID uuid.UUID `json:"user_id"`
	jwt.RegisteredClaims
}

func main() {
	// Use the same secret key as in .env
	secretKey := "oibXJVseKZXkL6ipXQ2xCYZ3V7ti9SiFDcUwtBBAqtg="

	// Use the test user ID from our test data
	userID := uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")

	payload := &Payload{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)
	tokenString, err := token.SignedString([]byte(secretKey))
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("JWT Token for testing:")
	fmt.Println(tokenString)
}
