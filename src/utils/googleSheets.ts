/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";

// Cache access token and user info in-memory
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

// Safe dynamic config loader for AI Studio Workspace setup
const getFirebaseConfig = async () => {
  try {
    const response = await fetch("/firebase-applet-config.json");
    if (!response.ok) {
      throw new Error("Config file not found yet.");
    }
    return await response.json();
  } catch (err) {
    // Return a mock development key or throw
    console.warn("Firebase applet configuration is still being provisioned. Waiting for OAuth approval.");
    return null;
  }
};

export const initializeSheetsAuth = async () => {
  const config = await getFirebaseConfig();
  if (!config) return null;

  const apps = getApps();
  const app = apps.length === 0 ? initializeApp(config) : apps[0];
  return getAuth(app);
};

export const signInWithGoogleSheets = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (isSigningIn) return null;
  isSigningIn = true;

  try {
    const auth = await initializeSheetsAuth();
    if (!auth) {
      throw new Error("Google Workspace Credentials have not been fully provisioned yet. Please click authorize in the setup card.");
    }

    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/spreadsheets");
    provider.addScope("https://www.googleapis.com/auth/drive.file");

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to retrieve Google OAuth Access Token.");
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (err: any) {
    console.error("Sign-in with Google Sheets failed:", err);
    throw err;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedToken = () => cachedAccessToken;
export const getCachedUser = () => cachedUser;

export const logoutGoogleSheets = async () => {
  const auth = await initializeSheetsAuth();
  if (auth) {
    await auth.signOut();
  }
  cachedAccessToken = null;
  cachedUser = null;
};

// -----------------------------------------------------------------------------
// Google Sheets API Integration (REST API client using standard fetch)
// -----------------------------------------------------------------------------

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

export const createSimulationSpreadsheet = async (
  token: string,
  turnNumber: number
): Promise<SpreadsheetInfo> => {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: `Freeciv Spectator AI Simulation - Turn ${turnNumber}`,
      },
      sheets: [
        {
          properties: {
            title: "Leaderboard Scores",
            gridProperties: { rowCount: 100, columnCount: 15 },
          },
        },
        {
          properties: {
            title: "Historical Event Log",
            gridProperties: { rowCount: 1000, columnCount: 10 },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to create Google Spreadsheet.");
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
  };
};

export const syncLeaderboardToSpreadsheet = async (
  token: string,
  spreadsheetId: string,
  civs: any[]
): Promise<void> => {
  const sortedCivs = [...civs].sort((a, b) => b.score - a.score);
  
  // Header row + data rows
  const rows = [
    ["Rank", "Civilization", "Leader", "Score", "Gold", "Science", "Technologies", "Status"],
    ...sortedCivs.map((civ, idx) => [
      idx + 1,
      civ.name,
      civ.leader,
      civ.score,
      civ.gold,
      civ.science,
      civ.researchedTechs?.join(", ") || "None",
      civ.isDead ? "ELIMINATED" : "ACTIVE",
    ]),
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Leaderboard Scores'!A1:H100?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to update Leaderboard sheet.");
  }
};

export const syncEventsToSpreadsheet = async (
  token: string,
  spreadsheetId: string,
  events: any[]
): Promise<void> => {
  const rows = [
    ["Turn", "Category", "Headline", "Details Narrative Summary", "Timestamp"],
    ...events.map(event => [
      event.turn,
      event.category || "General",
      event.headline,
      event.summary,
      new Date(event.timestamp).toLocaleTimeString(),
    ]),
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Historical Event Log'!A1:E1000?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: rows,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Failed to update Event Log sheet.");
  }
};
