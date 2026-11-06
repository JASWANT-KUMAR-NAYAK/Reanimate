# Reanimate Backend

FastAPI service that analyzes public GitHub repositories using deterministic evidence extraction and optional local AI insights through Ollama.

## Requirements

- Python 3.11+
- GitHub public API access
- Ollama only when AI insights are enabled

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`; interactive docs are at `/docs`.

## Enable local AI insights

Install and start [Ollama](https://ollama.com/), then pull the configured model:

```powershell
ollama pull qwen3:4b
```

Set these values in `.env`:

```dotenv
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_TIMEOUT=90
```

Restart FastAPI. `POST /api/analyze` will then include an `ai_insights` object containing a summary, evidence-linked findings, and contributor opportunities. If Ollama is disabled or unavailable, deterministic repository analysis and the revival roadmap still succeed; the response explains why AI insights were omitted.

The model name is configurable. Benchmark it on the target machine before the demo; local model latency and memory use depend on available hardware.

## API

`GET /health`

`POST /api/analyze`

```json
{"url":"https://github.com/owner/repository"}
```

The response contains repository metadata, evidence, health indicators, a deterministic revival roadmap, optional AI insights, methodology, and limitations.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | unset | Optional GitHub API token for higher rate limits |
| `GITHUB_TIMEOUT` | `10` | GitHub request timeout in seconds |
| `MAX_README_CHARS` | `20000` | Maximum README characters collected |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |
| `OLLAMA_ENABLED` | `false` | Enable local AI analysis |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen3:4b` | Local model tag |
| `OLLAMA_TIMEOUT` | `90` | AI request timeout in seconds |

## Tests

```powershell
pip install -r requirements.txt
pytest -q
```

Tests mock GitHub and Ollama responses; no real tokens or running model are needed.
