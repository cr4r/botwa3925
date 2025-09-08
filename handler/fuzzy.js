const stringSimilarity = require('string-similarity');

/**
 * Cari trigger terbaik dari array triggerItems (support multiple triggers per command)
 * @param {string} text - Pesan user
 * @param {Array} triggerItems - Array of {trigger, cmd}
 * @param {number} [threshold=0.65] - Minimal similarity score (0-1)
 * @returns {object|null} - { bestMatch, matchedCommand } atau null jika tidak ada
 */

function fuzzyMatch(text, triggerItems, threshold = 0.65) {
    const triggersOnly = triggerItems.map(x => x.trigger);
    const { bestMatch } = stringSimilarity.findBestMatch(text, triggersOnly);
    if (bestMatch.rating >= threshold) {
        const matchedCommand = triggerItems.find(x => x.trigger === bestMatch.target)?.cmd;
        return { bestMatch, matchedCommand };
    }
    return null;
}

module.exports = { fuzzyMatch };
