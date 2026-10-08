/**
 * github-client.js
 * Production-ready GitHub API client supporting both GraphQL and REST.
 * Handles token resolution, pagination, rate-limit resilience, and graceful fallbacks.
 */

import { execSync } from 'child_process';

export class GitHubClient {
  constructor(token = null) {
    this.token = token || this._resolveToken();
    this.baseUrl = 'https://api.github.com';
    this.userAgent = 'github-profile-generator/1.0';
  }

  /**
   * Resolves token from environment or local gh CLI.
   */
  _resolveToken() {
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim()) {
      return process.env.GITHUB_TOKEN.trim();
    }
    if (process.env.GH_TOKEN && process.env.GH_TOKEN.trim()) {
      return process.env.GH_TOKEN.trim();
    }
    try {
      const ghToken = execSync('gh auth token', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (ghToken) {
        return ghToken;
      }
    } catch {
      // gh CLI not available or not authenticated
    }
    return null;
  }

  /**
   * Common headers for API requests.
   */
  _getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': this.userAgent,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  /**
   * Executes a GraphQL query against the GitHub API.
   */
  async graphql(query, variables = {}) {
    if (!this.token) {
      throw new Error('GraphQL queries require authentication. Set GITHUB_TOKEN or authenticate with gh CLI.');
    }

    const response = await fetch(`${this.baseUrl}/graphql`, {
      method: 'POST',
      headers: {
        ...this._getHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GraphQL request failed (${response.status} ${response.statusText}): ${errorText}`);
    }

    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
      const msg = result.errors.map(e => e.message).join('; ');
      throw new Error(`GraphQL error: ${msg}`);
    }

    return result.data;
  }

  /**
   * Performs a REST GET request with rate-limit tracking.
   */
  async rest(endpoint) {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this._getHeaders()
    });

    const remaining = response.headers.get('x-ratelimit-remaining');
    if (remaining !== null && parseInt(remaining, 10) === 0) {
      const reset = response.headers.get('x-ratelimit-reset');
      const resetDate = reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : 'unknown';
      console.warn(`[WARN] GitHub API rate limit reached. Resets at ${resetDate}`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`REST request to ${endpoint} failed (${response.status}): ${text}`);
    }

    return await response.json();
  }

  /**
   * Fetches all public repositories for a user with pagination.
   */
  async fetchAllUserRepos(username) {
    const repos = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const url = `/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed&direction=desc&per_page=${perPage}&page=${page}`;
      const chunk = await this.rest(url);
      if (!Array.isArray(chunk) || chunk.length === 0) {
        break;
      }
      repos.push(...chunk.filter(r => !r.private));
      if (chunk.length < perPage) {
        break;
      }
      page++;
      if (page > 10) break; // Safeguard against runaway loops
    }

    return repos;
  }

  /**
   * Fetches complete profile and activity data using GraphQL,
   * with seamless fallback to REST if GraphQL fails.
   */
  async fetchProfileData(username) {
    const graphQuery = `
      query($login: String!) {
        user(login: $login) {
          name
          login
          bio
          avatarUrl
          location
          company
          createdAt
          followers { totalCount }
          following { totalCount }
          starredRepositories { totalCount }
          repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, orderBy: {field: PUSHED_AT, direction: DESC}) {
            totalCount
            nodes {
              name
              description
              stargazerCount
              forkCount
              isFork
              isPrivate
              pushedAt
              url
              primaryLanguage {
                name
                color
              }
              languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                edges {
                  size
                  node {
                    name
                    color
                  }
                }
              }
            }
          }
          contributionsCollection {
            totalCommitContributions
            restrictedContributionsCount
            totalPullRequestContributions
            totalIssueContributions
            totalRepositoryContributions
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  weekday
                }
              }
            }
          }
        }
      }
    `;

    if (this.token) {
      try {
        const data = await this.graphql(graphQuery, { login: username });
        if (data && data.user) {
          return { source: 'graphql', user: data.user };
        }
      } catch (err) {
        console.warn(`[WARN] GraphQL fetch failed (${err.message}). Falling back to REST API.`);
      }
    } else {
      console.warn(`[WARN] No authentication token provided. Using unauthenticated REST API fallback.`);
    }

    // REST fallback
    const user = await this.rest(`/users/${encodeURIComponent(username)}`);
    const repos = await this.fetchAllUserRepos(username);

    return {
      source: 'rest',
      user: {
        name: user.name,
        login: user.login,
        bio: user.bio,
        avatarUrl: user.avatar_url,
        location: user.location,
        company: user.company,
        createdAt: user.created_at,
        followers: { totalCount: user.followers || 0 },
        following: { totalCount: user.following || 0 },
        starredRepositories: { totalCount: 0 },
        repositories: {
          totalCount: user.public_repos || repos.length,
          nodes: repos.map(r => ({
            name: r.name,
            description: r.description,
            stargazerCount: r.stargazers_count || 0,
            forkCount: r.forks_count || 0,
            isFork: r.fork || false,
            isPrivate: r.private || false,
            pushedAt: r.pushed_at,
            url: r.html_url,
            primaryLanguage: r.language ? { name: r.language, color: null } : null,
            languages: { edges: [] }
          }))
        },
        contributionsCollection: null
      }
    };
  }
}
