function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const k = 1024, dm = 1, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = { formatBytes };
