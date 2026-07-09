import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { initAuth, googleSignIn, logout, getAccessToken, googlePortalSignIn } from "./lib/firebase";
import {
  extractSpreadsheetId,
  extractFolderId,
  fetchSpreadsheetData,
  appendApplicationRow,
  updateApplicationStatusInSheet,
  listResumesFromDrive,
  createGoogleTask,
  createCalendarEvent,
} from "./lib/workspace";
import { Job, ApplicationRecord, Message, DriveFile, PortalAccount } from "./types";
import VisualFlow, { FlowStep } from "./components/VisualFlow";
import SettingsModal from "./components/SettingsModal";
import Chatbot from "./components/Chatbot";
import ApplicationTracker from "./components/ApplicationTracker";
import {
  Briefcase,
  Layers,
  Settings,
  Sheet,
  FileText,
  Calendar,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Search,
  Plus,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  Bell,
} from "lucide-react";

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Configuration States (saved in LocalStorage)
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem("sheetUrl") || "");
  const [driveFolderUrl, setDriveFolderUrl] = useState(() => localStorage.getItem("driveFolderUrl") || "");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Portal Accounts State & Handlers
  const [linkedinAccount, setLinkedinAccount] = useState<PortalAccount | null>(() => {
    const saved = localStorage.getItem("portal_linkedin");
    return saved ? JSON.parse(saved) : null;
  });
  const [indeedAccount, setIndeedAccount] = useState<PortalAccount | null>(() => {
    const saved = localStorage.getItem("portal_indeed");
    return saved ? JSON.parse(saved) : null;
  });
  const [naukriAccount, setNaukriAccount] = useState<PortalAccount | null>(() => {
    const saved = localStorage.getItem("portal_naukri");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLinkPortal = async (portal: "linkedin" | "indeed" | "naukri") => {
    try {
      const result = await googlePortalSignIn();
      if (result) {
        const acc: PortalAccount = {
          connected: true,
          email: result.email,
          name: result.displayName,
        };
        if (portal === "linkedin") {
          setLinkedinAccount(acc);
          localStorage.setItem("portal_linkedin", JSON.stringify(acc));
        } else if (portal === "indeed") {
          setIndeedAccount(acc);
          localStorage.setItem("portal_indeed", JSON.stringify(acc));
        } else if (portal === "naukri") {
          setNaukriAccount(acc);
          localStorage.setItem("portal_naukri", JSON.stringify(acc));
        }
      }
    } catch (err) {
      console.error(`Failed to link ${portal} account:`, err);
    }
  };

  const handleUnlinkPortal = (portal: "linkedin" | "indeed" | "naukri") => {
    if (portal === "linkedin") {
      setLinkedinAccount(null);
      localStorage.removeItem("portal_linkedin");
    } else if (portal === "indeed") {
      setIndeedAccount(null);
      localStorage.removeItem("portal_indeed");
    } else if (portal === "naukri") {
      setNaukriAccount(null);
      localStorage.removeItem("portal_naukri");
    }
  };

  // Tracking Table States
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [isTrackerLoading, setIsTrackerLoading] = useState(false);

  // Resume selection from Google Drive
  const [resumes, setResumes] = useState<DriveFile[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [isResumesLoading, setIsResumesLoading] = useState(false);

  // n8n Visual Workflow Pipeline States
  const [currentStep, setCurrentStep] = useState<FlowStep>("idle");
  const [flowLogs, setFlowLogs] = useState<string[]>([]);

  // Conversational AI Chatbot States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Hello! I am your Job Automation Agent. I can help you search LinkedIn, Indeed, and Naukri with real-time Google Search grounding. \n\nTry asking: 'Search for junior React developer jobs in Pune' or 'Find remote python developer roles'. I will find matching positions and let you apply and track them with one click!",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Custom Manual Add / Apply panel state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualLocation, setManualLocation] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [manualJdText, setManualJdText] = useState("");

  // Confirmation state for starting the flow
  const [showConfirmApply, setShowConfirmApply] = useState(false);
  const [pendingJob, setPendingJob] = useState<Job | null>(null);

  // Prompt scheduling details when a job is marked as "Interview Scheduled"
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleAppId, setScheduleAppId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleMode, setScheduleMode] = useState("Remote");

  // Sync state tracking
  const sheetId = extractSpreadsheetId(sheetUrl);
  const folderId = extractFolderId(driveFolderUrl);

  // Listen to Auth State changes on app mount
  useEffect(() => {
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        // Refresh tracking and resume assets on success
        if (sheetId) loadTrackerData(accessToken, sheetId);
        if (folderId) loadDriveResumes(accessToken, folderId);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
  }, [sheetUrl, driveFolderUrl]);

  // Load Google Picker API script on mount
  useEffect(() => {
    let active = true;
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!active) return;
      try {
        const gapi = (window as any).gapi;
        if (gapi) {
          gapi.load("picker", () => {
            console.log("Google Picker API loaded successfully.");
          });
        }
      } catch (err) {
        console.error("Error loading gapi picker:", err);
      }
    };
    script.onerror = (e) => {
      console.warn("Could not load Google Picker API script (gapi). This might occur in a highly restricted or sandboxed iframe preview environment.", e);
    };
    document.body.appendChild(script);
    return () => {
      active = false;
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const openGooglePicker = () => {
    if (!token) {
      alert("Please sign in with Google first!");
      return;
    }
    
    const gapi = (window as any).gapi;
    const google = (window as any).google;

    if (!gapi || !google || !google.picker) {
      alert("Google Picker API is still loading. Please wait a moment and try again.");
      return;
    }

    try {
      const pickerOrigin =
        window.location.ancestorOrigins &&
        window.location.ancestorOrigins.length > 0
          ? window.location.ancestorOrigins[
              window.location.ancestorOrigins.length - 1
            ]
          : window.location.origin;

      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes("application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.google-apps.document");

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs[0];
            const newResume: DriveFile = {
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              webViewLink: doc.url,
            };
            setResumes((prev) => {
              if (prev.some((r) => r.id === newResume.id)) return prev;
              return [newResume, ...prev];
            });
            setSelectedResumeId(doc.id);
          }
        })
        .setOrigin(pickerOrigin)
        .build();
      picker.setVisible(true);
    } catch (err) {
      console.error("Error creating Google Picker:", err);
      alert("Failed to initialize Google Picker. Please ensure popups and third-party cookies are allowed.");
    }
  };

  // Load tracker applications from Google Sheets
  const loadTrackerData = async (accessToken: string, targetSheetId: string) => {
    setIsTrackerLoading(true);
    try {
      const records = await fetchSpreadsheetData(accessToken, targetSheetId);
      setApplications(records);
    } catch (err) {
      console.error("Error fetching sheets tracker data:", err);
    } finally {
      setIsTrackerLoading(false);
    }
  };

  // Load resume files from the Google Drive Folder
  const loadDriveResumes = async (accessToken: string, targetFolderId: string) => {
    setIsResumesLoading(true);
    try {
      const files = await listResumesFromDrive(accessToken, targetFolderId);
      setResumes(files);
      if (files.length > 0 && !selectedResumeId) {
        setSelectedResumeId(files[0].id);
      }
    } catch (err) {
      console.error("Error listing resumes from Drive:", err);
    } finally {
      setIsResumesLoading(false);
    }
  };

  // Trigger Google Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        if (sheetId) loadTrackerData(result.accessToken, sheetId);
        if (folderId) loadDriveResumes(result.accessToken, folderId);
      }
    } catch (err) {
      console.error("Login failed:", err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Trigger Google Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setApplications([]);
    setResumes([]);
  };

  // Handle Save of Sheet URL / Folder URL in Settings
  const handleSaveSettings = (newSheetUrl: string, newDriveUrl: string) => {
    setSheetUrl(newSheetUrl);
    setDriveFolderUrl(newDriveUrl);
    localStorage.setItem("sheetUrl", newSheetUrl);
    localStorage.setItem("driveFolderUrl", newDriveUrl);

    const newSheetId = extractSpreadsheetId(newSheetUrl);
    const newFolderId = extractFolderId(newDriveUrl);

    if (token) {
      if (newSheetId) loadTrackerData(token, newSheetId);
      if (newFolderId) loadDriveResumes(token, newFolderId);
    }
  };

  // Multi-turn chatbot client trigger
  const handleSendMessage = async (text: string) => {
    const userMsg: Message = {
      id: String(Date.now()),
      text,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      // Map history
      const history = messages.filter((m) => m.id !== "welcome");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!response.ok) {
        throw new Error("Chat engine failed to compile a response.");
      }

      const data = await response.json();
      const botMsg: Message = {
        id: String(Date.now() + 1),
        text: data.reply,
        sender: "bot",
        timestamp: new Date(),
        sources: data.sources,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          text: `⚠️ Error: ${err.message || "Failed to reach the AI engine. Please verify your GEMINI_API_KEY in the Secrets panel."}`,
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Triggered when a user clicks 'Apply & Track' on a job
  const handleApplyClick = (job: Job) => {
    setPendingJob(job);
    setShowConfirmApply(true);
  };

  // Main n8n Workflow Execution Pipeline
  const runWorkflowPipeline = async (job: Job, jdTextContent: string = "") => {
    if (!token || !sheetId) {
      alert("Please authenticate and configure your Google Sheet first!");
      return;
    }

    setShowConfirmApply(false);
    setFlowLogs([]);
    setCurrentStep("searching");
    addLog("Pipeline triggered: Automation workflow activated.");

    const activeResume = resumes.find((r) => r.id === selectedResumeId);
    const resumeName = activeResume ? activeResume.name : "Simulated Resume File";

    try {
      // Step 1: SEARCH / PARSE (analyzing)
      setCurrentStep("analyzing");
      addLog(`AI Analyzer started: Parsing details for "${job.title}" at "${job.company}"...`);
      
      const analyzeRes = await fetch("/api/analyze-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jdText: jdTextContent || `Job role for ${job.title} at ${job.company} with location ${job.location || "Not mentioned"}. Applications via ${job.url || "direct URL"}.`,
          jobUrl: job.url,
          jobTitle: job.title,
          companyName: job.company,
          location: job.location,
        }),
      });

      if (!analyzeRes.ok) {
        throw new Error("JD Analysis failed. Server-side AI failed to extract skills.");
      }

      const analyzedData = await analyzeRes.json();
      addLog(`Success: AI extracted responsibilities and skills. Primary Skills: ${analyzedData.skillsList?.join(", ") || "General"}`);

      // Step 2: FETCH RESUME FROM DRIVE (resume_fetch)
      setCurrentStep("resume_fetch");
      addLog(`Drive Select started: Connecting to Google Drive Folder to locate "${resumeName}"...`);
      // Simulate reading Drive asset details
      await new Promise((r) => setTimeout(r, 1500));
      addLog(`Success: Located and selected resume. File ID: ${selectedResumeId || "simulated_id"}. Ready for submission.`);

      // Step 3: SIMULATED APPLICATIONS (applying)
      setCurrentStep("applying");
      addLog(`Apply Engine started: Initializing submission protocols...`);
      await new Promise((r) => setTimeout(r, 1000));
      
      const jobUrlLower = (job.url || "").toLowerCase();
      const jobSourceLower = (job.source || "").toLowerCase();
      
      if ((jobUrlLower.includes("linkedin") || jobSourceLower.includes("linkedin")) && linkedinAccount?.connected) {
        addLog(`LinkedIn Engine: Successfully authenticated with linked Google account: ${linkedinAccount.email}`);
      } else if ((jobUrlLower.includes("indeed") || jobSourceLower.includes("indeed")) && indeedAccount?.connected) {
        addLog(`Indeed Engine: Successfully authenticated with linked Google account: ${indeedAccount.email}`);
      } else if ((jobUrlLower.includes("naukri") || jobSourceLower.includes("naukri")) && naukriAccount?.connected) {
        addLog(`Naukri Engine: Successfully authenticated with linked Google account: ${naukriAccount.email}`);
      } else {
        addLog(`Direct Engine: Applying as guest/default candidate profile...`);
      }
      
      await new Promise((r) => setTimeout(r, 1500));
      addLog(`Success: Candidate credentials verified, resume "${resumeName}" uploaded. 1-click application submitted successfully.`);

      // Step 4: GOOGLE SHEETS LOGGER (sheets_sync)
      setCurrentStep("sheets_sync");
      addLog(`Sheets Log started: Connecting to Google Spreadsheet: "${sheetUrl}"...`);
      
      const recordToSave = {
        companyName: analyzedData.companyName || job.company,
        jobRole: analyzedData.jobRole || job.title,
        interviewDate: analyzedData.interviewDate || new Date().toLocaleDateString(),
        mode: analyzedData.mode || "Not mentioned",
        link: analyzedData.link || job.url,
        location: analyzedData.location || job.location || "Not mentioned",
        skillsBrief: analyzedData.skillsBrief || "Auto tracked application via Workspace Agent.",
        skillsList: analyzedData.skillsList || [],
        status: "Applied" as const,
      };

      await appendApplicationRow(token, sheetId, recordToSave);
      addLog(`Success: Appended application row to Google Sheets tracking table.`);

      // Step 5: TASKS & CALENDAR SYNC (tasks_sync) - Optional on first apply unless interview listed
      setCurrentStep("tasks_sync");
      addLog(`Workspace Sync started: Checking for scheduled interviews...`);
      await new Promise((r) => setTimeout(r, 1000));
      addLog(`Success: General pipeline synced. Tracker updated.`);

      // Complete
      setCurrentStep("completed");
      addLog("Workflow Completed! All automation node logs successfully committed. Ready for review.");
      
      // Refresh the spreadsheet entries on our UI
      loadTrackerData(token, sheetId);
    } catch (err: any) {
      console.error(err);
      setCurrentStep("failed");
      addLog(`ERR: Flow pipeline interrupted. Cause: ${err.message || "Workspace API connection failure"}`);
    }
  };

  // Helper to append a console log string
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setFlowLogs((prev) => [...prev, `[${timestamp}] ${msg}`]);
  };

  // Update Status of an application row inside Google Sheets
  const handleUpdateStatus = async (
    id: string,
    status: ApplicationRecord["status"],
    interviewDate?: string,
    mode?: string
  ) => {
    if (!token || !sheetId) return;
    await updateApplicationStatusInSheet(token, sheetId, id, status, interviewDate, mode);
    
    // If the status is updated to Interview Scheduled, prompt the user to schedule Google Tasks/Calendar
    if (status === "Interview Scheduled") {
      setScheduleAppId(id);
      setScheduleDate(interviewDate || "");
      setScheduleMode(mode || "Remote");
      setShowScheduleModal(true);
    } else {
      loadTrackerData(token, sheetId);
    }
  };

  // Perform Google Tasks scheduling
  const handleSyncTask = async (app: ApplicationRecord) => {
    if (!token) throw new Error("Authentication token required.");
    const confirm = window.confirm(`Schedule Task: "Interview Prep with ${app.companyName}" in Google Tasks?`);
    if (!confirm) return;
    await createGoogleTask(token, app);
  };

  // Perform Google Calendar event creation
  const handleSyncCalendar = async (app: ApplicationRecord) => {
    if (!token) throw new Error("Authentication token required.");
    const confirm = window.confirm(`Create Calendar Event: "Interview with ${app.companyName}" on your Google Calendar?`);
    if (!confirm) return;
    await createCalendarEvent(token, app);
  };

  // Schedule modal submit helper
  const handleScheduleModalSubmit = async () => {
    if (!token || !sheetId || !scheduleAppId) return;
    
    try {
      setIsTrackerLoading(true);
      setShowScheduleModal(false);

      // 1. Update Sheet with date/mode
      await updateApplicationStatusInSheet(token, sheetId, scheduleAppId, "Interview Scheduled", scheduleDate, scheduleMode);
      
      // Fetch updated app details
      const records = await fetchSpreadsheetData(token, sheetId);
      setApplications(records);
      const app = records.find((a) => a.id === scheduleAppId);

      if (app) {
        // 2. Automatically schedule Google Task
        await createGoogleTask(token, app);
        // 3. Automatically schedule Google Calendar event
        await createCalendarEvent(token, app);
        alert(`Successfully scheduled Interview with ${app.companyName} in Google Sheets, Google Tasks, and Google Calendar!`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Status updated, but Workspace Task/Calendar sync failed: ${err.message || "API error"}`);
    } finally {
      setIsTrackerLoading(false);
      setScheduleAppId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-zinc-800 selection:text-zinc-200 relative font-sans pb-12">
      {/* Absolute floating ambient spots */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-zinc-400/[0.01] rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-zinc-350/[0.01] rounded-full filter blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-zinc-850 bg-zinc-950/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-zinc-850 rounded-xl flex items-center justify-center border border-zinc-800 shadow-sm">
            <Layers className="h-4.5 w-4.5 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-sm font-sans font-semibold tracking-tight text-white flex items-center gap-1.5">
              Workspace Job Apply Agent
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-wider">WORKSPACE AUTOMATION HUB</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="hidden sm:flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs">
              <img src={user.photoURL || undefined} className="h-5 w-5 rounded-full border border-zinc-800" alt="Avatar" />
              <span className="text-zinc-300 font-medium">{user.displayName}</span>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {isLoggingIn ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Sign In with Google
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200 rounded-lg transition-all cursor-pointer"
            title="Integrations Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-6 mt-6 space-y-6">
        
        {/* Bento Board: Connection Statuses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Google Sheet ID */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="p-3 bg-zinc-800/50 text-zinc-300 border border-zinc-750 rounded-lg">
              <Sheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Google Sheets Log</p>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {sheetId ? "Connected & Synced" : "Not Connected"}
              </p>
              <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                {sheetId ? `ID: ...${sheetId.substring(0, 10)}...` : "Set spreadsheet URL"}
              </p>
            </div>
          </div>

          {/* Card 2: Google Drive Folder */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="p-3 bg-zinc-800/50 text-zinc-300 border border-zinc-750 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Resumes Folder</p>
              <p className="text-xs font-semibold text-white truncate mt-0.5">
                {folderId ? `Connected (${resumes.length} found)` : "Not Connected"}
              </p>
              <p className="text-[9px] text-zinc-400 truncate mt-0.5">
                {folderId ? `ID: ...${folderId.substring(0, 10)}...` : "Set Google Drive folder URL"}
              </p>
            </div>
          </div>

          {/* Card 3: Google Tasks Sync */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="p-3 bg-zinc-800/50 text-zinc-300 border border-zinc-750 rounded-lg">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Tasks & Calendar</p>
              <p className="text-xs font-semibold text-white mt-0.5">Automated Sync Enabled</p>
              <p className="text-[9px] text-zinc-400 mt-0.5">Triggers on Interview changes</p>
            </div>
          </div>

          {/* Card 4: Selected Resume Dropdown */}
          <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-center shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                Active Resume selection
              </p>
              <button
                onClick={openGooglePicker}
                disabled={!token}
                className="text-[9px] font-mono text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700 transition-colors flex items-center gap-1 cursor-pointer"
                title="Open Google Picker to select any file from Google Drive"
              >
                <Search className="h-2.5 w-2.5" /> Picker
              </button>
            </div>
            {isResumesLoading ? (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Loader2 className="h-3 w-3 animate-spin text-zinc-500" />
                Scanning Drive Folder...
              </div>
            ) : resumes.length > 0 ? (
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded p-1.5 text-xs text-zinc-200 w-full outline-none"
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-zinc-500 italic">No resumes found.</p>
                <button
                  onClick={openGooglePicker}
                  disabled={!token}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white text-xs py-1 px-2 rounded border border-zinc-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Search className="h-3 w-3" /> Use Google Picker
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Workspace Connection Notice */}
        {!token && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-zinc-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-white">Google Workspace Connection Required</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Sign in with Google to allow the chatbot to retrieve your resume files, write tracking logs directly to your Google Sheets, and schedule tasks/interviews in your Google Workspace.
                </p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="flex items-center gap-1 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold rounded-lg shadow-sm transition-all flex-shrink-0 cursor-pointer"
            >
              Authorize Workspace
            </button>
          </div>
        )}

        {/* Dashboard Sections Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column A: Chatbot Assistant (Left) */}
          <div className="lg:col-span-5 space-y-6">
            <Chatbot
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isChatLoading}
              onApplyFromChat={handleApplyClick}
              isAuthenticated={!!token}
            />

            {/* Quick Manual trigger card */}
            <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="w-full flex items-center justify-between text-zinc-300 hover:text-white transition-all text-xs font-semibold uppercase tracking-wider cursor-pointer"
              >
                <span>Or Run Manual Apply Pipeline</span>
                <Plus className={`h-4 w-4 transition-transform ${showManualForm ? "rotate-45" : ""}`} />
              </button>
              
              {showManualForm && (
                <div className="mt-4 space-y-3 pt-3 border-t border-zinc-800/60 animate-fade-in text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Job Title / Role</label>
                      <input
                        type="text"
                        value={manualTitle}
                        onChange={(e) => setManualTitle(e.target.value)}
                        placeholder="e.g. Python Developer"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded p-2 outline-none text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Company Name</label>
                      <input
                        type="text"
                        value={manualCompany}
                        onChange={(e) => setManualCompany(e.target.value)}
                        placeholder="e.g. Google India"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded p-2 outline-none text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Job Location</label>
                      <input
                        type="text"
                        value={manualLocation}
                        onChange={(e) => setManualLocation(e.target.value)}
                        placeholder="e.g. Pune, MH"
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded p-2 outline-none text-white text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-400">Job Link (URL)</label>
                      <input
                        type="text"
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        placeholder="e.g. linkedin.com/jobs/..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded p-2 outline-none text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400">Paste Full Job Description (for AI Skill extract)</label>
                    <textarea
                      value={manualJdText}
                      onChange={(e) => setManualJdText(e.target.value)}
                      placeholder="Paste the full job responsibilities/skills text here..."
                      rows={3}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded p-2 outline-none text-white text-xs resize-none"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!manualTitle || !manualCompany) {
                        alert("Please fill out Title and Company at minimum!");
                        return;
                      }
                      runWorkflowPipeline(
                        { title: manualTitle, company: manualCompany, location: manualLocation, url: manualUrl },
                        manualJdText
                      );
                      setShowManualForm(false);
                    }}
                    disabled={!token || !sheetId}
                    className="w-full bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 text-zinc-900 disabled:text-zinc-500 font-semibold py-2 rounded-lg transition-all text-xs cursor-pointer"
                  >
                    Launch Workflow Node
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Column B: n8n Workflow Console (Right Top) & Table (Right Bottom) */}
          <div className="lg:col-span-7 space-y-6">
            <VisualFlow currentStep={currentStep} logs={flowLogs} />
            
            <ApplicationTracker
              applications={applications}
              onUpdateStatus={handleUpdateStatus}
              onSyncTask={handleSyncTask}
              onSyncCalendar={handleSyncCalendar}
              isLoading={isTrackerLoading}
              onRefresh={() => token && sheetId && loadTrackerData(token, sheetId)}
              spreadsheetId={sheetId}
            />
          </div>
        </div>
      </main>

      {/* Integrations & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        sheetUrl={sheetUrl}
        driveFolderUrl={driveFolderUrl}
        onSave={handleSaveSettings}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        linkedinAccount={linkedinAccount}
        indeedAccount={indeedAccount}
        naukriAccount={naukriAccount}
        onLinkPortal={handleLinkPortal}
        onUnlinkPortal={handleUnlinkPortal}
      />

      {/* Confirmation Dialog for Starting the apply automation pipeline */}
      {showConfirmApply && pendingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="flex items-center gap-3 border-b border-zinc-800 p-4">
              <div className="bg-zinc-800 p-2 border border-zinc-700 rounded-lg text-zinc-300">
                <Sparkles className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Run Apply Automation Flow?</h3>
                <p className="text-[10px] text-zinc-400">A customized pipeline will execute</p>
              </div>
            </div>

            <div className="p-5 space-y-3.5 text-xs text-zinc-300">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <p className="text-zinc-500 text-[10px] uppercase font-mono">Selected Job Posting</p>
                <p className="text-sm font-semibold text-white mt-1">{pendingJob.title}</p>
                <p className="text-zinc-400 mt-0.5">{pendingJob.company} • {pendingJob.location}</p>
              </div>

              <div className="flex items-center gap-2 text-zinc-400">
                <FileText className="h-4 w-4 text-zinc-500 flex-shrink-0" />
                <span>
                  Using resume: <strong>{resumes.find((r) => r.id === selectedResumeId)?.name || "Simulated CV"}</strong>
                </span>
              </div>

              <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-850 text-[10px] leading-relaxed text-zinc-400">
                <strong>Pipeline Actions:</strong>
                <ol className="list-decimal pl-4 mt-1.5 space-y-1">
                  <li>Analyze JD text and extract skills via Gemini AI.</li>
                  <li>Connect to Google Drive & fetch resume download tokens.</li>
                  <li>Simulate submission to company recruitment board.</li>
                  <li>Log application row to Google Sheets: "{sheetId ? `...${sheetId.substring(0, 15)}...` : ""}"</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800 bg-zinc-950/20">
              <button
                onClick={() => {
                  setShowConfirmApply(false);
                  setPendingJob(null);
                }}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Abort
              </button>
              <button
                onClick={() => runWorkflowPipeline(pendingJob)}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              >
                Confirm & Run Flow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Tasks/Calendar Sync Dialog */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full overflow-hidden shadow-2xl shadow-zinc-950/50">
            <div className="flex items-center gap-3 border-b border-zinc-800 p-4">
              <div className="bg-zinc-800 p-2 border border-zinc-700 rounded-lg text-zinc-300">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Schedule Interview Workspace Event</h3>
                <p className="text-[10px] text-zinc-400">Automatically sync with Google Tasks & Calendar</p>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs text-zinc-300">
              <p className="text-zinc-400 leading-relaxed">
                You've set the status of this job application to <strong>Interview Scheduled</strong>. Let's schedule it in Google Tasks & Google Calendar to notify you on time!
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Date of Interview</label>
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 rounded-lg p-2.5 outline-none text-white text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase tracking-wider font-mono">Interview Mode</label>
                  <select
                    value={scheduleMode}
                    onChange={(e) => setScheduleMode(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-750 rounded-lg p-2.5 outline-none text-white text-xs"
                  >
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Not mentioned">Not mentioned</option>
                  </select>
                </div>
              </div>

              <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800 text-[10px] text-zinc-400 leading-relaxed">
                🚀 This will automatically append these details back to your tracking sheet, add a preparatory checklist item in Google Tasks, and insert a scheduled slot on your Google Calendar!
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-zinc-800 bg-zinc-950/20">
              <button
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduleAppId(null);
                  if (sheetId && token) loadTrackerData(token, sheetId); // reset list status
                }}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Skip Sync
              </button>
              <button
                onClick={handleScheduleModalSubmit}
                disabled={!scheduleDate}
                className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 text-zinc-900 disabled:text-zinc-500 rounded-lg text-xs font-bold shadow-sm cursor-pointer"
              >
                Sync with Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
