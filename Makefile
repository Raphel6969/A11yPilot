.PHONY: install test build run docker-build

install:
	npm ci
	npm run playwright:install

test:
	npm run test:all

build:
	npm run build

run:
	npm run preview -- --host 0.0.0.0 --port $${PORT:-4173}

docker-build:
	docker build -t a11ypilot:local .
