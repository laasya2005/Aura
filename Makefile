.PHONY: dev build test clean lint format db-up db-down db-migrate db-seed docker-up docker-down

# Development
dev:
	pnpm dev

build:
	pnpm build

test:
	pnpm test

lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

format:
	pnpm format

format-check:
	pnpm format:check

clean:
	pnpm clean

# Docker
docker-up:
	docker compose up -d

docker-down:
	docker compose down

# Database
db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

db-studio:
	pnpm db:studio

# Full setup
setup: docker-up
	@echo "Waiting for services..."
	@sleep 3
	pnpm install
	pnpm db:migrate
	pnpm db:seed
	@echo "Aura is ready! Run 'make dev' to start."
