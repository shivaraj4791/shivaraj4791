/**
 * readme-updater.js
 * Safely updates targeted sections within README.md using deterministic markers.
 * Preserves all manual sections, comments, and structure.
 */

import fs from 'fs';

export class ReadmeUpdater {
  /**
   * Replaces content between start and end markers.
   */
  static replaceBetweenMarkers(content, markerName, replacement) {
    const startTag = `<!-- ${markerName}:START -->`;
    const endTag = `<!-- ${markerName}:END -->`;

    const startIndex = content.indexOf(startTag);
    const endIndex = content.indexOf(endTag);

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(`Markers "${startTag}" and/or "${endTag}" not found in README.md`);
    }

    if (startIndex >= endIndex) {
      throw new Error(`Malformed markers: "${startTag}" appears after or matches "${endTag}"`);
    }

    const before = content.slice(0, startIndex + startTag.length);
    const after = content.slice(endIndex);

    // Ensure clean newlines around replacement
    const cleanReplacement = replacement.startsWith('\n') ? replacement : `\n${replacement}`;
    const formattedReplacement = cleanReplacement.endsWith('\n') ? cleanReplacement : `${cleanReplacement}\n`;

    return `${before}${formattedReplacement}${after}`;
  }

  /**
   * Updates multiple sections in a single pass.
   */
  static updateSections(filePath, sections) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`README file does not exist at: ${filePath}`);
    }

    const originalContent = fs.readFileSync(filePath, 'utf8');
    let updatedContent = originalContent;

    for (const [markerName, replacement] of Object.entries(sections)) {
      if (updatedContent.includes(`<!-- ${markerName}:START -->`)) {
        updatedContent = this.replaceBetweenMarkers(updatedContent, markerName, replacement);
      }
    }

    const hasChanged = originalContent !== updatedContent;
    if (hasChanged) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
    }

    return { hasChanged, content: updatedContent };
  }
}
