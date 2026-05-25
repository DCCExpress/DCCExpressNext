export function getDefaultWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";

  const configuredUrl = import.meta.env.VITE_WS_URL as string | undefined;

  if (configuredUrl?.trim()) {
    return configuredUrl.trim();
  }

  const configuredPort = import.meta.env.VITE_WS_PORT as string | undefined;

  const host = configuredPort
    ? `${window.location.hostname}:${configuredPort}`
    : window.location.host;

  return `${protocol}://${host}/ws`;
}
