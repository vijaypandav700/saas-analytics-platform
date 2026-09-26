FROM golang:1.26-alpine AS builder
WORKDIR /app
COPY apps/ingestion/go.mod apps/ingestion/go.sum* ./
RUN go mod download
COPY apps/ingestion/. .
RUN CGO_ENABLED=0 GOOS=linux go build -o ingestion .

FROM alpine:latest AS runner
WORKDIR /app
COPY --from=builder /app/ingestion .
EXPOSE 8080
CMD ["./ingestion"]