/**
 * featured-repos.js
 * Selects and formats featured repositories from config or automatic scoring.
 */

export class FeaturedReposManager {
  /**
   * Selects featured repositories based on configuration or intelligent heuristics.
   */
  static selectFeatured(allRepos, config = {}) {
    const configuredList = Array.isArray(config.featuredRepos) ? config.featuredRepos : [];
    const featured = [];
    const seen = new Set();

    // 1. Prioritize manually configured repositories
    for (const name of configuredList) {
      const match = allRepos.find(r => r.name.toLowerCase() === name.toLowerCase());
      if (match && !seen.has(match.name)) {
        featured.push(match);
        seen.add(match.name);
      }
    }

    // 2. If fewer than 4, fill remaining slots using scoring heuristics
    if (featured.length < 4) {
      const scored = allRepos
        .filter(r => !seen.has(r.name) && !r.isPrivate)
        .map(r => {
          let score = 0;
          if (!r.isFork) score += 50;
          if (r.description && r.description.trim().length > 10) score += 20;
          score += (r.stargazerCount || 0) * 15;
          score += (r.forkCount || 0) * 10;
          
          if (r.pushedAt) {
            const ageDays = (Date.now() - new Date(r.pushedAt).getTime()) / (1000 * 60 * 60 * 24);
            if (ageDays < 30) score += 25;
            else if (ageDays < 90) score += 15;
            else if (ageDays < 180) score += 5;
          }
          return { repo: r, score };
        })
        .sort((a, b) => b.score - a.score);

      for (const item of scored) {
        if (featured.length >= 4) break;
        featured.push(item.repo);
        seen.add(item.repo.name);
      }
    }

    return featured;
  }

  /**
   * Formats featured repositories into clean, recruiter-friendly Markdown matching Andrii Drok's aesthetic.
   */
  static formatMarkdown(featuredRepos, username) {
    if (!featuredRepos || featuredRepos.length === 0) {
      return `_No public repositories currently featured._\n`;
    }

    const blocks = [];
    for (const repo of featuredRepos) {
      const name = repo.name;
      const url = repo.url || `https://github.com/${username}/${name}`;
      const desc = repo.description ? repo.description.trim() : 'Project repository and source code.';
      const lang = (repo.primaryLanguage?.name || 'code').toLowerCase();

      blocks.push(`**[${name}](${url})** &nbsp;·&nbsp; <samp>${lang}</samp><br>\n${desc}`);
    }

    return blocks.join('\n\n') + '\n';
  }
}
