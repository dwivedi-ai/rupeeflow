package api

import (
	"net/http"
	"rupeeflow/internal/config"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func NewRouter(h *APIHandler, cfg *config.Config) *chi.Mux {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://*", "https://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("RupeeFlow Core API"))
	})
	r.Route("/api", func(r chi.Router) {
		// Authentication routes (public)
		r.Route("/auth", func(r chi.Router) {
			// Google OAuth routes
			r.Route("/google", func(r chi.Router) {
				r.Get("/login", h.HandleGoogleLogin)
				r.Get("/callback", h.HandleGoogleCallback)
			})
			// Manual authentication routes
			r.Post("/register", h.HandleManualRegister)
			r.Post("/login", h.HandleManualLogin)
		})

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(AuthMiddleware(h.token))
			r.Get("/me", h.HandleGetMe)
			r.Put("/me", h.HandleUpdateProfile)
			r.Put("/me/password", h.HandleChangePassword)
			r.Delete("/me", h.HandleDeleteAccount)

			// Transaction routes
			r.Route("/transactions", func(r chi.Router) {
				r.Post("/", h.HandleCreateTransaction)
				r.Get("/", h.HandleListTransactions)
				r.Get("/{id}", h.HandleGetTransaction)
				r.Put("/{id}", h.HandleUpdateTransaction)
				r.Delete("/{id}", h.HandleDeleteTransaction)
				r.Post("/parse", h.HandleParseTransaction)
				r.Get("/stats", h.HandleGetDashboardStats)
			})
		})
	})
	return r
}
