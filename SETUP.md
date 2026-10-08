# 🛠️ Setup & Operations Guide

This repository contains a **self-generating GitHub Profile README** powered by GitHub Actions, Node.js, and locally rendered SVG telemetry dashboards.

---

## 🚀 Quick Start (Running Locally)

### 1. Prerequisites
- **Node.js**: v18+ or later (v20+ recommended).
- **Authentication (Optional for local testing)**:
  - If you have GitHub CLI installed and authenticated (`gh auth login`), the generator will automatically use your CLI session token!
  - Alternatively, set an environment variable:
    ```bash
    # Windows PowerShell
    $env:GITHUB_TOKEN="your_personal_access_token"

    # macOS / Linux
    export GITHUB_TOKEN="your_personal_access_token"
    ```
  - Unauthenticated requests are also supported for public repositories (subject to standard GitHub rate limits).

### 2. Generate Profile
Run the generator locally with:
```bash
npm run generate
```
Or run the full automated verification test suite:
```bash
npm run test
```

---

## ⚙️ Configuration (`config.json`)

All customizations can be made inside `config.json` without modifying any script code:

```json
{
  "username": "shivaraj4791",
  "displayName": "Shiva Raj",
  "role": "Software & AI/ML Engineer",
  "tagline": "Building Autonomous Agents, Scalable Backends & AI Systems",
  "bio": "CSE (AI & ML) student passionate about autonomous agent workflows...",
  "location": "India",
  "status": {
    "currentlyWorkingOn": {
      "title": "VENDRA",
      "description": "Autonomous buyer agent with real-time merchant workflows",
      "url": "https://github.com/shivaraj4791/VENDRA"
    },
    "learning": "Autonomous Multi-Agent Architectures & High-Performance Backends",
    "collaboratingOn": "Open-Source AI & Developer Tooling"
  },
  "featuredRepos": [
    "VENDRA",
    "Shiva-Raj-Portfolio",
    "ML-challenge",
    "Weather-Forecast-Application"
  ],
  "social": {
    "github": "https://github.com/shivaraj4791",
    "portfolio": "https://shivaraj4791.github.io/Shiva-Raj-Portfolio",
    "email": "shivaraj4791@gmail.com"
  },
  "skills": { ... },
  "sections": {
    "headerBanner": true,
    "statsCard": true,
    "streakCard": true,
    "languagesCard": true,
    "featuredRepos": true,
    "recentActivity": true
  }
}
```

---

## 📌 How to Add or Remove Featured Repositories

Inside `config.json`, simply update the `featuredRepos` array:
```json
"featuredRepos": [
  "my-new-repo",
  "another-cool-project"
]
```
If you leave this array empty or have fewer than 4 repositories listed, the generator will **intelligently auto-select** your top repositories based on:
1. Originality (non-forks ranked higher)
2. Star count
3. Fork count
4. Recent commit activity
5. Meaningful descriptions

---

## 🤖 GitHub Actions Setup & Secrets

### 1. Repository Creation
To make this your profile README on GitHub:
1. Create a repository on GitHub with the exact same name as your GitHub username:
   `https://github.com/shivaraj4791/shivaraj4791`
2. Push this repository's code to the `main` branch.

### 2. GitHub Actions Permissions
By default, GitHub Actions includes a built-in token: `${{ secrets.GITHUB_TOKEN }}`.
To allow the action to commit and push updated telemetry:
1. Go to your repository on GitHub.
2. Navigate to **Settings** &rarr; **Actions** &rarr; **General**.
3. Scroll down to **Workflow permissions**.
4. Select **Read and write permissions**.
5. Click **Save**.

> [!NOTE]
> No personal access token (PAT) is required. The default `${{ secrets.GITHUB_TOKEN }}` provides all permissions needed to query public telemetry and commit updated README/SVG assets.

### 3. How to Trigger Manually
1. Go to the **Actions** tab in your GitHub repository.
2. Select the **Auto-Update Profile Telemetry** workflow on the left sidebar.
3. Click the **Run workflow** dropdown button on the right.
4. Select the `main` branch and click **Run workflow**.

---

## 🔄 How the Automatic Generation Works

```
┌───────────────────────┐
│ Scheduled Cron / Push │  (04:00 UTC daily or manual trigger)
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│  github-client.js     │  Queries GitHub GraphQL & REST APIs
└──────────┬────────────┘  (Repositories, Contributions, Streaks, Languages)
           │
           ▼
┌───────────────────────┐
│ stats-calculator.js   │  Computes verified metrics, streaks, language bytes
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│   svg-generator.js    │  Renders standalone dark-mode SVGs locally into assets/
└──────────┬────────────┘  (header.svg, stats.svg, streak.svg, languages.svg, activity.svg)
           │
           ▼
┌───────────────────────┐
│  readme-updater.js    │  Replaces content strictly between designated markers:
└──────────┬────────────┘  <!-- STATS:START --> ... <!-- STATS:END -->
           │
           ▼
┌───────────────────────┐
│  Git Diff & Push      │  Checks `git status --porcelain`. Commits & pushes ONLY if diff exists.
└───────────────────────┘
```

---

## 🛡️ Error Handling & Reliability

- **Zero External Image Hosts**: Never relies on third-party dynamic image hosts that crash, rate-limit, or get blocked by GitHub's camo proxy.
- **Marker Safety**: The README updater validates marker boundaries before making any replacements. If markers are missing, it halts safely rather than corrupting your README.
- **Deterministic Runs**: Output is pinned to UTC date windows. Running the script multiple times without changed GitHub data produces **zero git diffs**, preventing useless commits.
- **Rate-Limit Resilience**: The client checks `x-ratelimit-remaining` headers and cleanly falls back to REST endpoints if GraphQL encounters token restrictions.
