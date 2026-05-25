import { generateId } from "../helpers";

const CLIENT_ID_KEY = "dcc-express.clientIdentity.id";
const FRIENDLY_NAME_KEY = "dcc-express.clientIdentity.friendlyName";

export type ClientIdentity = {
  clientId: string;
  friendlyName: string;
};

function createDefaultFriendlyName(): string {
  const platform = navigator.platform || "Client";
  return `${platform} ${new Date().toLocaleDateString()}`;
}

export function getClientIdentity(): ClientIdentity {
  let clientId = localStorage.getItem(CLIENT_ID_KEY)?.trim() ?? "";
  let friendlyName = localStorage.getItem(FRIENDLY_NAME_KEY)?.trim() ?? "";

  if (!clientId) {
    clientId = generateId();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }

  if (!friendlyName) {
    friendlyName = createDefaultFriendlyName();
    localStorage.setItem(FRIENDLY_NAME_KEY, friendlyName);
  }

  return { clientId, friendlyName };
}

export function saveClientFriendlyName(friendlyName: string): ClientIdentity {
  const current = getClientIdentity();
  const nextName = friendlyName.trim() || current.friendlyName;
  localStorage.setItem(FRIENDLY_NAME_KEY, nextName);
  return { ...current, friendlyName: nextName };
}

export function regenerateClientIdentity(): ClientIdentity {
  const clientId = generateId();
  const friendlyName = getClientIdentity().friendlyName;
  localStorage.setItem(CLIENT_ID_KEY, clientId);
  localStorage.setItem(FRIENDLY_NAME_KEY, friendlyName);
  return { clientId, friendlyName };
}
