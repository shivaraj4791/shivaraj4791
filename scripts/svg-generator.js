/**
 * svg-generator.js
 * Generates production-grade, standalone SVG cards with a modern dark developer aesthetic.
 * Zero external font or image dependencies — renders crisply via GitHub camo proxy.
 */

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe).replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

const COMMON_STYLES = `
  .font-mono {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'JetBrains Mono', 'SF Mono', Menlo, Consolas, monospace;
  }
  .title {
    font-size: 14px;
    font-weight: 600;
    fill: #58a6ff;
    letter-spacing: 0.5px;
  }
  .label {
    font-size: 11px;
    font-weight: 400;
    fill: #8b949e;
    letter-spacing: 0.3px;
  }
  .value {
    font-size: 20px;
    font-weight: 700;
    fill: #e6edf3;
    letter-spacing: -0.5px;
  }
  .sub {
    font-size: 10px;
    fill: #6e7681;
  }
  .badge-bg {
    fill: #21262d;
    stroke: #30363d;
    stroke-width: 1;
  }
`;

export class SvgGenerator {
  /**
   * 1. Header Terminal Banner
   */
  static generateHeader(config, stats) {
    const name = escapeXml(config.displayName || stats.name || 'Developer');
    const role = escapeXml(config.role || 'Software & AI/ML Engineer');
    const tagline = escapeXml(config.tagline || 'Building Autonomous Systems');
    const location = escapeXml(config.location || 'Earth');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 140" width="100%" height="140">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#161b22" />
      <stop offset="100%" stop-color="#0d1117" />
    </linearGradient>
    <linearGradient id="accentLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#58a6ff" />
      <stop offset="50%" stop-color="#bc8cff" />
      <stop offset="100%" stop-color="#3fb950" />
    </linearGradient>
  </defs>
  <style>
    ${COMMON_STYLES}
  </style>

  <!-- Container Box -->
  <rect x="1" y="1" width="838" height="138" rx="8" fill="url(#headerGrad)" stroke="#30363d" stroke-width="1.5" />
  <rect x="1" y="1" width="838" height="3" fill="url(#accentLine)" rx="2" />

  <!-- Window Control Dots -->
  <circle cx="24" cy="24" r="5" fill="#ff5f56" stroke="#e0443e" stroke-width="0.5" />
  <circle cx="40" cy="24" r="5" fill="#ffbd2e" stroke="#dea123" stroke-width="0.5" />
  <circle cx="56" cy="24" r="5" fill="#27c93f" stroke="#1aab29" stroke-width="0.5" />

  <!-- Terminal Path -->
  <text x="80" y="27" class="font-mono label">user@developer-workspace:~$ cat profile.json</text>

  <!-- Status Indicator -->
  <g transform="translate(710, 16)">
    <rect x="0" y="0" width="106" height="20" rx="10" fill="#21262d" stroke="#30363d" stroke-width="1" />
    <circle cx="12" cy="10" r="4" fill="#3fb950">
      <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
    </circle>
    <text x="24" y="14" class="font-mono label" fill="#3fb950" font-weight="600" font-size="10">SYS: ACTIVE</text>
  </g>

  <!-- Name and Title -->
  <text x="24" y="68" class="font-mono" font-size="22" font-weight="700" fill="#e6edf3" letter-spacing="-0.5px">
    &gt; ${name}
  </text>
  <text x="24" y="93" class="font-mono label" font-size="12" fill="#58a6ff" font-weight="500">
    ${role} &#8226; <tspan fill="#8b949e">${location}</tspan>
  </text>
  <text x="24" y="116" class="font-mono sub" font-size="11" fill="#8b949e">
    &#8220;${tagline}&#8221;
  </text>
</svg>`;
  }

  /**
   * 2. Developer Stats Card
   */
  static generateStatsCard(stats) {
    const repos = escapeXml(stats.publicRepos);
    const stars = escapeXml(stats.totalStars);
    const forks = escapeXml(stats.totalForks);
    const followers = escapeXml(stats.followers);
    const contributions = escapeXml(stats.streaks.totalContributions || '0');
    const activeDays = escapeXml(stats.streaks.activeDays || '0');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 180" width="100%" height="180">
  <defs>
    <linearGradient id="statsBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#161b22" />
      <stop offset="100%" stop-color="#0d1117" />
    </linearGradient>
  </defs>
  <style>
    ${COMMON_STYLES}
    .metric-box {
      fill: #161b22;
      stroke: #30363d;
      stroke-width: 1;
    }
  </style>

  <!-- Container -->
  <rect x="1" y="1" width="838" height="178" rx="8" fill="url(#statsBg)" stroke="#30363d" stroke-width="1" />

  <!-- Section Title -->
  <text x="24" y="32" class="font-mono title">&#9881; DEVELOPER OVERVIEW</text>
  <text x="700" y="32" class="font-mono sub">REAL-TIME TELEMETRY</text>

  <!-- Metric 1: Public Repositories -->
  <g transform="translate(24, 48)">
    <rect x="0" y="0" width="124" height="106" rx="6" class="metric-box" />
    <text x="14" y="24" class="font-mono label">PUBLIC REPOS</text>
    <text x="14" y="62" class="font-mono value">${repos}</text>
    <text x="14" y="88" class="font-mono sub">Active Projects</text>
  </g>

  <!-- Metric 2: Total Stars -->
  <g transform="translate(158, 48)">
    <rect x="0" y="0" width="124" height="106" rx="6" class="metric-box" />
    <text x="14" y="24" class="font-mono label">STARS EARNED</text>
    <text x="14" y="62" class="font-mono value" fill="#e3b341">${stars} &#9733;</text>
    <text x="14" y="88" class="font-mono sub">Community Stars</text>
  </g>

  <!-- Metric 3: Total Forks -->
  <g transform="translate(292, 48)">
    <rect x="0" y="0" width="124" height="106" rx="6" class="metric-box" />
    <text x="14" y="24" class="font-mono label">FORKS</text>
    <text x="14" y="62" class="font-mono value" fill="#bc8cff">${forks}</text>
    <text x="14" y="88" class="font-mono sub">Ecosystem Reach</text>
  </g>

  <!-- Metric 4: Year Contributions -->
  <g transform="translate(426, 48)">
    <rect x="0" y="0" width="134" height="106" rx="6" class="metric-box" />
    <text x="14" y="24" class="font-mono label">CONTRIBUTIONS</text>
    <text x="14" y="62" class="font-mono value" fill="#3fb950">${contributions}</text>
    <text x="14" y="88" class="font-mono sub">Past 12 Months</text>
  </g>

  <!-- Metric 5: Active Days -->
  <g transform="translate(570, 48)">
    <rect x="0" y="0" width="120" height="106" rx="6" class="metric-box" />
    <text x="14" y="24" class="font-mono label">ACTIVE DAYS</text>
    <text x="14" y="62" class="font-mono value">${activeDays}</text>
    <text x="14" y="88" class="font-mono sub">Work Days</text>
  </g>

  <!-- Metric 6: Followers -->
  <g transform="translate(700, 48)">
    <rect x="0" y="0" width="116" height="106" rx="6" class="metric-box" />
    <text x="14" y="24" class="font-mono label">FOLLOWERS</text>
    <text x="14" y="62" class="font-mono value">${followers}</text>
    <text x="14" y="88" class="font-mono sub">Dev Network</text>
  </g>
</svg>`;
  }

  /**
   * 3. Streak & Contribution Cadence Card
   */
  static generateStreakCard(stats) {
    const currentStreak = stats.streaks.currentStreak || 0;
    const longestStreak = stats.streaks.longestStreak || 0;
    const totalContribs = stats.streaks.totalContributions || 0;
    const weekly = stats.streaks.weeklyContributions || [];

    // Build mini weekly activity sparkline bars (16 bars)
    const maxWeek = Math.max(...weekly, 1);
    const barWidth = 14;
    const barGap = 6;
    const chartHeight = 52;
    const chartX = 490;
    const chartY = 130;

    let barsSvg = '';
    const displayWeeks = weekly.length >= 16 ? weekly.slice(-16) : weekly;
    for (let i = 0; i < displayWeeks.length; i++) {
      const val = displayWeeks[i];
      const h = Math.max(3, Math.round((val / maxWeek) * chartHeight));
      const x = chartX + i * (barWidth + barGap);
      const y = chartY - h;
      const fill = val > 0 ? (val > 5 ? '#3fb950' : '#238636') : '#21262d';
      barsSvg += `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" rx="2" fill="${fill}" />\n`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 180" width="100%" height="180">
  <defs>
    <linearGradient id="streakBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#161b22" />
      <stop offset="100%" stop-color="#0d1117" />
    </linearGradient>
  </defs>
  <style>
    ${COMMON_STYLES}
  </style>

  <!-- Container -->
  <rect x="1" y="1" width="838" height="178" rx="8" fill="url(#streakBg)" stroke="#30363d" stroke-width="1" />

  <!-- Title -->
  <text x="24" y="32" class="font-mono title">&#9889; COMMIT ACTIVITY &amp; CADENCE</text>
  <text x="690" y="32" class="font-mono sub">16-WEEK TRAJECTORY</text>

  <!-- Current Streak -->
  <g transform="translate(24, 52)">
    <rect x="0" y="0" width="136" height="100" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1" />
    <text x="14" y="24" class="font-mono label">CURRENT STREAK</text>
    <text x="14" y="60" class="font-mono value" fill="#3fb950">${currentStreak} <tspan font-size="12" font-weight="400" fill="#8b949e">DAYS</tspan></text>
    <text x="14" y="84" class="font-mono sub">${currentStreak > 0 ? 'Active momentum' : 'Ready for next push'}</text>
  </g>

  <!-- Longest Streak -->
  <g transform="translate(172, 52)">
    <rect x="0" y="0" width="136" height="100" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1" />
    <text x="14" y="24" class="font-mono label">LONGEST STREAK</text>
    <text x="14" y="60" class="font-mono value" fill="#58a6ff">${longestStreak} <tspan font-size="12" font-weight="400" fill="#8b949e">DAYS</tspan></text>
    <text x="14" y="84" class="font-mono sub">Personal best</text>
  </g>

  <!-- Total Contributions -->
  <g transform="translate(320, 52)">
    <rect x="0" y="0" width="144" height="100" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1" />
    <text x="14" y="24" class="font-mono label">ANNUAL CADENCE</text>
    <text x="14" y="60" class="font-mono value" fill="#e6edf3">${totalContribs}</text>
    <text x="14" y="84" class="font-mono sub">365-day total</text>
  </g>

  <!-- Weekly Activity Sparkline Container -->
  <g transform="translate(476, 52)">
    <rect x="0" y="0" width="340" height="100" rx="6" fill="#161b22" stroke="#30363d" stroke-width="1" />
    <text x="14" y="22" class="font-mono label">WEEKLY VELOCITY (PAST 16 WEEKS)</text>
    <!-- Sparkline Bars -->
    <g transform="translate(-476, -52)">
      ${barsSvg}
    </g>
    <text x="14" y="90" class="font-mono sub">&#8592; 16 wks ago</text>
    <text x="270" y="90" class="font-mono sub">Present &#8594;</text>
  </g>
</svg>`;
  }

  /**
   * 4. Language Distribution Card
   */
  static generateLanguagesCard(stats) {
    const languages = stats.languages || [];
    const totalWidth = 790;

    // Build the horizontal multi-color progress bar
    let barSegments = '';
    let currentX = 25;
    const barY = 56;
    const barHeight = 14;

    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      const segmentWidth = Math.max(4, Math.round((lang.percentage / 100) * totalWidth));
      const rx = i === 0 ? 4 : (i === languages.length - 1 ? 4 : 0);
      barSegments += `<rect x="${currentX}" y="${barY}" width="${segmentWidth}" height="${barHeight}" rx="${rx}" fill="${lang.color}" />\n`;
      currentX += segmentWidth;
    }

    // If no languages found
    if (languages.length === 0) {
      barSegments = `<rect x="25" y="${barY}" width="${totalWidth}" height="${barHeight}" rx="4" fill="#30363d" />`;
    }

    // Build two-row legend items
    let legendSvg = '';
    const colWidth = 260;
    const startX = 25;
    const startY = 96;

    languages.slice(0, 6).forEach((lang, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = startX + col * colWidth;
      const y = startY + row * 26;

      legendSvg += `
      <g transform="translate(${x}, ${y})">
        <circle cx="6" cy="6" r="5" fill="${lang.color}" />
        <text x="18" y="10" class="font-mono label" font-weight="600" fill="#e6edf3">${escapeXml(lang.name)}</text>
        <text x="180" y="10" class="font-mono sub" fill="#8b949e">${lang.percentage}%</text>
      </g>`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 160" width="100%" height="160">
  <defs>
    <linearGradient id="langBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#161b22" />
      <stop offset="100%" stop-color="#0d1117" />
    </linearGradient>
  </defs>
  <style>
    ${COMMON_STYLES}
  </style>

  <!-- Container -->
  <rect x="1" y="1" width="838" height="158" rx="8" fill="url(#langBg)" stroke="#30363d" stroke-width="1" />

  <!-- Title -->
  <text x="24" y="32" class="font-mono title">&#10024; TECH ECOSYSTEM &amp; LANGUAGES</text>
  <text x="680" y="32" class="font-mono sub">AGGREGATE CODE BASE</text>

  <!-- Progress Bar Container -->
  <rect x="24" y="55" width="792" height="16" rx="5" fill="#21262d" stroke="#30363d" stroke-width="1" />
  ${barSegments}

  <!-- Legend Items -->
  ${legendSvg}
</svg>`;
  }

  /**
   * 5. Recent Activity / Repository Highlights Card
   */
  static generateActivityCard(stats) {
    const repos = stats.recentRepos || [];
    let rowsSvg = '';
    const startY = 56;
    const rowHeight = 28;

    repos.slice(0, 4).forEach((repo, idx) => {
      const y = startY + idx * rowHeight;
      const name = escapeXml(repo.name);
      const desc = escapeXml(repo.description.length > 55 ? repo.description.slice(0, 52) + '...' : repo.description);
      const lang = escapeXml(repo.language);
      const stars = repo.stars;

      rowsSvg += `
      <g transform="translate(24, ${y})">
        <circle cx="6" cy="6" r="3" fill="#58a6ff" />
        <text x="18" y="10" class="font-mono" font-size="12" font-weight="600" fill="#e6edf3">${name}</text>
        <text x="220" y="10" class="font-mono sub" fill="#8b949e">${desc}</text>
        <text x="680" y="10" class="font-mono sub" fill="#58a6ff">${lang}</text>
        <text x="770" y="10" class="font-mono sub" fill="#e3b341">&#9733; ${stars}</text>
      </g>`;
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 180" width="100%" height="180">
  <defs>
    <linearGradient id="actBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#161b22" />
      <stop offset="100%" stop-color="#0d1117" />
    </linearGradient>
  </defs>
  <style>
    ${COMMON_STYLES}
  </style>

  <!-- Container -->
  <rect x="1" y="1" width="838" height="178" rx="8" fill="url(#actBg)" stroke="#30363d" stroke-width="1" />

  <!-- Title -->
  <text x="24" y="32" class="font-mono title">&#128640; RECENT REPOSITORY ACTIVITY</text>
  <text x="690" y="32" class="font-mono sub">FRESH COMMITS &amp; BUILDS</text>

  <!-- Activity Rows -->
  ${rowsSvg}
</svg>`;
  }
}
