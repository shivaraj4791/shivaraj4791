/**
 * generate.js
 * Main pipeline orchestrator for the self-generating GitHub profile README.
 * Orchestrates API fetching, statistics calculation, SVG generation, and README updates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GitHubClient } from './github-client.js';
import { StatsCalculator } from './stats-calculator.js';
import { SvgGenerator } from './svg-generator.js';
import { FeaturedReposManager } from './featured-repos.js';
import { ReadmeUpdater } from './readme-updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

async function main() {
  console.log('====================================================');
  console.log('⚡ GITHUB PROFILE GENERATOR - RUNNING AUTOMATION');
  console.log('====================================================');

  // 1. Load Configuration
  const configPath = path.join(ROOT_DIR, 'config.json');
  if (!fs.existsSync(configPath)) {
    throw new Error(`config.json not found at ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const username = config.username || 'shivaraj4791';
  console.log(`[INFO] Target user: @${username}`);

  // 2. Initialize GitHub Client
  const client = new GitHubClient();
  if (client.token) {
    console.log(`[INFO] Authenticated request active (Token detected)`);
  } else {
    console.log(`[WARN] No token provided. Running in public/unauthenticated mode`);
  }

  // 3. Fetch Real Profile & Repository Data
  console.log(`[INFO] Fetching profile telemetry from GitHub API...`);
  const profileData = await client.fetchProfileData(username);
  console.log(`[INFO] Data retrieved via ${profileData.source.toUpperCase()} engine.`);

  // 4. Calculate Verified Statistics
  const stats = StatsCalculator.calculate(profileData, config);
  console.log(`[INFO] Computed metrics:`);
  console.log(`       - Public Repos: ${stats.publicRepos}`);
  console.log(`       - Stars Earned: ${stats.totalStars}`);
  console.log(`       - Total Forks: ${stats.totalForks}`);
  console.log(`       - Current Streak: ${stats.streaks.currentStreak} days`);
  console.log(`       - Longest Streak: ${stats.streaks.longestStreak} days`);
  console.log(`       - Year Contributions: ${stats.streaks.totalContributions}`);
  console.log(`       - Languages detected: ${stats.languages.map(l => l.name).join(', ') || 'None'}`);

  // 5. Select Featured Repositories
  const allRepos = profileData.user.repositories?.nodes || [];
  const featuredRepos = FeaturedReposManager.selectFeatured(allRepos, config);
  console.log(`[INFO] Featured projects selected: ${featuredRepos.map(r => r.name).join(', ') || 'None'}`);

  // 6. Ensure Assets Directory Exists
  const assetsDir = path.join(ROOT_DIR, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Helper to write file only if changed
  const writeIfChanged = (filePath, content) => {
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath, 'utf8');
      if (existing === content) {
        return false;
      }
    }
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  };

  // 7. Generate Standalone SVGs
  console.log(`[INFO] Rendering SVG telemetry dashboards...`);

  let svgUpdates = 0;
  if (config.sections?.headerBanner !== false) {
    const headerSvg = SvgGenerator.generateHeader(config, stats);
    if (writeIfChanged(path.join(assetsDir, 'header.svg'), headerSvg)) svgUpdates++;
  }

  if (config.sections?.statsCard !== false) {
    const statsSvg = SvgGenerator.generateStatsCard(stats);
    if (writeIfChanged(path.join(assetsDir, 'stats.svg'), statsSvg)) svgUpdates++;
  }

  if (config.sections?.streakCard !== false) {
    const streakSvg = SvgGenerator.generateStreakCard(stats);
    if (writeIfChanged(path.join(assetsDir, 'streak.svg'), streakSvg)) svgUpdates++;
  }

  if (config.sections?.languagesCard !== false) {
    const langSvg = SvgGenerator.generateLanguagesCard(stats);
    if (writeIfChanged(path.join(assetsDir, 'languages.svg'), langSvg)) svgUpdates++;
  }

  if (config.sections?.recentActivity !== false) {
    const actSvg = SvgGenerator.generateActivityCard(stats);
    if (writeIfChanged(path.join(assetsDir, 'activity.svg'), actSvg)) svgUpdates++;
  }

  console.log(`[INFO] SVG assets synced (${svgUpdates} updated).`);

  // 8. Prepare Markdown Replacement Blocks
  const featuredMarkdown = FeaturedReposManager.formatMarkdown(featuredRepos, username);

  // Status block
  let statusMarkdown = '';
  if (config.status) {
    const curr = config.status.currentlyWorkingOn;
    const currStr = curr ? (typeof curr === 'object' ? `[**${curr.title}**](${curr.url}) — ${curr.description}` : curr) : 'Autonomous software systems';
    const learnStr = config.status.learning || 'Advanced Agentic Workflows';
    const collabStr = config.status.collaboratingOn || 'Open-source developer tools';

    statusMarkdown = [
      `- 🔭 **Currently engineering:** ${currStr}`,
      `- 🧠 **Deepening knowledge in:** ${learnStr}`,
      `- 💬 **Open for collaboration on:** ${collabStr}`
    ].join('\n');
  }

  // Telemetry Dashboards markdown
  const statsDashboardMarkdown = [
    `<p align="center">`,
    `  <img src="assets/stats.svg" alt="GitHub Developer Statistics" width="100%" />`,
    `</p>`,
    `<p align="center">`,
    `  <img src="assets/streak.svg" alt="GitHub Contribution Streak & Cadence" width="100%" />`,
    `</p>`,
    `<p align="center">`,
    `  <img src="assets/languages.svg" alt="Tech Stack & Language Distribution" width="100%" />`,
    `</p>`,
    `<p align="center">`,
    `  <img src="assets/activity.svg" alt="Recent Repository Activity" width="100%" />`,
    `</p>`
  ].join('\n');

  // Master auto-generated badge & footer block
  const fullAutoBlock = [
    `<div align="center">`,
    `  <sub>⚡ <em>This profile and its telemetry cards are dynamically generated via GitHub Actions workflows and local deterministic SVG engines. Zero third-party image hosts.</em></sub>`,
    `</div>`
  ].join('\n');

  // 9. Update README.md
  const readmePath = path.join(ROOT_DIR, 'README.md');
  const sectionsToUpdate = {
    'STATUS': statusMarkdown,
    'STATS': statsDashboardMarkdown,
    'FEATURED_REPOS': featuredMarkdown,
    'AUTO-GENERATED': fullAutoBlock
  };

  console.log(`[INFO] Updating README.md markers...`);
  const updateResult = ReadmeUpdater.updateSections(readmePath, sectionsToUpdate);

  if (updateResult.hasChanged) {
    console.log(`[SUCCESS] README.md updated with fresh telemetry!`);
  } else {
    console.log(`[INFO] README.md content is identical. No diff produced.`);
  }

  console.log('====================================================');
  console.log('✨ PROFILE GENERATION COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

main().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
