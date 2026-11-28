export type JamendoTrack = {
  id: string;
  title: string;
  artist: string;
  audioUrl: string;
  trackUrl: string;
  licenseUrl: string;
  licenseName: "CC BY";
};

type JamendoApiTrack = {
  id?: string | number;
  name?: string;
  artist_name?: string;
  audio?: string;
  shareurl?: string;
  license_ccurl?: string;
};

type JamendoApiResponse = {
  headers?: {
    status?: string;
    error_message?: string;
  };
  results?: JamendoApiTrack[];
};

export class JamendoError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "JamendoError";
  }
}

function secureJamendoUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") ||
        (url.hostname !== "jamendo.com" && !url.hostname.endsWith(".jamendo.com"))) {
      return null;
    }
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

function secureCcByLicense(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") ||
        url.hostname !== "creativecommons.org" ||
        !/^\/licenses\/by\/(?:1\.0|2\.0|2\.5|3\.0|4\.0)\/?$/.test(url.pathname)) {
      return null;
    }
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeTrack(track: JamendoApiTrack): JamendoTrack | null {
  const id = String(track.id || "");
  const title = typeof track.name === "string" ? track.name.trim() : "";
  const artist = typeof track.artist_name === "string" ? track.artist_name.trim() : "";
  const audioUrl = secureJamendoUrl(track.audio);
  const trackUrl = secureJamendoUrl(track.shareurl);
  const licenseUrl = secureCcByLicense(track.license_ccurl);
  if (!/^\d+$/.test(id) || !title || !artist || !audioUrl || !trackUrl || !licenseUrl) {
    return null;
  }

  return {
    id,
    title,
    artist,
    audioUrl,
    trackUrl,
    licenseUrl,
    licenseName: "CC BY",
  };
}

async function requestTracks(params: Record<string, string>) {
  const clientId = process.env.JAMENDO_CLIENT_ID?.trim();
  if (!clientId) throw new JamendoError("Music search is not configured.", 503);

  const url = new URL("https://api.jamendo.com/v3.0/tracks/");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("format", "json");
  url.searchParams.set("include", "licenses");
  url.searchParams.set("limit", "50");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  } catch {
    throw new JamendoError("The music service could not be reached. Please try again.", 502);
  }

  if (!response.ok) {
    throw new JamendoError(`The music service returned an error (${response.status}).`, 502);
  }

  let data: JamendoApiResponse;
  try {
    data = await response.json();
  } catch {
    throw new JamendoError("The music service returned an invalid response.", 502);
  }

  if (!Array.isArray(data.results)) {
    throw new JamendoError(data.headers?.error_message || "The music service returned no track data.", 502);
  }

  return data.results.map(normalizeTrack).filter((track): track is JamendoTrack => track !== null);
}

export async function searchJamendoTracks(query: string) {
  return (await requestTracks({ search: query })).slice(0, 12);
}

export async function getJamendoTrack(trackId: string) {
  if (!/^\d+$/.test(trackId)) return null;
  const tracks = await requestTracks({ id: trackId });
  return tracks.find((track) => track.id === trackId) || null;
}
