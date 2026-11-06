# Reanimate

**Give open-source projects a second life.**

Reanimate is an AI-assisted GitHub repository analysis tool. It collects publicly available repository information, turns it into structured evidence, evaluates repository health using deterministic indicators, and generates a prioritized roadmap for improvement. When enabled, an optional local Ollama model adds evidence-linked AI insights.

> Reanimate is an advisory tool. Its indicators are heuristic signals, not an objective measure of a project's quality or future.

## What it does

- Accepts a public GitHub repository URL.
- Retrieves repository metadata and available project activity through the GitHub API.
- Collects sources such as README content, commits, releases, issues, pull requests, contributors, and community-profile information where available.
- Converts collected data into structured evidence.
- Calculates repository-health indicators using deterministic analysis.
- Produces a prioritized revival roadmap.
- Optionally uses a locally hosted Ollama model to summarize evidence, identify potential maintenance bottlenecks, and surface contributor opportunities.
- Reports analysis limitations when information is missing or a service is unavailable.

## How the analysis works

```text
GitHub repository URL
          |
          v
   URL validation
          |
          v
  GitHub data collection
          |
          v
   Evidence extraction
          |
          v
Deterministic health analysis
          |
          +----------------------+
          |                      |
          v                      v
 Revival roadmap          Optional Ollama
                                 |
                                 v
                         Evidence-linked insights
          |                      |
          +----------+-----------+
                     |
                     v
              Analysis report
                     |
                     v
             Reanimate dashboard
```

The deterministic analysis and roadmap do not depend on Ollama. AI is an optional interpretation layer; it should not replace observed GitHub data or invent repository statistics.

## Repository structure

```text
Reanimate/
├── backend/
│   ├── app/
│   │   ├── ai_service.py
│   │   ├── config.py
│   │   ├── evidence.py
│   │   ├── github_client.py
│   │   ├── health_analyzer.py
│   │   ├── main.py
│   │   ├── report_generator.py
│   │   ├── routes.py
│   │   └── schemas.py
│   ├── tests/
│   ├── .env.example
│   ├── pytest.ini
│   ├── requirements.txt
│   └── README.md
└── frontend/
    ├── app/
    ├── components/
    ├── lib/
    ├── .env.example
    ├── package.json
    └── README.md
```

The backend separates GitHub access, evidence extraction, deterministic health analysis, AI integration, response schemas, and API routing. The frontend contains the Next.js application, report components, and API/client utilities.

## Technology

| Area | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, Pydantic, HTTPX |
| Repository data | GitHub REST API |
| Optional AI | Ollama with a configurable local model (default: `qwen3:4b`) |
| Testing | pytest, mocked HTTP/API responses |

## Requirements

- Python 3.11 or newer
- Node.js and npm (use a current supported LTS release)
- Git
- Internet access for GitHub API requests
- Ollama only if local AI insights are required

## Run locally

Run the backend and frontend in separate terminals.

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload
```

The API runs at:

- API: `http://localhost:8000`
- Interactive API documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend

In a second terminal:

```powershell
cd frontend
npm install
```

Configure the frontend API URL using the variable documented in `frontend/.env.example`, then start the development server:

```powershell
npm run dev
```

Open the local URL printed by Next.js (typically `http://localhost:3000`).

> Keep the frontend API URL pointed at the backend running on `http://localhost:8000`. The backend's `CORS_ORIGINS` setting must include the frontend origin.

## Optional: enable local AI insights

Reanimate's deterministic analysis works without a local model. To enable AI insights:

1. Install [Ollama](https://ollama.com/).
2. Start the Ollama service.
3. Pull the configured model:

```powershell
ollama pull qwen3:4b
```

4. In `backend/.env`, set:

```dotenv
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_TIMEOUT=90
```

5. Restart the backend.

The model is configurable. Choose a model that fits the available hardware and benchmark response quality and latency before using it in a demo or deployment. If Ollama is disabled or unavailable, deterministic analysis and the revival roadmap remain available; the API reports why AI insights were omitted.

## API

### `GET /health`

Checks that the backend service is responding.

### `POST /api/analyze`

Analyzes a public GitHub repository.

Request:

```json
{
  "url": "https://github.com/owner/repository"
}
```

The response includes repository information, structured evidence, health indicators, a revival roadmap, methodology and limitations. It may also include `ai_insights` when optional AI analysis is enabled and succeeds.

For the authoritative request and response schemas, run the backend and open `http://localhost:8000/docs`.

## Configuration

Backend settings are documented in `backend/.env.example`.

| Variable | Default | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Unset | Optional GitHub token for a higher API rate limit |
| `GITHUB_TIMEOUT` | `10` | GitHub request timeout in seconds |
| `MAX_README_CHARS` | `20000` | Maximum README characters collected |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed frontend origins |
| `OLLAMA_ENABLED` | `false` | Enables optional local AI insights |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama service URL |
| `OLLAMA_MODEL` | `qwen3:4b` | Ollama model tag |
| `OLLAMA_TIMEOUT` | `90` | AI request timeout in seconds |

Never commit `.env` files, access tokens, API keys, or other secrets. Use `.env.example` files to document configuration without including credentials.

## Tests

Run backend tests from the backend directory:

```powershell
cd backend
pip install -r requirements.txt
pytest -q
```

The test suite uses mocked GitHub/Ollama HTTP interactions where configured; a real GitHub token or running Ollama model should not be required for the mocked tests.

Run frontend checks using the scripts available in `frontend/package.json`. For example, inspect the available scripts with:

```powershell
cd frontend
npm run
```

## Security and responsible use

- The current workflow is designed for public GitHub repositories.
- Do not execute repository code as part of analysis.
- Keep GitHub tokens and other credentials in local environment files.
- Treat repository content, issue text, README content, and model output as untrusted input.
- Use request timeouts and respect GitHub API rate limits.
- AI-generated interpretations are suggestions, not verified facts.
- Check evidence and limitations before acting on a recommendation.

## Current scope and limitations

- Analysis depends on data exposed by GitHub's public API and may be incomplete.
- Some repositories do not expose every activity signal or community metric.
- Health indicators are heuristic and should be interpreted in the context of repository age, project type, and available evidence.
- A quiet repository is not necessarily abandoned or unhealthy.
- Optional AI insight quality and latency depend on the selected local model and available hardware.
- AI insights may be omitted when Ollama is disabled, unreachable, times out, or returns invalid output.
- The project should be treated as an evolving MVP; verify the current implementation and tests before relying on results.

## Roadmap

- Improve the transparency and calibration of repository-health indicators.
- Expand evidence coverage while preserving source attribution.
- Improve AI insight quality and evidence traceability.
- Refine the revival roadmap around repository-specific contributor opportunities.
- Strengthen end-to-end testing and failure handling.
- Continue improving the dashboard and analysis experience.

## Contributing

Contributions, bug reports, and focused feature proposals are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make a focused change.
4. Add or update tests where appropriate.
5. Run the relevant checks.
6. Open a pull request describing the problem, implementation, and verification.

Please avoid committing secrets, local environment files, caches, build output, or generated logs.

## License

No license has been declared in this repository yet. Until a license is added, do not assume that the code is available for unrestricted reuse. Add a `LICENSE` file after selecting the project's intended license.
