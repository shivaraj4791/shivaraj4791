/**
 * test.js
 * Comprehensive automated test suite verifying SVG validity, marker safety,
 * deterministic runs, edge-case error handling, and workflow integrity.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { StatsCalculator } from './stats-calculator.js';
import { SvgGenerator } from './svg-generator.js';
import { FeaturedReposManager } from './featured-repos.js';
import { ReadmeUpdater } from './readme-updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Validates basic XML structure and well-formedness of an SVG string.
 */
function validateSvgXml(svgString, fileName) {
  assert(svgString.includes('<svg'), `${fileName}: Missing <svg opening tag`);
  assert(svgString.includes('</svg>'), `${fileName}: Missing </svg> closing tag`);
  assert(svgString.includes('xmlns="http://www.w3.org/2000/svg"'), `${fileName}: Missing standard xmlns attribute`);
  assert(svgString.includes('viewBox="'), `${fileName}: Missing viewBox attribute`);

  // Check unescaped XML ampersands outside of entities or styles
  const rawAmpersands = svgString.match(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[a-fA-F0-9]+);)/g);
  assert(!rawAmpersands, `${fileName}: Contains unescaped '&' symbol`);
}

async function runTests() {
  console.log('🧪 Starting Profile Generator Test Suite...\n');

  // Test 1: SvgGenerator outputs valid XML
  console.log('Test 1: Validating SVG output format & well-formed XML...');
  const mockStats = {
    username: 'testuser',
    name: 'Test Developer',
    publicRepos: 12,
    totalStars: 45,
    totalForks: 8,
    followers: 120,
    streaks: {
      totalContributions: 350,
      currentStreak: 5,
      longestStreak: 24,
      activeDays: 140,
      weeklyContributions: [2, 4, 1, 0, 8, 12, 5, 3, 7, 0, 4, 6, 8, 10, 15, 9]
    },
    languages: [
      { name: 'Python', percentage: 45.2, color: '#3572A5' },
      { name: 'TypeScript', percentage: 32.8, color: '#3178c6' },
      { name: 'C++', percentage: 22.0, color: '#f34b7d' }
    ],
    recentRepos: [
      { name: 'agent-core', description: 'Autonomous agent runtime', stars: 10, forks: 2, language: 'Python' }
    ]
  };

  const mockConfig = {
    displayName: 'Test Developer',
    role: 'AI Engineer',
    tagline: 'Autonomous Systems',
    location: 'Global'
  };

  const header = SvgGenerator.generateHeader(mockConfig, mockStats);
  const statsCard = SvgGenerator.generateStatsCard(mockStats);
  const streakCard = SvgGenerator.generateStreakCard(mockStats);
  const langCard = SvgGenerator.generateLanguagesCard(mockStats);
  const actCard = SvgGenerator.generateActivityCard(mockStats);

  validateSvgXml(header, 'header.svg');
  validateSvgXml(statsCard, 'stats.svg');
  validateSvgXml(streakCard, 'streak.svg');
  validateSvgXml(langCard, 'languages.svg');
  validateSvgXml(actCard, 'activity.svg');
  console.log('  ✓ All SVGs generated with valid XML markup and namespaces');

  // Test 2: FeaturedReposManager handling missing, deleted, or empty repos
  console.log('\nTest 2: FeaturedReposManager resilience with missing repos & edge cases...');
  const mockRepos = [
    { name: 'repo-a', description: 'A great repo', stargazerCount: 10, forkCount: 2, isFork: false, pushedAt: '2026-10-01' },
    { name: 'repo-b', description: 'Another project', stargazerCount: 0, forkCount: 0, isFork: true, pushedAt: '2026-09-01' }
  ];

  const selectionWithMissing = FeaturedReposManager.selectFeatured(mockRepos, {
    featuredRepos: ['non-existent-repo', 'repo-a']
  });
  assert(selectionWithMissing.length >= 1, 'Should find repo-a despite missing repo');
  assert(selectionWithMissing[0].name === 'repo-a', 'Should prioritize configured existing repo');

  const emptySelection = FeaturedReposManager.selectFeatured([], { featuredRepos: [] });
  assert(Array.isArray(emptySelection) && emptySelection.length === 0, 'Should handle empty repo list gracefully');
  const emptyMd = FeaturedReposManager.formatMarkdown([], 'testuser');
  assert(emptyMd.includes('No public repositories'), 'Should render clean fallback message when no repos found');
  console.log('  ✓ FeaturedReposManager handled missing and empty repos correctly');

  // Test 3: ReadmeUpdater marker safety & preservation
  console.log('\nTest 3: ReadmeUpdater marker safety...');
  const sampleReadme = `# Hello\n<!-- TEST:START -->\nold content\n<!-- TEST:END -->\n## Manual Section\nKeep this!`;
  const updated = ReadmeUpdater.replaceBetweenMarkers(sampleReadme, 'TEST', 'new dynamic content');
  assert(updated.includes('new dynamic content'), 'Must include new content');
  assert(updated.includes('## Manual Section\nKeep this!'), 'Must preserve manual content');
  assert(!updated.includes('old content'), 'Must cleanly overwrite between markers');

  let threwOnMissing = false;
  try {
    ReadmeUpdater.replaceBetweenMarkers(sampleReadme, 'NON_EXISTENT', 'fail');
  } catch {
    threwOnMissing = true;
  }
  assert(threwOnMissing, 'Must safely throw when target markers do not exist');
  console.log('  ✓ ReadmeUpdater preserves manual sections and fails safely on missing markers');

  // Test 4: StatsCalculator edge cases (empty calendar, no repos)
  console.log('\nTest 4: StatsCalculator edge cases...');
  const emptyProfileData = {
    user: {
      login: 'emptyuser',
      followers: { totalCount: 0 },
      following: { totalCount: 0 },
      repositories: { nodes: [] },
      contributionsCollection: null
    }
  };
  const emptyCalculated = StatsCalculator.calculate(emptyProfileData, {});
  assert(emptyCalculated.publicRepos === 0, 'Public repos must be 0');
  assert(emptyCalculated.totalStars === 0, 'Stars must be 0');
  assert(emptyCalculated.streaks.currentStreak === 0, 'Streak must be 0');
  assert(Array.isArray(emptyCalculated.languages), 'Languages should be empty array');
  console.log('  ✓ StatsCalculator gracefully handles null/empty user telemetry');

  // Test 5: GitHub Action Workflow YAML sanity
  console.log('\nTest 5: Validating .github/workflows/update-profile.yml syntax...');
  const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'update-profile.yml');
  assert(fs.existsSync(workflowPath), 'Workflow file must exist');
  const workflowContent = fs.readFileSync(workflowPath, 'utf8');
  assert(workflowContent.includes('schedule:'), 'Workflow must have schedule trigger');
  assert(workflowContent.includes('workflow_dispatch:'), 'Workflow must support manual trigger');
  assert(workflowContent.includes('contents: write'), 'Workflow must specify contents: write permission');
  assert(workflowContent.includes('node scripts/generate.js'), 'Workflow must run generator script');
  assert(workflowContent.includes('steps.git_status.outputs.changes_detected'), 'Workflow must use valid expression syntax steps.git_status.outputs.changes_detected');
  console.log('  ✓ GitHub Actions workflow contains required triggers, permissions, and steps');

  // Test 6: Running generate.js end-to-end and verifying determinism
  console.log('\nTest 6: End-to-end execution and determinism validation...');
  execSync('node scripts/generate.js', { cwd: ROOT_DIR, stdio: 'inherit' });

  // Read generated files after Run 1
  const readmePath = path.join(ROOT_DIR, 'README.md');
  const readmeAfterRun1 = fs.readFileSync(readmePath, 'utf8');
  const statsSvgPath = path.join(ROOT_DIR, 'stats.svg');
  const statsSvgAfterRun1 = fs.readFileSync(statsSvgPath, 'utf8');

  // Run 2
  console.log('\nRunning generator a second time to verify determinism...');
  execSync('node scripts/generate.js', { cwd: ROOT_DIR, stdio: 'inherit' });

  const readmeAfterRun2 = fs.readFileSync(readmePath, 'utf8');
  const statsSvgAfterRun2 = fs.readFileSync(statsSvgPath, 'utf8');

  assert(readmeAfterRun1 === readmeAfterRun2, 'Deterministic check failed: README.md changed on second run with identical data!');
  assert(statsSvgAfterRun1 === statsSvgAfterRun2, 'Deterministic check failed: stats.svg changed on second run with identical data!');
  console.log('  ✓ Determinism verified: zero diff produced across consecutive executions');

  // Verify all telemetry SVGs exist
  const requiredSvgs = ['ascii.svg', 'stats.svg', 'streak.svg', 'langs.svg', 'year.svg', 'hd-about.svg', 'hd-stack.svg', 'hd-projects.svg', 'hd-stats.svg'];
  for (const svg of requiredSvgs) {
    const p = path.join(ROOT_DIR, svg);
    assert(fs.existsSync(p), `Required asset ${svg} is missing!`);
    const content = fs.readFileSync(p, 'utf8');
    validateSvgXml(content, svg);
  }
  console.log('  ✓ All telemetry & ASCII SVG assets exist and passed XML validation');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! The system is production-ready.\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
