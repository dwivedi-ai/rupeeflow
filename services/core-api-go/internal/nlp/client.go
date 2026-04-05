package nlp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"rupeeflow/internal/storage/postgres"
	"time"
)

type Client struct {
	httpClient *http.Client
	baseURL    string
}
type ParseRequest struct {
	Text string `json:"text"`
}
type ParseResponse struct {
	Amount      float64                  `json:"amount"`
	Type        postgres.TransactionType `json:"type"`
	Description string                   `json:"description"`
	Category    string                   `json:"category"`
}

func NewClient(baseURL string) *Client {
	return &Client{
		httpClient: &http.Client{Timeout: 5 * time.Second},
		baseURL:    baseURL,
	}
}
func (c *Client) ParseTransaction(ctx context.Context, text string) (*ParseResponse, error) {
	reqBody := ParseRequest{Text: text}
	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, "POST", c.baseURL+"/parse", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call nlp service: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nlp service returned non-200 status: %d", resp.StatusCode)
	}
	var parseResp ParseResponse
	if err := json.NewDecoder(resp.Body).Decode(&parseResp); err != nil {
		return nil, fmt.Errorf("failed to decode nlp service response: %w", err)
	}
	return &parseResp, nil
}
