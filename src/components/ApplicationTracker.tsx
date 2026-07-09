import React, { useState } from "react";
import { ApplicationRecord } from "../types";
import { Table, Calendar, CheckSquare, ExternalLink, HelpCircle, Eye, RefreshCw, Check, AlertTriangle, ChevronDown, ListFilter, ClipboardCheck } from "lucide-react";

interface ApplicationTrackerProps {
  applications: ApplicationRecord[];
  onUpdateStatus: (id: string, status: ApplicationRecord["status"], interviewDate?: string, mode?: string) => Promise<void>;
  onSyncTask: (app: ApplicationRecord) => Promise<void>;
  onSyncCalendar: (app: ApplicationRecord) => Promise<void>;
  isLoading: boolean;
  onRefresh: () => void;
  spreadsheetId: string | null;
}

export default function ApplicationTracker({
  applications,
  onUpdateStatus,
  onSyncTask,
  onSyncCalendar,
  isLoading,
  onRefresh,
  spreadsheetId,
}: ApplicationTrackerProps) {
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<ApplicationRecord["status"]>("Applied");
  const [editDate, setEditDate] = useState("");
  const [editMode, setEditMode] = useState("Not mentioned");
  const [syncLoading, setSyncLoading] = useState<{ [key: string]: boolean }>({});
  const [syncStatus, setSyncStatus] = useState<{ [key: string]: string }>({});

  const handleUpdateClick = (app: ApplicationRecord) => {
    setEditingId(app.id || null);
    setEditStatus(app.status);
    setEditDate(app.interviewDate || "");
    setEditMode(app.mode || "Not mentioned");
  };

  const handleSaveUpdate = async (id: string) => {
    try {
      setSyncLoading({ ...syncLoading, [`status-${id}`]: true });
      await onUpdateStatus(id, editStatus, editDate, editMode);
      setEditingId(null);
      setSyncStatus({ ...syncStatus, [`status-${id}`]: "Updated!" });
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, [`status-${id}`]: "" }));
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("Failed to update status in Google Sheets.");
    } finally {
      setSyncLoading(prev => ({ ...prev, [`status-${id}`]: false }));
    }
  };

  const handleSyncTaskAction = async (app: ApplicationRecord) => {
    const key = `task-${app.id}`;
    try {
      setSyncLoading({ ...syncLoading, [key]: true });
      await onSyncTask(app);
      setSyncStatus({ ...syncStatus, [key]: "Synced to Google Tasks!" });
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, [key]: "" }));
      }, 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to sync task.");
    } finally {
      setSyncLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleSyncCalendarAction = async (app: ApplicationRecord) => {
    const key = `cal-${app.id}`;
    try {
      setSyncLoading({ ...syncLoading, [key]: true });
      await onSyncCalendar(app);
      setSyncStatus({ ...syncStatus, [key]: "Synced to Google Calendar!" });
      setTimeout(() => {
        setSyncStatus(prev => ({ ...prev, [key]: "" }));
      }, 3000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to sync calendar.");
    } finally {
      setSyncLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div id="tracker-container" className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 shadow-xl relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-sans font-medium text-white flex items-center gap-2">
            <Table className="h-5 w-5 text-zinc-400" />
            Job Applications tracker (Live Google Sheets)
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {spreadsheetId ? `Reading and writing from Sheet ID: ${spreadsheetId}` : "Please provide a spreadsheet link in settings"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onRefresh}
            disabled={isLoading || !spreadsheetId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Tracker
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      {!spreadsheetId ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-950/40 border border-zinc-800 rounded-lg">
          <AlertTriangle className="h-10 w-10 text-zinc-500 mb-2 animate-bounce" />
          <h3 className="text-sm font-semibold text-white">Google Sheet Connection Required</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            Please paste an editable Google Sheet URL in the Settings menu (top-right cog) to load and sync job tracking records.
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <RefreshCw className="h-8 w-8 text-zinc-400 animate-spin mb-2" />
          <p className="text-xs text-zinc-400">Fetching applications data from your Google Sheet...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-zinc-950/40 border border-zinc-800 rounded-lg">
          <ClipboardCheck className="h-10 w-10 text-zinc-500 mb-2" />
          <h3 className="text-sm font-semibold text-white">No Applications Found</h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-sm">
            The sheet is connected but empty. Try searching for python developer jobs in the chatbot, choose one, and click 'Apply & Track' to add your first job!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/40">
          <table className="w-full text-left text-xs text-zinc-300 border-collapse">
            <thead className="bg-zinc-950 text-zinc-400 uppercase tracking-wider text-[10px] font-mono border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Company & Role</th>
                <th className="px-4 py-3">Location & Mode</th>
                <th className="px-4 py-3">Date / Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {applications.map((app) => {
                const isEditing = editingId === app.id;
                
                return (
                  <tr key={app.id} className="hover:bg-zinc-900/30 transition-colors">
                    {/* Column 1: Company & Role */}
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-semibold text-white text-sm">{app.companyName}</span>
                        {app.link ? (
                          <a
                            href={app.link}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            rel="noreferrer"
                            className="inline-flex items-center text-[10px] text-zinc-300 hover:text-white ml-1.5 font-semibold"
                          >
                            JD Link <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                          </a>
                        ) : null}
                      </div>
                      <p className="text-xs text-zinc-400 font-medium mt-0.5">{app.jobRole}</p>
                    </td>

                    {/* Column 2: Location & Mode */}
                    <td className="px-4 py-3">
                      <p className="text-zinc-200">{app.location}</p>
                      {isEditing ? (
                        <select
                          value={editMode}
                          onChange={(e) => setEditMode(e.target.value)}
                          className="mt-1.5 bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-0.5 text-[10px] outline-none"
                        >
                          <option value="Remote">Remote</option>
                          <option value="On-site">On-site</option>
                          <option value="Hybrid">Hybrid</option>
                          <option value="Not mentioned">Not mentioned</option>
                        </select>
                      ) : (
                        <span className="inline-block mt-1 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {app.mode}
                        </span>
                      )}
                    </td>

                    {/* Column 3: Date & Status */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            placeholder="Interview date (YYYY-MM-DD)"
                            className="bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-0.5 text-[10px] w-full outline-none"
                          />
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value as ApplicationRecord["status"])}
                            className="bg-zinc-900 border border-zinc-800 text-white rounded px-2 py-0.5 text-[10px] w-full outline-none"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Interview Scheduled">Interview Scheduled</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Offer Recieved">Offer Recieved</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-[10px] text-zinc-400 font-mono">
                            {app.interviewDate ? `📅 ${app.interviewDate}` : "Applied / No Date"}
                          </p>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            app.status === "Interview Scheduled"
                              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              : app.status === "Offer Recieved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : app.status === "Rejected"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-zinc-500/10 text-zinc-300 border border-zinc-500/20"
                          }`}>
                            {app.status}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Column 4: Action Panel */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveUpdate(app.id!)}
                              disabled={syncLoading[`status-${app.id}`]}
                              className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-[10px] font-bold cursor-pointer"
                            >
                              {syncLoading[`status-${app.id}`] ? "..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2 py-1 rounded bg-zinc-850 hover:bg-zinc-800 text-zinc-400 text-[10px] font-medium cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdateClick(app)}
                              className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white transition-all cursor-pointer"
                              title="Update Status / Date"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedApp(app)}
                              className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-white transition-all cursor-pointer"
                              title="View JD AI Brief"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>

                            {app.status === "Interview Scheduled" ? (
                              <>
                                <button
                                  onClick={() => handleSyncTaskAction(app)}
                                  disabled={syncLoading[`task-${app.id}`]}
                                  className={`p-1 rounded border transition-all cursor-pointer ${
                                    syncStatus[`task-${app.id}`]
                                      ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-400"
                                  }`}
                                  title="Sync to Google Tasks"
                                >
                                  {syncLoading[`task-${app.id}`] ? "..." : <CheckSquare className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleSyncCalendarAction(app)}
                                  disabled={syncLoading[`cal-${app.id}`]}
                                  className={`p-1 rounded border transition-all cursor-pointer ${
                                    syncStatus[`cal-${app.id}`]
                                      ? "bg-zinc-800 border-zinc-700 text-zinc-200"
                                      : "bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-400"
                                  }`}
                                  title="Add to Google Calendar (Copy Event)"
                                >
                                  {syncLoading[`cal-${app.id}`] ? "..." : <Calendar className="h-3.5 w-3.5" />}
                                </button>
                              </>
                            ) : null}
                          </>
                        )}
                      </div>

                      {/* Display minor success/sync logs */}
                      {(syncStatus[`task-${app.id}`] || syncStatus[`cal-${app.id}`] || syncStatus[`status-${app.id}`]) && (
                        <p className="text-[9px] text-zinc-300 font-semibold mt-1">
                          {syncStatus[`task-${app.id}`] || syncStatus[`cal-${app.id}`] || syncStatus[`status-${app.id}`]}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* JD Skills & Brief Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <div>
                <h3 className="text-white font-semibold text-sm">Job Description & Skills Brief</h3>
                <p className="text-[10px] text-zinc-400">{selectedApp.companyName} • {selectedApp.jobRole}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-1">AI Extracted Summary</h4>
                <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  {selectedApp.skillsBrief || "No brief available. The system failed to parse the skills list."}
                </p>
              </div>

              {selectedApp.skillsList && selectedApp.skillsList.length > 0 && selectedApp.skillsList[0] !== "" && (
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono mb-2">Key Skills Highlighted</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedApp.skillsList.map((skill, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-zinc-950/60 rounded-lg p-3 border border-zinc-850 space-y-2">
                <h4 className="text-[10px] uppercase tracking-wider text-zinc-400 font-mono">Workspace Calendar Copy Guideline</h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Since you've signed in using your secondary/test account, any scheduled interviews synced here will save to your secondary account's Google Tasks & Google Calendar. 
                  To copy these events to your main calendar, you can simply click the Calendar Sync button above. If desired, you can also share your secondary Google Calendar directly with your main Google account to see all schedules side-by-side.
                </p>
              </div>
            </div>

            <div className="flex justify-end p-4 border-t border-zinc-800 bg-zinc-950/20">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Micro icon wrappers
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
