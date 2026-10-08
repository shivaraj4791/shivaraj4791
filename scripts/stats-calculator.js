/**
 * stats-calculator.js
 * Processes raw GitHub API data and calculates verified developer statistics,
 * streak metrics, language distributions, and repository activity.
 */

const DEFAULT_LANG_COLORS = {
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  Jupyter: '#DA5B0B',
  'Jupyter Notebook': '#DA5B0B',
  Vue: '#41b883',
  React: '#61dafb',
  SQL: '#e38c00'
};

export class StatsCalculator {
  /**
   * Main calculation entrypoint.
   */
  static calculate(profileData, config = {}) {
    const user = profileData.user;
    const repos = user.repositories?.nodes || [];

    const repoStats = this.computeRepoStats(repos);
    const languages = this.computeLanguageStats(repos);
    const streaks = this.computeStreakStats(user.contributionsCollection);
    const recentRepos = this.computeRecentlyActive(repos, 5);

    return {
      username: user.login,
      name: user.name || config.displayName || user.login,
      avatarUrl: user.avatarUrl,
      bio: user.bio || config.bio || '',
      location: user.location || config.location || '',
      followers: user.followers?.totalCount || 0,
      following: user.following?.totalCount || 0,
      publicRepos: repoStats.publicCount,
      totalStars: repoStats.totalStars,
      totalForks: repoStats.totalForks,
      languages,
      streaks,
      recentRepos,
      accountCreatedYear: user.createdAt ? new Date(user.createdAt).getFullYear() : null,
      generatedAtUtc: new Date().toISOString()
    };
  }

  /**
   * Aggregate star, fork, and repository counts.
   */
  static computeRepoStats(repos) {
    let totalStars = 0;
    let totalForks = 0;
    let originalRepos = 0;

    for (const repo of repos) {
      if (repo.isPrivate) continue;
      totalStars += repo.stargazerCount || 0;
      totalForks += repo.forkCount || 0;
      if (!repo.isFork) {
        originalRepos++;
      }
    }

    return {
      publicCount: repos.length,
      originalCount: originalRepos,
      totalStars,
      totalForks
    };
  }

  /**
   * Compute aggregated language distribution from byte counts or primary languages.
   */
  static computeLanguageStats(repos) {
    const langTotals = {};
    const langColors = {};
    let totalBytes = 0;

    // First attempt: byte-level breakdown from GraphQL edges
    let hasByteData = false;
    for (const repo of repos) {
      if (repo.isFork || !repo.languages?.edges) continue;
      for (const edge of repo.languages.edges) {
        if (!edge.node || !edge.size) continue;
        hasByteData = true;
        const name = edge.node.name;
        const size = edge.size;
        langTotals[name] = (langTotals[name] || 0) + size;
        totalBytes += size;
        if (edge.node.color) {
          langColors[name] = edge.node.color;
        }
      }
    }

    // Fallback: primary languages if byte data is not available
    if (!hasByteData || totalBytes === 0) {
      totalBytes = 0;
      for (const repo of repos) {
        if (repo.primaryLanguage?.name) {
          const name = repo.primaryLanguage.name;
          langTotals[name] = (langTotals[name] || 0) + 1;
          totalBytes += 1;
          if (repo.primaryLanguage.color) {
            langColors[name] = repo.primaryLanguage.color;
          }
        }
      }
    }

    if (totalBytes === 0) {
      return [];
    }

    const sorted = Object.entries(langTotals)
      .map(([name, size]) => {
        const percentage = Number(((size / totalBytes) * 100).toFixed(1));
        const color = langColors[name] || DEFAULT_LANG_COLORS[name] || '#8b949e';
        return { name, size, percentage, color };
      })
      .filter(item => item.percentage >= 0.5)
      .sort((a, b) => b.size - a.size);

    return sorted.slice(0, 7); // Top 7 languages
  }

  /**
   * Compute contributions and streaks from the calendar collection.
   */
  static computeStreakStats(contributionsCollection) {
    if (!contributionsCollection?.contributionCalendar) {
      return {
        totalContributions: 0,
        currentStreak: 0,
        longestStreak: 0,
        activeDays: 0,
        weeklyContributions: [],
        hasCalendarData: false
      };
    }

    const calendar = contributionsCollection.contributionCalendar;
    const totalContributions = calendar.totalContributions || 0;
    const weeks = calendar.weeks || [];

    // Flatten days in chronological order
    const days = [];
    const weeklyTotals = [];

    for (const week of weeks) {
      let weekSum = 0;
      for (const day of week.contributionDays || []) {
        days.push(day);
        weekSum += day.contributionCount || 0;
      }
      weeklyTotals.push(weekSum);
    }

    let activeDays = 0;
    let longestStreak = 0;
    let runningStreak = 0;

    for (let i = 0; i < days.length; i++) {
      const count = days[i].contributionCount || 0;
      if (count > 0) {
        activeDays++;
        runningStreak++;
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
      } else {
        runningStreak = 0;
      }
    }

    // Current streak (looking back from the last available day)
    let currentStreak = 0;
    if (days.length > 0) {
      const lastIdx = days.length - 1;
      const todayCount = days[lastIdx].contributionCount || 0;
      let startIdx = lastIdx;

      // If today has 0, check if yesterday was part of an active streak
      if (todayCount === 0 && lastIdx > 0 && days[lastIdx - 1].contributionCount > 0) {
        startIdx = lastIdx - 1;
      }

      while (startIdx >= 0 && days[startIdx].contributionCount > 0) {
        currentStreak++;
        startIdx--;
      }
    }

    // Weekly contributions for activity sparkline (last 16 weeks)
    const recentWeeks = weeklyTotals.slice(-16);

    return {
      totalContributions,
      currentStreak,
      longestStreak,
      activeDays,
      weeklyContributions: recentWeeks,
      commitContributions: contributionsCollection.totalCommitContributions || 0,
      hasCalendarData: true
    };
  }

  /**
   * Retrieve recently updated/pushed repositories.
   */
  static computeRecentlyActive(repos, limit = 5) {
    return [...repos]
      .filter(r => !r.isFork)
      .sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime())
      .slice(0, limit)
      .map(r => ({
        name: r.name,
        description: r.description || 'No description provided.',
        stars: r.stargazerCount || 0,
        forks: r.forkCount || 0,
        language: r.primaryLanguage?.name || 'Code',
        languageColor: r.primaryLanguage?.color || '#58a6ff',
        url: r.url || `https://github.com/shivaraj4791/${r.name}`,
        pushedAt: r.pushedAt
      }));
  }
}
