export interface ReplyInfo {
  id: string;
  text: string;
  userName: string;
}

export interface PollData {
  question: string;
  options: { text: string; voters: string[] }[];
  isActive: boolean;
  createdAt: Date;
}

export interface FileData {
  uri: string;
  name: string;
  size: number;
}

export interface ChatUser {
  _id: string;
  name: string;
  avatar?: string | null;
  avatarPreset?: number | null;
  role?: string;
}

export interface ProjectLinkData {
  projectId: string;
  projectName: string;
}

export interface ChatMessage {
  _id: string;
  text: string;
  createdAt: Date;
  user: ChatUser;
  image?: string | null;
  audio?: string | null;
  poll?: PollData | null;
  file?: FileData | null;
  replyTo?: ReplyInfo | null;
  reactions?: Record<string, string[]>;
  edited?: boolean;
  forwarded?: boolean;
  projectLink?: ProjectLinkData | null;
}
