import { ApplicationRecord, DriveFile, TaskItem } from "../types";

// Helper to extract spreadsheet ID from shareable URL
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return matches ? matches[1] : null;
}

// Helper to extract Google Drive Folder ID from shareable URL
export function extractFolderId(url: string): string | null {
  if (!url) return null;
  const matches = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (matches) return matches[1];
  // fallback if just ID is entered
  if (url.length > 20 && !url.includes("/")) return url;
  return null;
}

// Initialize sheet with headers if empty
export async function initializeSheetHeaders(token: string, spreadsheetId: string): Promise<void> {
  try {
    const headers = [
      "Company Name",
      "Job Role",
      "Interview Date / Application Date",
      "Mode",
      "Job Link",
      "Location",
      "JD Skills & Brief",
      "Status"
    ];

    // First try to read to see if there is any data
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:H1`;
    const checkRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.values && data.values.length > 0) {
        // Headers already exist
        return;
      }
    }

    // Write headers
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:H1?valueInputOption=USER_ENTERED`;
    await fetch(writeUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [headers]
      })
    });
  } catch (error) {
    console.error("Error initializing sheet headers:", error);
  }
}

// Fetch all application records from the Google Sheet
export async function fetchSpreadsheetData(token: string, spreadsheetId: string): Promise<ApplicationRecord[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A2:H150`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch spreadsheet data. Server returned status: ${res.status}`);
  }

  const data = await res.json();
  if (!data.values) return [];

  return data.values.map((row: string[], index: number) => {
    // Row mapping matches header array
    const companyName = row[0] || "Unknown Company";
    const jobRole = row[1] || "Unknown Role";
    const interviewDate = row[2] || "";
    const mode = row[3] || "Not mentioned";
    const link = row[4] || "";
    const location = row[5] || "Not mentioned";
    const skillsBrief = row[6] || "";
    const statusVal = row[7] || "Applied";

    return {
      id: String(index + 2), // row index in google sheets (A2 corresponds to row 2)
      companyName,
      jobRole,
      interviewDate,
      mode,
      link,
      location,
      skillsBrief,
      skillsList: skillsBrief ? skillsBrief.split(",").map(s => s.trim()) : [],
      status: (["Applied", "Interview Scheduled", "Rejected", "Offer Recieved"].includes(statusVal)
        ? statusVal
        : "Applied") as ApplicationRecord["status"]
    };
  });
}

// Append a new job application row to Google Sheets
export async function appendApplicationRow(
  token: string,
  spreadsheetId: string,
  record: Omit<ApplicationRecord, "id">
): Promise<void> {
  // Ensure headers exist
  await initializeSheetHeaders(token, spreadsheetId);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:H:append?valueInputOption=USER_ENTERED`;
  const values = [
    [
      record.companyName,
      record.jobRole,
      record.interviewDate || new Date().toLocaleDateString(),
      record.mode || "Not mentioned",
      record.link,
      record.location || "Not mentioned",
      record.skillsBrief,
      record.status
    ]
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values })
  });

  if (!res.ok) {
    throw new Error(`Failed to append row to Google Sheets. Status: ${res.status}`);
  }
}

// Update status of a specific job application row in Google Sheets
export async function updateApplicationStatusInSheet(
  token: string,
  spreadsheetId: string,
  rowIndex: string,
  status: ApplicationRecord["status"],
  interviewDate?: string,
  mode?: string
): Promise<void> {
  // RowIndex corresponds to actual sheet row (e.g. "2" for A2)
  const statusUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/H${rowIndex}?valueInputOption=USER_ENTERED`;
  await fetch(statusUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ values: [[status]] })
  });

  // If updating interview details
  if (interviewDate) {
    const dateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/C${rowIndex}?valueInputOption=USER_ENTERED`;
    await fetch(dateUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [[interviewDate]] })
    });
  }

  if (mode) {
    const modeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/D${rowIndex}?valueInputOption=USER_ENTERED`;
    await fetch(modeUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: [[mode]] })
    });
  }
}

// List files from shareable Google Drive folder
export async function listResumesFromDrive(token: string, folderId: string): Promise<DriveFile[]> {
  const query = `'${folderId}'+in+parents+and+trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Failed to read from Google Drive folder. Status: ${res.status}`);
  }

  const data = await res.json();
  return data.files || [];
}

// Add interview task to Google Tasks
export async function createGoogleTask(token: string, record: ApplicationRecord): Promise<any> {
  const listUrl = `https://tasks.googleapis.com/v1/users/@default/lists`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}` }
  });

  let taskListId = "@default";
  if (listRes.ok) {
    const listData = await listRes.json();
    if (listData.items && listData.items.length > 0) {
      taskListId = listData.items[0].id;
    }
  }

  const taskUrl = `https://tasks.googleapis.com/v1/lists/${taskListId}/tasks`;
  
  // Format due date in RFC 3339 format
  let dueString: string | undefined;
  if (record.interviewDate) {
    try {
      const d = new Date(record.interviewDate);
      if (!isNaN(d.getTime())) {
        dueString = d.toISOString();
      }
    } catch (e) {
      dueString = new Date().toISOString();
    }
  }

  const notes = `Company: ${record.companyName}
Role: ${record.jobRole}
Mode: ${record.mode}
Location: ${record.location}
Link: ${record.link}
Tracked via Workspace Job Search Agent`;

  const taskBody = {
    title: `Interview Prep: ${record.companyName} - ${record.jobRole}`,
    notes,
    due: dueString
  };

  const res = await fetch(taskUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(taskBody)
  });

  if (!res.ok) {
    throw new Error(`Failed to create task in Google Tasks. Status: ${res.status}`);
  }

  return res.json();
}

// Add event/task to Google Calendar
export async function createCalendarEvent(token: string, record: ApplicationRecord): Promise<any> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  let startIso = new Date().toISOString();
  if (record.interviewDate) {
    try {
      const d = new Date(record.interviewDate);
      if (!isNaN(d.getTime())) {
        startIso = d.toISOString();
      }
    } catch (e) {}
  }

  // default event is 1 hour
  const endIso = new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

  const eventBody = {
    summary: `Interview with ${record.companyName}: ${record.jobRole}`,
    location: record.location,
    description: `Interview details:
Role: ${record.jobRole}
Mode: ${record.mode}
Link: ${record.link}
Description & Skills: ${record.skillsBrief}`,
    start: {
      dateTime: startIso,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    },
    end: {
      dateTime: endIso,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
    },
    reminders: {
      useDefault: true
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(eventBody)
  });

  if (!res.ok) {
    throw new Error(`Failed to create calendar event. Status: ${res.status}`);
  }

  return res.json();
}
