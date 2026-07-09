export interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description?: string;
  skills?: string[];
  source?: string;
}

export interface ApplicationRecord {
  id?: string;
  companyName: string;
  jobRole: string;
  interviewDate: string;
  mode: string;
  link: string;
  location: string;
  skillsBrief: string;
  skillsList: string[];
  status: "Applied" | "Interview Scheduled" | "Rejected" | "Offer Recieved";
}

export interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  sources?: Array<{ title: string; uri: string }>;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status: string;
}

export interface PortalAccount {
  connected: boolean;
  email: string;
  name: string;
}
