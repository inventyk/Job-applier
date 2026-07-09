import React from "react";
import { motion } from "motion/react";
import { Search, Brain, FileText, Send, Table, CheckSquare, Calendar, ChevronRight, Play, Loader2 } from "lucide-react";

export type FlowStep =
  | "idle"
  | "searching"
  | "analyzing"
  | "resume_fetch"
  | "applying"
  | "sheets_sync"
  | "tasks_sync"
  | "completed"
  | "failed";

interface VisualFlowProps {
  currentStep: FlowStep;
  logs: string[];
  onTriggerManual?: () => void;
  canTrigger?: boolean;
}

export default function VisualFlow({ currentStep, logs, onTriggerManual, canTrigger }: VisualFlowProps) {
  const steps = [
    {
      id: "searching",
      label: "Job Finder",
      icon: Search,
      desc: "Google Search Grounding",
      color: "from-zinc-500 to-zinc-400",
      glow: "shadow-zinc-500/10",
    },
    {
      id: "analyzing",
      label: "AI Analyst",
      icon: Brain,
      desc: "JD Skill Extraction",
      color: "from-zinc-400 to-zinc-300",
      glow: "shadow-zinc-400/10",
    },
    {
      id: "resume_fetch",
      label: "Drive Select",
      icon: FileText,
      desc: "Resume Picker",
      color: "from-zinc-500 to-zinc-400",
      glow: "shadow-zinc-500/10",
    },
    {
      id: "applying",
      label: "Apply Engine",
      icon: Send,
      desc: "Simulate submission",
      color: "from-zinc-400 to-zinc-300",
      glow: "shadow-zinc-400/10",
    },
    {
      id: "sheets_sync",
      label: "Sheets Log",
      icon: Table,
      desc: "Spreadsheet update",
      color: "from-zinc-500 to-zinc-400",
      glow: "shadow-zinc-500/10",
    },
    {
      id: "tasks_sync",
      label: "Workspace Sync",
      icon: Calendar,
      desc: "Tasks & Calendar",
      color: "from-zinc-400 to-zinc-300",
      glow: "shadow-zinc-400/10",
    },
  ];

  // Helper to check if a step is completed or active
  const getStepStatus = (stepId: string) => {
    const order = ["searching", "analyzing", "resume_fetch", "applying", "sheets_sync", "tasks_sync"];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (currentStep === "failed" && stepIndex === currentIndex) return "failed";
    if (currentStep === "completed") return "completed";
    if (currentIndex === -1) return "idle";
    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "active";
    return "idle";
  };

  return (
    <div id="visual-flow-container" className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 shadow-xl relative overflow-hidden">
      {/* Decorative elegant background */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-400/[0.01] rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-zinc-300/[0.01] rounded-full filter blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-sans font-medium text-zinc-100 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentStep !== "idle" ? "bg-zinc-400" : "bg-zinc-600"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${currentStep !== "idle" ? "bg-zinc-300" : "bg-zinc-600"}`}></span>
            </span>
            Agent Automation Workflow
          </h2>
          <p className="text-xs text-zinc-400">n8n-inspired background pipeline monitoring</p>
        </div>

        {onTriggerManual && (
          <button
            onClick={onTriggerManual}
            disabled={!canTrigger || currentStep !== "idle"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow-sm disabled:bg-zinc-800 disabled:text-zinc-500 transition-all cursor-pointer"
          >
            {currentStep !== "idle" && currentStep !== "completed" && currentStep !== "failed" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3 fill-zinc-950" />
            )}
            Run Pipeline
          </button>
        )}
      </div>

      {/* Pipeline Diagram */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10 py-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center relative">
              {/* Connector line for large screens */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+24px)] right-[-24px] h-[1px] bg-zinc-800">
                  {status === "completed" && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-zinc-400 shadow-[0_0_4px_rgba(255,255,255,0.4)]"
                    />
                  )}
                  {status === "active" && (
                    <div className="h-full w-1/2 bg-zinc-500 animate-pulse" />
                  )}
                </div>
              )}

              {/* Node Card */}
              <div
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-full border transition-all duration-300 relative ${
                  status === "completed"
                    ? "bg-zinc-900 border-zinc-300 shadow-[0_0_12px_rgba(255,255,255,0.1)] text-zinc-100"
                    : status === "active"
                    ? "bg-zinc-900 border-zinc-400 shadow-[0_0_16px_rgba(255,255,255,0.15)] text-zinc-200 scale-105 animate-pulse"
                    : status === "failed"
                    ? "bg-zinc-900 border-red-900/80 shadow-[0_0_12px_rgba(239,68,68,0.1)] text-red-400"
                    : "bg-zinc-950/40 border-zinc-850 text-zinc-600"
                }`}
              >
                <Icon className="h-5 w-5" />

                {/* Microstatus indicator */}
                {status === "completed" && (
                  <span className="absolute -top-1 -right-1 bg-zinc-200 text-zinc-950 text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    ✓
                  </span>
                )}
                {status === "active" && (
                  <span className="absolute -top-1 -right-1 bg-zinc-400 text-zinc-950 text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-spin">
                    ⚙
                  </span>
                )}
                {status === "failed" && (
                  <span className="absolute -top-1 -right-1 bg-red-900 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    !
                  </span>
                )}
              </div>

              {/* Label & Description */}
              <div className="text-center mt-3">
                <p className={`text-xs font-semibold ${status === "completed" ? "text-zinc-200" : status === "active" ? "text-zinc-300" : "text-zinc-500"}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5 max-w-[110px] mx-auto truncate">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Execution Logs Terminal */}
      <div className="mt-6 border border-zinc-800 bg-zinc-950/60 rounded-lg p-3.5 font-mono text-[11px] leading-relaxed relative">
        <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5 mb-2">
          <span className="text-zinc-500 text-[10px] uppercase tracking-wider">Execution Output Console</span>
          <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-pulse" />
        </div>
        <div className="max-h-28 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-zinc-850 text-zinc-300">
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic">Workflow idle. Submit a query in the Chatbot or select a job matching the criteria to execute the apply pipeline.</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-zinc-600 select-none">[{index + 1}]</span>
                <span className={log.includes("ERR") ? "text-red-400/90" : log.includes("Success") ? "text-zinc-200" : "text-zinc-400"}>
                  {log}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
