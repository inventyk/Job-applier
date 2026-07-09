import React, { useState } from "react";
import { User } from "firebase/auth";
import { Settings, X, Sheet, Folder, ShieldCheck, LogOut, Loader2, Save, Link2, Linkedin, Globe, Briefcase } from "lucide-react";
import { extractSpreadsheetId, extractFolderId } from "../lib/workspace";
import { PortalAccount } from "../types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  sheetUrl: string;
  driveFolderUrl: string;
  onSave: (sheetUrl: string, driveUrl: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  linkedinAccount: PortalAccount | null;
  indeedAccount: PortalAccount | null;
  naukriAccount: PortalAccount | null;
  onLinkPortal: (portal: "linkedin" | "indeed" | "naukri") => void;
  onUnlinkPortal: (portal: "linkedin" | "indeed" | "naukri") => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  user,
  sheetUrl: initialSheetUrl,
  driveFolderUrl: initialDriveUrl,
  onSave,
  onLogin,
  onLogout,
  isLoggingIn,
  linkedinAccount,
  indeedAccount,
  naukriAccount,
  onLinkPortal,
  onUnlinkPortal,
}: SettingsModalProps) {
  const [sheetUrl, setSheetUrl] = useState(initialSheetUrl);
  const [driveUrl, setDriveUrl] = useState(initialDriveUrl);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const parsedSheetId = extractSpreadsheetId(sheetUrl);
  const parsedFolderId = extractFolderId(driveUrl);

  const handleSave = () => {
    setErrorMsg(null);
    if (sheetUrl && !parsedSheetId) {
      setErrorMsg("Please enter a valid Google Sheets URL.");
      return;
    }
    if (driveUrl && !parsedFolderId) {
      setErrorMsg("Please enter a valid Google Drive Folder URL or Folder ID.");
      return;
    }
    onSave(sheetUrl, driveUrl);
    onClose();
  };

  return (
    <div id="settings-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl shadow-zinc-950/50">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h3 className="text-white font-sans font-medium flex items-center gap-2">
            <Settings className="h-5 w-5 text-zinc-300" />
            Integrations & Account Settings
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Section 1: Authentication */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-zinc-300" />
              Google Account Authorization
            </h4>

            {user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={user.photoURL || undefined} alt="Avatar" className="h-9 w-9 rounded-full border border-zinc-800" />
                  <div>
                    <p className="text-sm font-medium text-white">{user.displayName}</p>
                    <p className="text-xs text-zinc-400">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Sign in with Google to integrate Google Sheets, Google Drive, Google Tasks, and Google Calendar. You can use your secondary/test account.
                </p>
                
                {/* Official Material Google Sign-In Button style */}
                <button
                  onClick={onLogin}
                  disabled={isLoggingIn}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-900 rounded-lg font-sans font-semibold text-sm shadow-sm transition-colors disabled:opacity-50 cursor-pointer w-full justify-center"
                >
                  {isLoggingIn ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-950" />
                  ) : (
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                  )}
                  <span>Sign in with Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Section 2: Google Sheets URL */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sheet className="h-4 w-4 text-zinc-400" />
              Tracking Google Sheet (Shareable Link)
            </label>
            <input
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-white rounded-lg p-2.5 text-xs outline-none transition-all placeholder-zinc-600"
            />
            {parsedSheetId ? (
              <p className="text-[10px] text-zinc-400 font-mono">✓ ID Parsed: {parsedSheetId}</p>
            ) : sheetUrl ? (
              <p className="text-[10px] text-red-400 font-mono">⚠️ Invalid Google Sheet link format.</p>
            ) : (
              <p className="text-[10px] text-zinc-500">Provide a shareable, editable link. The agent will read/write entries automatically.</p>
            )}
          </div>

          {/* Section 3: Google Drive Folder URL */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Folder className="h-4 w-4 text-zinc-400" />
              Resumes Google Drive Folder
            </label>
            <input
              type="text"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/your-folder-id"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-white rounded-lg p-2.5 text-xs outline-none transition-all placeholder-zinc-600"
            />
            {parsedFolderId ? (
              <p className="text-[10px] text-zinc-400 font-mono">✓ ID Parsed: {parsedFolderId}</p>
            ) : driveUrl ? (
              <p className="text-[10px] text-red-400 font-mono">⚠️ Invalid Google Drive folder format.</p>
            ) : (
              <p className="text-[10px] text-zinc-500">Provide a shareable link. Resumes will be dynamically fetched during applies.</p>
            )}
          </div>

          {/* Section 4: Job Portal Google Accounts */}
          <div className="bg-zinc-950/40 border border-zinc-800 rounded-lg p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-zinc-300" />
                Job Portal Connections
              </h4>
              <p className="text-[10px] text-zinc-500 mt-1">
                Link separate Google accounts connected with your Naukri, Indeed, or LinkedIn profiles to enable direct search and 1-click applies.
              </p>
            </div>

            <div className="space-y-3">
              {/* LinkedIn Connection */}
              <div id="portal-linkedin" className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md">
                    <Linkedin className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">LinkedIn Login</p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {linkedinAccount?.connected ? `Connected: ${linkedinAccount.email}` : "Not Connected"}
                    </p>
                  </div>
                </div>
                {linkedinAccount?.connected ? (
                  <button
                    onClick={() => onUnlinkPortal("linkedin")}
                    className="text-[10px] font-medium text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 px-2 py-1 rounded border border-red-900/30 transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => onLinkPortal("linkedin")}
                    className="text-[10px] font-semibold text-zinc-900 hover:bg-zinc-200 bg-zinc-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    Link Account
                  </button>
                )}
              </div>

              {/* Indeed Connection */}
              <div id="portal-indeed" className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-blue-600/10 text-blue-500 border border-blue-600/20 rounded-md">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Indeed Login</p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {indeedAccount?.connected ? `Connected: ${indeedAccount.email}` : "Not Connected"}
                    </p>
                  </div>
                </div>
                {indeedAccount?.connected ? (
                  <button
                    onClick={() => onUnlinkPortal("indeed")}
                    className="text-[10px] font-medium text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 px-2 py-1 rounded border border-red-900/30 transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => onLinkPortal("indeed")}
                    className="text-[10px] font-semibold text-zinc-900 hover:bg-zinc-200 bg-zinc-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    Link Account
                  </button>
                )}
              </div>

              {/* Naukri Connection */}
              <div id="portal-naukri" className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Naukri.com Login</p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {naukriAccount?.connected ? `Connected: ${naukriAccount.email}` : "Not Connected"}
                    </p>
                  </div>
                </div>
                {naukriAccount?.connected ? (
                  <button
                    onClick={() => onUnlinkPortal("naukri")}
                    className="text-[10px] font-medium text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 px-2 py-1 rounded border border-red-900/30 transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => onLinkPortal("naukri")}
                    className="text-[10px] font-semibold text-zinc-900 hover:bg-zinc-200 bg-zinc-100 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    Link Account
                  </button>
                )}
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded p-2 text-center font-sans">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 p-4 bg-zinc-950/20">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
