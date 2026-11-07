// Configuration comes from the environment only. The platform delivers
// TABLATION_API_KEY to the app host; it is never committed or put in an image.
export function loadConfig(env = process.env) {
  return {
    apiUrl: (env.TABLATION_API_URL || 'https://app.tablation.com/api').replace(/\/+$/, ''),
    apiKey: env.TABLATION_API_KEY || '',
    workspaceId: env.TABLATION_WORKSPACE_ID || '',
    port: Number(env.PORT || 8080),
    version: env.APP_VERSION || '',
  };
}
