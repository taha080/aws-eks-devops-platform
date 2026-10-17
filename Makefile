.DEFAULT_GOAL := help

PYTHON ?= python3
PIP ?= $(PYTHON) -m pip

.PHONY: help install test lint fmt security docker-build compose-up compose-down \
	tf-fmt tf-validate helm-lint helm-template kind-deploy ci

help:
	@printf '%s\n' \
		'install         Install the API and local dev tools' \
		'test            Run the pytest suite' \
		'lint            Run ruff' \
		'fmt             Format Python with ruff' \
		'security        Run bandit' \
		'docker-build    Build the API image' \
		'compose-up      Start the API with docker compose' \
		'compose-down    Stop docker compose' \
		'tf-fmt          terraform fmt -check -recursive' \
		'tf-validate     terraform fmt -check and validate (no AWS credentials)' \
		'helm-lint       helm lint and helm template' \
		'kind-deploy     Build, load, and install the chart on kind' \
		'ci              Run the same checks GitHub Actions runs locally'

install:
	$(PIP) install -e "./app[dev]"

test:
	$(PYTHON) -m pytest app/tests

lint:
	$(PYTHON) -m ruff check app
	$(PYTHON) -m ruff format --check app

fmt:
	$(PYTHON) -m ruff format app
	$(PYTHON) -m ruff check --fix app

security:
	$(PYTHON) -m bandit -r app/src -ll -q

docker-build:
	docker build -t linkforge:local app

compose-up:
	docker compose up --build

compose-down:
	docker compose down

tf-fmt:
	terraform fmt -check -recursive infra

tf-validate:
	bash scripts/terraform-validate.sh

helm-lint: helm-template

helm-template:
	bash scripts/helm-check.sh

kind-deploy:
	bash scripts/kind-deploy.sh

ci: lint test security tf-validate helm-template
	@if command -v docker >/dev/null 2>&1; then $(MAKE) docker-build; else echo 'docker not installed; skipping image build'; fi
