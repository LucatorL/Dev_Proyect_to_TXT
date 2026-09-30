export const MAX_FILE_SIZE = 1024 * 1024 * 5;

export const PROJECT_CONFIG = {
  java: {
    extensions: ['java', 'xml', 'properties', 'pom', 'gradle', 'kt', 'kts', 'sql', 'classpath', 'project'],
    defaultSelected: ['java', 'kt', 'xml', 'gradle', 'pom']
  },
  web: {
    extensions: ['html', 'css', 'scss', 'less', 'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'svg', 'vue', 'svelte', 'yaml', 'yml', 'env', 'mjs', 'cjs', 'dockerfile', 'gitignore', 'package.json', 'tsconfig.json', 'php'],
    defaultSelected: ['html', 'css', 'scss', 'js', 'ts', 'jsx', 'tsx', 'vue', 'svelte', 'php']
  },
  total: {
    extensions: ['java', 'xml', 'properties', 'pom', 'gradle', 'kt', 'kts', 'sql', 'html', 'css', 'scss', 'less', 'js', 'ts', 'jsx', 'tsx', 'json', 'md', 'svg', 'vue', 'svelte', 'yaml', 'yml', 'env', 'mjs', 'cjs', 'dockerfile', 'gitignore', 'package.json', 'tsconfig.json', 'txt', 'csv', 'dat', 'classpath', 'project', 'py', 'rb', 'php', 'sh', 'bat'],
    defaultSelected: ['java', 'kt', 'js', 'ts', 'jsx', 'tsx', 'py', 'html', 'css', 'sql', 'json', 'md']
  }
};
export type ProjectType = keyof typeof PROJECT_CONFIG;
export const ALL_SUPPORTED_EXTENSIONS = [...new Set(Object.values(PROJECT_CONFIG).flatMap(config => config.extensions))];

export function getFileExtension(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') return 'unknown';
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith('package.json')) return 'package.json';
  if (lowerFileName.endsWith('tsconfig.json')) return 'tsconfig.json';
  if (lowerFileName.endsWith('.gitignore')) return 'gitignore';
  if (lowerFileName.endsWith('dockerfile')) return 'dockerfile';
  if (fileName.startsWith('.')) {
    const potentialExtension = fileName.substring(1).toLowerCase();
    if (ALL_SUPPORTED_EXTENSIONS.includes(potentialExtension)) return potentialExtension;
  }
  if (lowerFileName === 'pom.xml') return 'pom';
  if (lowerFileName.endsWith('.gradle')) return 'gradle';
  const parts = fileName.split('.');
  if (parts.length > 1) {
    const lastPart = parts.pop()?.toLowerCase();
    if (lastPart && ALL_SUPPORTED_EXTENSIONS.includes(lastPart)) return lastPart;
  }
  return 'unknown';
}
