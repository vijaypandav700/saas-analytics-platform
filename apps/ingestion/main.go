package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	rdb        *redis.Client
	ctx        = context.Background()
	eventsKey  = getenv("EVENTS_QUEUE", "events:ingest")
)

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseRedisAddr(url string) string {
	// strips "redis://" prefix if present, go-redis wants host:port only
	addr := url
	if len(addr) > 8 && addr[:8] == "redis://" {
		addr = addr[8:]
	}
	return addr
}

func resolveApiKey(key string) (string, bool) {
	body, _ := json.Marshal(map[string]string{"key": key})
	resp, err := http.Post("http://localhost:4000/internal/api-keys/resolve", "application/json", bytes.NewReader(body))
	if err != nil {
		log.Println("resolve call failed:", err)
		return "", false
	}
	defer resp.Body.Close()

	var result struct {
		Valid bool   `json:"valid"`
		OrgID string `json:"orgId"`
	}
	json.NewDecoder(resp.Body).Decode(&result)
	return result.OrgID, result.Valid
}

func main() {
	rdb = redis.NewClient(&redis.Options{Addr: parseRedisAddr(getenv("REDIS_URL", "redis://localhost:6379"))})

	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	mux.HandleFunc("POST /v1/events", handleEvents)

	port := getenv("INGESTION_PORT", "8080")
	log.Printf("ingestion service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, mux))
}

func handleEvents(w http.ResponseWriter, r *http.Request) {
	apiKey := r.Header.Get("Authorization")
	if apiKey == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "missing api key"})
		return
	}

	orgId, valid := resolveApiKey(apiKey)
	if !valid {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid api key"})
		return
	}

	// rate limit: max 100 requests per key per 10 seconds
	rlKey := "ratelimit:" + apiKey
	count, err := rdb.Incr(ctx, rlKey).Result()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if count == 1 {
		rdb.Expire(ctx, rlKey, 10*time.Second)
	}
	if count > 100 {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
		return
	}

	body, _ := io.ReadAll(r.Body)
	_, err = rdb.XAdd(ctx, &redis.XAddArgs{
		Stream: eventsKey,
		Values: map[string]interface{}{"orgId": orgId, "apiKey": apiKey, "payload": string(body)},
	}).Result()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}