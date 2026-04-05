package api

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"rupeeflow/internal/auth"
	"rupeeflow/internal/config"
	"rupeeflow/internal/nlp"
	"rupeeflow/internal/storage/postgres"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type APIHandler struct {
	store     *postgres.Store
	gOauth    *auth.GoogleOAuthConfig
	token     *auth.JWTMaker
	cfg       *config.Config
	nlpClient *nlp.Client
}

// Helper function to convert float64 to pgtype.Numeric
func floatToNumeric(f float64) pgtype.Numeric {
	bigInt := big.NewInt(int64(f * 10000)) // Scale by 10000 to handle 4 decimal places
	return pgtype.Numeric{
		Int:              bigInt,
		Exp:              -4, // 4 decimal places
		NaN:              false,
		InfinityModifier: 0,
		Valid:            true,
	}
}

func NewAPIHandler(store *postgres.Store, gOauth *auth.GoogleOAuthConfig, token *auth.JWTMaker, cfg *config.Config) *APIHandler {
	nlpClient := nlp.NewClient(cfg.NLPServiceURL)
	return &APIHandler{
		store:     store,
		gOauth:    gOauth,
		token:     token,
		cfg:       cfg,
		nlpClient: nlpClient,
	}
}
func (h *APIHandler) HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	state := auth.GenerateStateOauthCookie()
	cookie := http.Cookie{Name: "oauthstate", Value: state, Expires: time.Now().Add(20 * time.Minute), HttpOnly: true}
	http.SetCookie(w, &cookie)
	url := h.gOauth.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}
func (h *APIHandler) HandleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	oauthState, err := r.Cookie("oauthstate")
	if err != nil {
		http.Error(w, "missing oauth state cookie", http.StatusBadRequest)
		return
	}

	if r.FormValue("state") != oauthState.Value {
		http.Error(w, "invalid oauth google state", http.StatusBadRequest)
		return
	}
	data, err := h.getUserDataFromGoogle(r.FormValue("code"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	var userInfo struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.Unmarshal(data, &userInfo); err != nil {
		http.Error(w, "failed to unmarshal user info", http.StatusInternalServerError)
		return
	}

	if userInfo.ID == "" || userInfo.Email == "" {
		http.Error(w, "invalid user info from google", http.StatusBadGateway)
		return
	}

	user, err := h.store.GetUserByGoogleID(context.Background(), pgtype.Text{String: userInfo.ID, Valid: true})
	if err != nil {
		if err == pgx.ErrNoRows {
			// Fallback to email to support first-time Google sign-in on an existing manual account.
			user, err = h.store.GetUserByEmail(context.Background(), userInfo.Email)
			if err != nil {
				if err == pgx.ErrNoRows {
					arg := postgres.CreateUserParams{
						GoogleID:  pgtype.Text{String: userInfo.ID, Valid: true},
						Email:     userInfo.Email,
						FullName:  userInfo.Name,
						AvatarUrl: pgtype.Text{String: userInfo.Picture, Valid: userInfo.Picture != ""},
					}
					user, err = h.store.CreateUser(context.Background(), arg)
					if err != nil {
						log.Printf("google callback: failed to create user for email=%s: %v", userInfo.Email, err)
						http.Error(w, "failed to create user", http.StatusInternalServerError)
						return
					}
				} else {
					log.Printf("google callback: failed to get user by email=%s: %v", userInfo.Email, err)
					http.Error(w, "failed to get user", http.StatusInternalServerError)
					return
				}
			}
		} else {
			log.Printf("google callback: failed to get user by google_id=%s: %v", userInfo.ID, err)
			http.Error(w, "failed to get user", http.StatusInternalServerError)
			return
		}
	}
	// Convert pgtype.UUID to uuid.UUID
	userUUID := uuid.UUID(user.ID.Bytes)
	token, err := h.token.CreateToken(userUUID, 24*time.Hour)
	if err != nil {
		http.Error(w, "failed to create token", http.StatusInternalServerError)
		return
	}
	redirectURL := h.cfg.FrontendURL + "/auth/callback?token=" + token
	http.Redirect(w, r, redirectURL, http.StatusTemporaryRedirect)
}
func (h *APIHandler) getUserDataFromGoogle(code string) ([]byte, error) {
	if code == "" {
		return nil, fmt.Errorf("missing oauth code")
	}

	token, err := h.gOauth.Exchange(context.Background(), code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange oauth code: %w", err)
	}

	resp, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + token.AccessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch google user info: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read google user info response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("google user info request failed with status %d", resp.StatusCode)
	}

	return body, nil
}

// HandleManualRegister handles manual user registration
func (h *APIHandler) HandleManualRegister(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		http.Error(w, "email, password, and full_name are required", http.StatusBadRequest)
		return
	}

	if len(req.Password) < 6 {
		http.Error(w, "password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Check if user already exists
	_, err := h.store.GetUserByEmail(context.Background(), req.Email)
	if err == nil {
		http.Error(w, "user with this email already exists", http.StatusConflict)
		return
	}
	if err != pgx.ErrNoRows {
		http.Error(w, "failed to check user existence", http.StatusInternalServerError)
		return
	}

	// Hash password
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "failed to process password", http.StatusInternalServerError)
		return
	}

	// Create user
	arg := postgres.CreateManualUserParams{
		Email:        req.Email,
		FullName:     req.FullName,
		PasswordHash: pgtype.Text{String: hashedPassword, Valid: true},
	}

	user, err := h.store.CreateManualUser(context.Background(), arg)
	if err != nil {
		http.Error(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	// Generate JWT token
	userUUID := uuid.UUID(user.ID.Bytes)
	token, err := h.token.CreateToken(userUUID, 24*time.Hour)
	if err != nil {
		http.Error(w, "failed to create token", http.StatusInternalServerError)
		return
	}

	// Return response
	response := map[string]interface{}{
		"message": "User registered successfully",
		"token":   token,
		"user": map[string]interface{}{
			"id":            user.ID,
			"email":         user.Email,
			"full_name":     user.FullName,
			"auth_provider": "email",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleManualLogin handles manual user login
func (h *APIHandler) HandleManualLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" {
		http.Error(w, "email and password are required", http.StatusBadRequest)
		return
	}

	// Get user by email
	user, err := h.store.GetUserByEmail(context.Background(), req.Email)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "invalid email or password", http.StatusUnauthorized)
			return
		}
		http.Error(w, "failed to authenticate user", http.StatusInternalServerError)
		return
	}

	// Check if user has password hash (not Google OAuth user)
	if !user.PasswordHash.Valid {
		http.Error(w, "this account uses Google sign-in", http.StatusBadRequest)
		return
	}

	// Verify password
	if err := auth.CheckPassword(req.Password, user.PasswordHash.String); err != nil {
		http.Error(w, "invalid email or password", http.StatusUnauthorized)
		return
	}

	// Generate JWT token
	userUUID := uuid.UUID(user.ID.Bytes)
	token, err := h.token.CreateToken(userUUID, 24*time.Hour)
	if err != nil {
		http.Error(w, "failed to create token", http.StatusInternalServerError)
		return
	}

	// Return response
	response := map[string]interface{}{
		"message": "Login successful",
		"token":   token,
		"user": map[string]interface{}{
			"id":        user.ID,
			"email":     user.Email,
			"full_name": user.FullName,
			"auth_provider": func() string {
				if user.GoogleID.Valid {
					return "google"
				}
				return "email"
			}(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Placeholder for a protected route handler
func (h *APIHandler) HandleGetMe(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)

	user, err := h.store.GetUserByID(context.Background(), pgtype.UUID{Bytes: payload.UserID, Valid: true})
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "user not found for token", http.StatusUnauthorized)
			return
		}
		log.Printf("get me: failed to get user id=%s: %v", payload.UserID.String(), err)
		http.Error(w, "failed to get user", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"id":        user.ID,
		"email":     user.Email,
		"full_name": user.FullName,
		"auth_provider": func() string {
			if user.GoogleID.Valid {
				return "google"
			}
			return "email"
		}(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleUpdateProfile handles updating user profile
func (h *APIHandler) HandleUpdateProfile(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)

	var req struct {
		FullName string `json:"full_name"`
		Email    string `json:"email"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate input
	if req.FullName == "" {
		http.Error(w, "full_name is required", http.StatusBadRequest)
		return
	}

	arg := postgres.UpdateUserProfileParams{
		ID:       pgtype.UUID{Bytes: payload.UserID, Valid: true},
		FullName: req.FullName,
		Email:    req.Email,
	}

	user, err := h.store.UpdateUserProfile(context.Background(), arg)
	if err != nil {
		http.Error(w, "failed to update profile", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"message":   "Profile updated successfully",
		"id":        user.ID,
		"email":     user.Email,
		"full_name": user.FullName,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleDeleteAccount handles deleting user account and all associated data
func (h *APIHandler) HandleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)

	// Delete the user account (this will cascade delete all transactions due to foreign key constraints)
	err := h.store.DeleteUser(context.Background(), pgtype.UUID{Bytes: payload.UserID, Valid: true})
	if err != nil {
		log.Printf("Failed to delete user account: %v", err)
		http.Error(w, "failed to delete account", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleChangePassword handles changing user password
func (h *APIHandler) HandleChangePassword(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)

	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		http.Error(w, "current_password and new_password are required", http.StatusBadRequest)
		return
	}

	if len(req.NewPassword) < 6 {
		http.Error(w, "new password must be at least 6 characters", http.StatusBadRequest)
		return
	}

	// Get current user to verify current password
	user, err := h.store.GetUserByID(context.Background(), pgtype.UUID{Bytes: payload.UserID, Valid: true})
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// Check if user has password hash (not Google OAuth user)
	if !user.PasswordHash.Valid {
		http.Error(w, "password change not available for Google OAuth users", http.StatusBadRequest)
		return
	}

	// Verify current password
	if err := auth.CheckPassword(req.CurrentPassword, user.PasswordHash.String); err != nil {
		http.Error(w, "current password is incorrect", http.StatusUnauthorized)
		return
	}

	// Hash new password
	hashedPassword, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		http.Error(w, "failed to process new password", http.StatusInternalServerError)
		return
	}

	// Update password
	arg := postgres.UpdateUserPasswordParams{
		ID:           pgtype.UUID{Bytes: payload.UserID, Valid: true},
		PasswordHash: pgtype.Text{String: hashedPassword, Valid: true},
	}

	_, err = h.store.UpdateUserPassword(context.Background(), arg)
	if err != nil {
		http.Error(w, "failed to update password", http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"message": "Password changed successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// CreateTransaction handles creating a new transaction
func (h *APIHandler) HandleCreateTransaction(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Amount          float64 `json:"amount"`
		Description     string  `json:"description"`
		Type            string  `json:"type"`
		TransactionDate string  `json:"transaction_date"`
		Category        string  `json:"category,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	payload := r.Context().Value(authPayloadKey).(*auth.Payload)

	// Parse date
	date, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		http.Error(w, "invalid date format, use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	// Convert types
	var transactionType postgres.TransactionType
	if req.Type == "INCOME" {
		transactionType = postgres.TransactionTypeINCOME
	} else {
		transactionType = postgres.TransactionTypeEXPENSE
	}

	arg := postgres.CreateTransactionParams{
		UserID:          pgtype.UUID{Bytes: payload.UserID, Valid: true},
		Amount:          floatToNumeric(req.Amount),
		Description:     req.Description,
		Type:            transactionType,
		TransactionDate: pgtype.Date{Time: date, Valid: true},
		Category:        pgtype.Text{String: req.Category, Valid: req.Category != ""},
	}

	transaction, err := h.store.CreateTransaction(context.Background(), arg)
	if err != nil {
		http.Error(w, "failed to create transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transaction)
}

// HandleParseTransaction handles parsing natural language transactions
func (h *APIHandler) HandleParseTransaction(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Text string `json:"text"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	parsed, err := h.nlpClient.ParseTransaction(context.Background(), req.Text)
	if err != nil {
		http.Error(w, "failed to parse transaction", http.StatusInternalServerError)
		return
	}

	// Return only the parsed data without creating a transaction
	// The frontend will handle creating the transaction via the create endpoint
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(parsed)
}

// HandleListTransactions handles listing user transactions
func (h *APIHandler) HandleListTransactions(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)

	limit := int32(20)
	offset := int32(0)

	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = int32(parsed)
		}
	}

	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			offset = int32(parsed)
		}
	}

	arg := postgres.ListTransactionsByUserIDParams{
		UserID: pgtype.UUID{Bytes: payload.UserID, Valid: true},
		Limit:  limit,
		Offset: offset,
	}

	transactions, err := h.store.ListTransactionsByUserID(context.Background(), arg)
	if err != nil {
		http.Error(w, "failed to list transactions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
}

// HandleGetTransaction handles getting a single transaction
func (h *APIHandler) HandleGetTransaction(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)
	transactionID := chi.URLParam(r, "id")

	id, err := uuid.Parse(transactionID)
	if err != nil {
		http.Error(w, "invalid transaction ID", http.StatusBadRequest)
		return
	}

	arg := postgres.GetTransactionByIDParams{
		ID:     pgtype.UUID{Bytes: id, Valid: true},
		UserID: pgtype.UUID{Bytes: payload.UserID, Valid: true},
	}

	transaction, err := h.store.GetTransactionByID(context.Background(), arg)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "transaction not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to get transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transaction)
}

// HandleUpdateTransaction handles updating an existing transaction
func (h *APIHandler) HandleUpdateTransaction(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)
	transactionID := chi.URLParam(r, "id")

	id, err := uuid.Parse(transactionID)
	if err != nil {
		http.Error(w, "invalid transaction ID", http.StatusBadRequest)
		return
	}

	var req struct {
		Amount          float64 `json:"amount"`
		Description     string  `json:"description"`
		Type            string  `json:"type"`
		TransactionDate string  `json:"transaction_date"`
		Category        string  `json:"category,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.TransactionDate)
	if err != nil {
		http.Error(w, "invalid date format, use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	// Convert types
	var transactionType postgres.TransactionType
	if req.Type == "INCOME" {
		transactionType = postgres.TransactionTypeINCOME
	} else {
		transactionType = postgres.TransactionTypeEXPENSE
	}

	arg := postgres.UpdateTransactionParams{
		ID:              pgtype.UUID{Bytes: id, Valid: true},
		Amount:          floatToNumeric(req.Amount),
		Description:     req.Description,
		Type:            transactionType,
		TransactionDate: pgtype.Date{Time: date, Valid: true},
		Category:        pgtype.Text{String: req.Category, Valid: req.Category != ""},
		UserID:          pgtype.UUID{Bytes: payload.UserID, Valid: true},
	}

	transaction, err := h.store.UpdateTransaction(context.Background(), arg)
	if err != nil {
		if err == pgx.ErrNoRows {
			http.Error(w, "transaction not found", http.StatusNotFound)
			return
		}
		http.Error(w, "failed to update transaction", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transaction)
}

// HandleDeleteTransaction handles deleting a transaction
func (h *APIHandler) HandleDeleteTransaction(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)
	transactionID := chi.URLParam(r, "id")

	id, err := uuid.Parse(transactionID)
	if err != nil {
		http.Error(w, "invalid transaction ID", http.StatusBadRequest)
		return
	}

	arg := postgres.DeleteTransactionParams{
		ID:     pgtype.UUID{Bytes: id, Valid: true},
		UserID: pgtype.UUID{Bytes: payload.UserID, Valid: true},
	}

	err = h.store.DeleteTransaction(context.Background(), arg)
	if err != nil {
		http.Error(w, "failed to delete transaction", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleGetDashboardStats handles getting dashboard statistics for a date range
func (h *APIHandler) HandleGetDashboardStats(w http.ResponseWriter, r *http.Request) {
	payload := r.Context().Value(authPayloadKey).(*auth.Payload)

	// Parse query parameters
	startDateStr := r.URL.Query().Get("start_date")
	endDateStr := r.URL.Query().Get("end_date")

	if startDateStr == "" || endDateStr == "" {
		http.Error(w, "start_date and end_date query parameters are required", http.StatusBadRequest)
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		http.Error(w, "invalid start_date format, use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		http.Error(w, "invalid end_date format, use YYYY-MM-DD", http.StatusBadRequest)
		return
	}

	arg := postgres.GetDashboardSummaryParams{
		UserID:            pgtype.UUID{Bytes: payload.UserID, Valid: true},
		TransactionDate:   pgtype.Date{Time: startDate, Valid: true},
		TransactionDate_2: pgtype.Date{Time: endDate, Valid: true},
	}

	summary, err := h.store.GetDashboardSummary(context.Background(), arg)
	if err != nil {
		http.Error(w, "failed to get dashboard summary", http.StatusInternalServerError)
		return
	}

	// Convert pgtype.Numeric to float64
	totalIncome := 0.0
	totalExpense := 0.0

	if summary.TotalIncome.Valid {
		incomeFloat, err := summary.TotalIncome.Float64Value()
		if err == nil {
			totalIncome = incomeFloat.Float64
		}
	}

	if summary.TotalExpenses.Valid {
		expenseFloat, err := summary.TotalExpenses.Float64Value()
		if err == nil {
			totalExpense = expenseFloat.Float64
		}
	}

	response := map[string]interface{}{
		"total_income":  totalIncome,
		"total_expense": totalExpense,
		"net_balance":   totalIncome - totalExpense,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
