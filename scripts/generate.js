/**
 * generate.js
 * Main pipeline orchestrator for the self-generating GitHub profile README.
 * Orchestrates Python SVG telemetry generation, ASCII portrait generation,
 * and selective README updates.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { GitHubClient } from './github-client.js';
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
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const username = config.username || 'shivaraj4791';
  console.log(`[INFO] Target user: @${username}`);

  // 2. Resolve token
  const client = new GitHubClient();
  const token = client.token || '';
  if (token) {
    console.log(`[INFO] Authenticated session active`);
  } else {
    console.log(`[WARN] No token found. Running unauthenticated`);
  }

  // 3. Generate Telemetry SVGs via Python engine
  console.log(`[INFO] Generating telemetry SVG cards via Python engine...`);
  const env = {
    ...process.env,
    GITHUB_TOKEN: token,
    GH_LOGIN: username,
    OUT_DIR: ROOT_DIR
  };

  try {
    const pyOutput = execSync('python scripts/generate_stats.py', { cwd: ROOT_DIR, env, encoding: 'utf8' });
    console.log(`[INFO] Python generator output:`);
    console.log(pyOutput.trim());
  } catch (err) {
    console.error(`[ERROR] Python stats generation failed:`, err.message);
  }

  // 4. Ensure ASCII Portrait exists
  const asciiPath = path.join(ROOT_DIR, 'ascii.svg');
  const profilePhotoPath = path.join(ROOT_DIR, 'assets', 'profile.jpg');

  if (!fs.existsSync(asciiPath) && fs.existsSync(profilePhotoPath)) {
    console.log(`[INFO] Generating animated ASCII portrait from ${profilePhotoPath}...`);
    try {
      execSync(`python scripts/make_portrait.py "${profilePhotoPath}" "${asciiPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8'
      });
      console.log(`[SUCCESS] Generated ${asciiPath}`);
    } catch (err) {
      console.error(`[ERROR] ASCII portrait generation failed:`, err.message);
    }
  } else if (fs.existsSync(asciiPath)) {
    console.log(`[INFO] ascii.svg already present.`);
  }

  // 5. Update Featured Projects in README.md
  console.log(`[INFO] Updating featured repositories in README.md...`);
  try {
    const profileData = await client.fetchProfileData(username);
    const allRepos = profileData.user.repositories?.nodes || [];
    const featuredRepos = FeaturedReposManager.selectFeatured(allRepos, config);
    const featuredMarkdown = FeaturedReposManager.formatMarkdown(featuredRepos, username);

    const readmePath = path.join(ROOT_DIR, 'README.md');
    if (fs.existsSync(readmePath)) {
      const updateResult = ReadmeUpdater.updateSections(readmePath, {
        'FEATURED_REPOS': featuredMarkdown
      });
      if (updateResult.hasChanged) {
        console.log(`[SUCCESS] README.md updated with fresh featured repositories!`);
      } else {
        console.log(`[INFO] README.md content is identical. No diff produced.`);
      }
    }
  } catch (err) {
    console.warn(`[WARN] Could not update featured repos: ${err.message}`);
  }

  console.log('====================================================');
  console.log('✨ PROFILE GENERATION COMPLETED SUCCESSFULLY');
  console.log('====================================================');
}

main().catch(err => {
  console.error('[FATAL ERROR]', err);
  process.exit(1);
});
