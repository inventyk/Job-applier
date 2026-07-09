import React, { useState, useRef, useEffect } from "react";
import { Message, Job } from "../types";
import { Send, Bot, User, Sparkles, AlertCircle, ExternalLink, ArrowRight, CornerDownLeft, Loader2 } from "lucide-react";

interface ChatbotProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onApplyFromChat: (job: Job) => void;
  isAuthenticated: boolean;
}

export default function Chatbot({ messages, onSendMessage, isLoading, onApplyFromChat, isAuthenticated }: ChatbotProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  // Parses custom action tags from Gemini's response:
  // [Action: Track/Apply for "Title" at "Company" - Link: "URL" - Location: "Location"]
  const renderMessageContent = (msg: Message) => {
    const text = msg.text;
    const actionRegex = /\[Action:\s*Track\/Apply\s*for\s*"([^"]+)"\s*at\s*"([^"]+)"\s*-\s*Link:\s*"([^"]+)"\s*-\s*Location:\s*"([^"]+)"\]/gi;
    
    // Find action matches
    const matches: Array<{
      full: string;
      title: string;
      company: string;
      link: string;
      location: string;
    }> = [];

    let match;
    const cleanedText = text.replace(actionRegex, (full, title, company, link, location) => {
      matches.push({ full, title, company, link, location });
      return ""; // Strip from main text
    });

    return (
      <div className="space-y-3">
        {/* Main Text Content */}
        <div className="text-xs leading-relaxed text-zinc-100 whitespace-pre-wrap markdown-body">
          {cleanedText.trim()}
        </div>

        {/* Dynamic Action Buttons */}
        {matches.map((item, idx) => (
          <div
            key={idx}
            className="mt-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
          >
            <div>
              <p className="text-xs font-semibold text-white">{item.title}</p>
              <p className="text-[10px] text-zinc-400">{item.company} • {item.location}</p>
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <a
                href={item.link}
                target="_blank"
                referrerPolicy="no-referrer"
                rel="noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-medium border border-zinc-800 transition-colors w-1/2 sm:w-auto justify-center"
              >
                View JD <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => onApplyFromChat({ title: item.title, company: item.company, url: item.link, location: item.location })}
                disabled={!isAuthenticated}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[10px] font-bold shadow-sm transition-all disabled:bg-zinc-800 disabled:text-zinc-500 w-1/2 sm:w-auto justify-center cursor-pointer"
              >
                Apply & Track <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Display source citations if any */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-zinc-800/40">
            <p className="text-[9px] uppercase tracking-wider text-zinc-500 font-mono mb-1">Grounding Sources</p>
            <div className="flex flex-wrap gap-1.5">
              {msg.sources.map((src, i) => (
                <a
                  key={i}
                  href={src.uri}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-zinc-100 bg-zinc-800/30 border border-zinc-700/50 rounded px-1.5 py-0.5 transition-colors font-mono max-w-xs truncate"
                >
                  {src.title || "Web Link"} <ExternalLink className="h-2 w-2 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div id="chatbot-container" className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 rounded-xl flex flex-col h-[520px] shadow-xl relative overflow-hidden">
      {/* Glow Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-850 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <div className="bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-700/60">
            <Bot className="h-4 w-4 text-zinc-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1">
              AI Job Assistant
              <Sparkles className="h-3 w-3 text-zinc-200 fill-zinc-200 animate-pulse" />
            </h3>
            <p className="text-[10px] text-zinc-400">Powered by Gemini 3.5 with Live Search Grounding</p>
          </div>
        </div>
        
        <span className="text-[9px] font-mono bg-zinc-950 text-zinc-300 px-2 py-0.5 rounded border border-zinc-800">
          ● REALTIME
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-850">
        {messages.map((msg) => {
          const isBot = msg.sender === "bot";
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isBot ? "mr-auto" : "ml-auto flex-row-reverse"}`}>
              {/* Avatar */}
              <div className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center border ${
                isBot ? "bg-zinc-950 border-zinc-800 text-zinc-300" : "bg-zinc-100 border-zinc-200 text-zinc-950"
              }`}>
                {isBot ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              {/* Message Bubble */}
              <div className={`rounded-xl px-3.5 py-2.5 shadow-sm ${
                isBot
                  ? "bg-zinc-950/80 border border-zinc-800/80 text-zinc-100"
                  : "bg-zinc-100 text-zinc-900 font-medium"
              }`}>
                {isBot ? (
                  renderMessageContent(msg)
                ) : (
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center border bg-zinc-950 border-zinc-800 text-zinc-300">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-xl px-4 py-3 bg-zinc-950/80 border border-zinc-800 text-zinc-400 flex items-center gap-2 text-xs">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
              Searching LinkedIn, Indeed, and Naukri with AI Grounding...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Warning if not logged in */}
      {!isAuthenticated && (
        <div className="px-4 py-1.5 bg-zinc-950/50 border-t border-b border-zinc-850 text-zinc-400 text-[10px] flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Please sign in with Google in Integrations to enable "Apply & Track".</span>
        </div>
      )}

      {/* Chat Input */}
      <form onSubmit={handleSubmit} className="border-t border-zinc-850 p-3 bg-zinc-950/40 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={isAuthenticated ? "e.g., Python developer jobs in Pune..." : "Please sign in with Google first..."}
          className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 rounded-lg px-3 py-2 text-xs text-white outline-none placeholder-zinc-600 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-2 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 text-zinc-900 disabled:text-zinc-500 rounded-lg transition-all flex items-center justify-center cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
