package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv" // For loading.env files [24, 25]
	"slices"
)

type Config struct {
	IssuerURL string
	Audience  string
	JwksURL   string
	Port      string
}

func LoadConfig() Config {
	issuerURL := os.Getenv("ISSUER_URL")
	if issuerURL == "" {
		log.Fatal("FATAL: ISSUER_URL environment variable not set")
	}
	audience := os.Getenv("AUDIENCE")
	if audience == "" {
		log.Fatal("FATAL: AUDIENCE environment variable not set")
	}

	jwksURL := os.Getenv("JWKS_URL")
	if jwksURL == "" {
		if strings.HasSuffix(issuerURL, "/") {
			jwksURL = issuerURL + "jwks"
		} else {
			jwksURL = issuerURL + "/jwks"
		}
		log.Printf("JWKS_URL not set, deriving as: %s. Ensure this is correct for your Logto setup.", jwksURL)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	return Config{
		IssuerURL: issuerURL,
		Audience:  audience,
		JwksURL:   jwksURL,
		Port:      port,
	}
}

type contextKey string

const claimsContextKey contextKey = "userClaims"

type CustomClaims struct {
	Scope string `json:"scope,omitempty"`
	jwt.RegisteredClaims
}

func jwtAuthMiddleware(next http.Handler, jwks jwt.Keyfunc, appConfig Config) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			log.Println("Missing Authorization header")
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			log.Println("Malformed Authorization header: Missing 'Bearer ' prefix")
			http.Error(w, "Malformed Authorization header", http.StatusUnauthorized)
			return
		}

		claims := &CustomClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, jwks,
			jwt.WithIssuer(appConfig.IssuerURL),
			jwt.WithAudience(appConfig.Audience),
			jwt.WithValidMethods([]string{"RS256", "ES384"}),
			jwt.WithLeeway(1*time.Minute),
		)

		if err != nil {
			log.Printf("Token validation error: %v. Token: %s", err, tokenString)
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		if !token.Valid {
			log.Println("Token marked as invalid after parsing")
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		log.Printf("Token validated successfully for subject: %s", claims.Subject)
		ctx := context.WithValue(r.Context(), claimsContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func requireScopeMiddleware(requiredScopes []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Retrieve claims from context (set by jwtAuthMiddleware)
			claims, ok := r.Context().Value(claimsContextKey).(*CustomClaims)
			if !ok || claims == nil {
				log.Println("ERROR: Claims not found in context for scope check. Ensure jwtAuthMiddleware runs first.")
				// This indicates a programming error (middleware order) or unexpected state.
				http.Error(w, "User claims not found in context", http.StatusInternalServerError)
				return
			}

			// Check if the token's scope claim contains the required scope.
			// Assumes scopes in the token's "scope" claim are space-separated.
			tokenScopes := strings.Fields(claims.Scope) // Example: "read:data write:data" -> ["read:data", "write:data"]

			hasScope := false
			for _, v := range requiredScopes {
				if slices.Contains(tokenScopes, v) {
					hasScope = true
				}
			}

			if !hasScope {
				log.Printf("WARN: Access denied for subject '%s' to resource requiring scope '%s'. User scopes: '%s'", claims.Subject, requiredScopes, claims.Scope)
				http.Error(w, fmt.Sprintf("Forbidden: insufficient scope. Requires '%s'", requiredScopes), http.StatusForbidden)
				return
			}

			log.Printf("INFO: Scope check passed for subject '%s': has required scope '%s'", claims.Subject, requiredScopes)
			next.ServeHTTP(w, r) // Scope is present, proceed to the next handler
		})
	}
}

var appConfig Config

func main() {
	err := godotenv.Load() // [24, 25]
	if err != nil {
		log.Println("INFO: No.env file found or error loading it, relying on OS environment variables.")
	} else {
		log.Println("INFO: Successfully loaded.env file")
	}

	appConfig = LoadConfig() // Load configuration (details in config.go)

	jwks, err := keyfunc.NewDefault([]string{appConfig.JwksURL})
	if err != nil {
		log.Fatalf("Failed to create JWKS from URL %s: %v", appConfig.JwksURL, err)
	}
	log.Printf("Successfully loaded JWKS from %s", appConfig.JwksURL)

	r := chi.NewRouter()

	// A good base middleware stack
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger) // Chi's built-in logger [26, 27]
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
	})

	r.Group(func(r chi.Router) {
		r.Use(func(next http.Handler) http.Handler {
			return jwtAuthMiddleware(next, jwks.Keyfunc, appConfig)
		})
		r.With(
			requireScopeMiddleware([]string{"read:generic_data"})).
			Get("/api/data", func(w http.ResponseWriter, r *http.Request) {

				claims := r.Context().Value(claimsContextKey).(*CustomClaims) // Safe to assert type here due to middleware

				responseData := map[string]any{
					"message":   "You have access to generic data!",
					"subject":   claims.Subject,
					"scopes":    claims.Scope,
					"expiresAt": claims.ExpiresAt.Time.Format(time.RFC3339),
				}
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				if err := json.NewEncoder(w).Encode(responseData); err != nil {
					log.Printf("ERROR: Could not encode /api/data response: %v", err)
				}
			})
	})

	fmt.Printf("Server starting on port %s\n", appConfig.Port)
	fmt.Printf("Logto Issuer URL: %s\n", appConfig.IssuerURL)
	fmt.Printf("Logto Audience: %s\n", appConfig.Audience)
	fmt.Printf("Logto JWKS URL: %s\n", appConfig.JwksURL)

	if err := http.ListenAndServe(":"+appConfig.Port, r); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
