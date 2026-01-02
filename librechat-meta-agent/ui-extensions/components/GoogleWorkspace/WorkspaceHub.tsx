'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  FileText,
  Table,
  HardDrive,
  Calendar,
  Send,
  Reply,
  Star,
  Inbox,
  Search,
  Plus,
  Download,
  Upload,
  Share2,
  Trash2,
  Edit,
  Eye,
  Clock,
  Users,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  FolderPlus,
  File,
  ChevronRight,
  MessageSquare,
  Zap,
  Globe,
  Link as LinkIcon,
  Settings,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

/**
 * Connection status
 */
interface ConnectionStatus {
  connected: boolean;
  scopes?: string[];
  connectedAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
}

/**
 * Email interface
 */
interface Email {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: Date;
  isRead: boolean;
  labels: string[];
}

/**
 * Document interface
 */
interface Document {
  id: string;
  title: string;
  modifiedTime: Date;
  webViewLink: string;
}

/**
 * Spreadsheet interface
 */
interface Spreadsheet {
  id: string;
  title: string;
  modifiedTime: Date;
  webViewLink: string;
  sheets: Array<{ title: string }>;
}

/**
 * Drive file interface
 */
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: Date;
  webViewLink: string;
  isFolder: boolean;
  thumbnailLink?: string;
}

/**
 * Calendar event interface
 */
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
  attendees?: Array<{ email: string; responseStatus?: string }>;
}

/**
 * Component props
 */
export interface WorkspaceHubProps {
  apiUrl?: string;
  userId?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Google Workspace Hub
 * Complete dashboard for Gmail, Docs, Sheets, Drive, and Calendar
 */
export default function WorkspaceHub({
  apiUrl = '/api/google',
  userId = 'default-user',
  onConnect,
  onDisconnect,
}: WorkspaceHubProps) {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gmail' | 'docs' | 'sheets' | 'drive' | 'calendar'>('gmail');

  // Fetch connection status
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/status?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch(`${apiUrl}/auth?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.authUrl) {
        window.open(data.authUrl, '_blank');
        onConnect?.();
      }
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${apiUrl}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ connected: false });
        onDisconnect?.();
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Connect Google Workspace</h2>
            <p className="text-gray-600 mb-6">
              Access Gmail, Google Docs, Sheets, Drive, and Calendar from your AI assistant
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Read & Send Emails
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Create & Edit Docs
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Analyze Spreadsheets
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Manage Files
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Schedule Events
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-5 h-5 text-green-500" />
                AI-Powered Actions
              </div>
            </div>
            <button
              onClick={handleConnect}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
            >
              <Globe className="w-5 h-5" />
              Connect Google Workspace
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Secure OAuth 2.0 authentication. We never store your password.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-bold">Google Workspace</h1>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              Connected
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4">
          {[
            { id: 'gmail', label: 'Gmail', icon: Mail },
            { id: 'docs', label: 'Docs', icon: FileText },
            { id: 'sheets', label: 'Sheets', icon: Table },
            { id: 'drive', label: 'Drive', icon: HardDrive },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'gmail' && <GmailPanel apiUrl={apiUrl} userId={userId} />}
        {activeTab === 'docs' && <DocsPanel apiUrl={apiUrl} userId={userId} />}
        {activeTab === 'sheets' && <SheetsPanel apiUrl={apiUrl} userId={userId} />}
        {activeTab === 'drive' && <DrivePanel apiUrl={apiUrl} userId={userId} />}
        {activeTab === 'calendar' && <CalendarPanel apiUrl={apiUrl} userId={userId} />}
      </div>
    </div>
  );
}

/**
 * Gmail Panel
 */
function GmailPanel({ apiUrl, userId }: { apiUrl: string; userId: string }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [composing, setComposing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async (query?: string) => {
    setLoading(true);
    try {
      const url = query
        ? `${apiUrl}/gmail/messages?userId=${userId}&query=${encodeURIComponent(query)}`
        : `${apiUrl}/gmail/messages?userId=${userId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEmails(data.emails.map((e: any) => ({ ...e, date: new Date(e.date) })));
      }
    } catch (error) {
      console.error('Failed to fetch emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    try {
      const res = await fetch(`${apiUrl}/gmail/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, query: searchQuery }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to summarize:', error);
    }
  };

  return (
    <div className="h-full flex">
      {/* Email List */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchEmails(searchQuery)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={() => fetchEmails(searchQuery)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setComposing(true)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Compose
            </button>
            <button
              onClick={handleSummarize}
              className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium flex items-center gap-2"
              title="AI Summarize"
            >
              <Sparkles className="w-4 h-4" />
              Summarize
            </button>
          </div>
        </div>

        {aiSummary && (
          <div className="p-4 bg-purple-50 border-b border-purple-200">
            <div className="flex items-start gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900 text-sm mb-1">AI Summary</p>
                <p className="text-sm text-purple-700 whitespace-pre-wrap">{aiSummary}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : emails.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No emails found</div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelectedEmail(email)}
                className={clsx(
                  'w-full p-4 border-b border-gray-200 text-left hover:bg-gray-50 transition-colors',
                  selectedEmail?.id === email.id && 'bg-blue-50 border-l-4 border-l-blue-500'
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <p className={clsx('font-medium text-sm', !email.isRead && 'text-blue-700')}>
                    {email.from}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(email.date)}</p>
                </div>
                <p className={clsx('text-sm mb-1', !email.isRead && 'font-semibold')}>
                  {email.subject}
                </p>
                <p className="text-xs text-gray-600 line-clamp-2">{email.snippet}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Email Detail / Compose */}
      <div className="flex-1 flex flex-col">
        {composing ? (
          <ComposeEmail apiUrl={apiUrl} userId={userId} onClose={() => setComposing(false)} />
        ) : selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            apiUrl={apiUrl}
            userId={userId}
            onReply={() => setSelectedEmail(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto mb-4" />
              <p>Select an email to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Email Detail View
 */
function EmailDetail({
  email,
  apiUrl,
  userId,
  onReply,
}: {
  email: Email;
  apiUrl: string;
  userId: string;
  onReply: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [aiReply, setAiReply] = useState('');
  const [aiInstructions, setAiInstructions] = useState('');

  const handleAiReply = async () => {
    try {
      const res = await fetch(`${apiUrl}/gmail/draft-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, emailId: email.id, instructions: aiInstructions }),
      });
      const data = await res.json();
      if (data.success) {
        setAiReply(data.reply);
        setReplyText(data.reply);
      }
    } catch (error) {
      console.error('Failed to generate AI reply:', error);
    }
  };

  const handleSendReply = async () => {
    try {
      const res = await fetch(`${apiUrl}/gmail/reply/${email.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, body: replyText }),
      });
      const data = await res.json();
      if (data.success) {
        setReplying(false);
        setReplyText('');
        onReply();
      }
    } catch (error) {
      console.error('Failed to send reply:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold mb-2">{email.subject}</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">From: {email.from}</p>
            <p className="text-xs text-gray-500">{formatDate(email.date)}</p>
          </div>
          <button
            onClick={() => setReplying(!replying)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
          >
            <Reply className="w-4 h-4" />
            Reply
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: email.snippet }} />
      </div>

      {replying && (
        <div className="border-t border-gray-200 p-6">
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="AI instructions (e.g., 'Write a professional reply accepting the meeting')"
                value={aiInstructions}
                onChange={(e) => setAiInstructions(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAiReply}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Generate
              </button>
            </div>
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write your reply..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSendReply}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Send Reply
            </button>
            <button
              onClick={() => setReplying(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compose Email
 */
function ComposeEmail({
  apiUrl,
  userId,
  onClose,
}: {
  apiUrl: string;
  userId: string;
  onClose: () => void;
}) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const handleSend = async () => {
    try {
      const res = await fetch(`${apiUrl}/gmail/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, to, subject, body }),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">New Message</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <XCircle className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <input
          type="email"
          placeholder="To"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        />
        <input
          type="text"
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        />
        <textarea
          placeholder="Message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg resize-none"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSend}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Google Docs Panel
 */
function DocsPanel({ apiUrl, userId }: { apiUrl: string; userId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/docs?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setDocs(data.documents.map((d: any) => ({ ...d, modifiedTime: new Date(d.modifiedTime) })));
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setCreating(false);
        setNewTitle('');
        fetchDocs();
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Google Docs</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Document
        </button>
      </div>

      {creating && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Document title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              autoFocus
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <FileText className="w-10 h-10 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate mb-1">{doc.title}</h3>
                  <p className="text-xs text-gray-500 mb-3">{formatDate(doc.modifiedTime)}</p>
                  <a
                    href={doc.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Docs
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Google Sheets Panel
 */
function SheetsPanel({ apiUrl, userId }: { apiUrl: string; userId: string }) {
  const [sheets, setSheets] = useState<Spreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [analysis, setAnalysis] = useState('');

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/sheets?userId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setSheets(data.spreadsheets.map((s: any) => ({ ...s, modifiedTime: new Date(s.modifiedTime) })));
      }
    } catch (error) {
      console.error('Failed to fetch spreadsheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/sheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setCreating(false);
        setNewTitle('');
        fetchSheets();
      }
    } catch (error) {
      console.error('Failed to create spreadsheet:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!analyzingId || !question.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/sheets/${analyzingId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, question }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Failed to analyze spreadsheet:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Google Sheets</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Spreadsheet
        </button>
      </div>

      {creating && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Spreadsheet title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              autoFocus
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create
            </button>
            <button
              onClick={() => setCreating(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {analyzingId && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-start gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-medium text-purple-900 mb-2">AI Analysis</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Ask a question about this spreadsheet..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  onClick={handleAnalyze}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  Analyze
                </button>
              </div>
              {analysis && (
                <div className="p-3 bg-white rounded-lg border border-purple-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis}</p>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setAnalyzingId(null);
                setQuestion('');
                setAnalysis('');
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sheets.map((sheet) => (
            <div
              key={sheet.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <Table className="w-10 h-10 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate mb-1">{sheet.title}</h3>
                  <p className="text-xs text-gray-500 mb-1">
                    {sheet.sheets.length} {sheet.sheets.length === 1 ? 'sheet' : 'sheets'}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">{formatDate(sheet.modifiedTime)}</p>
                  <div className="flex gap-2">
                    <a
                      href={sheet.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </a>
                    <button
                      onClick={() => setAnalyzingId(sheet.id)}
                      className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Analyze
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Google Drive Panel
 */
function DrivePanel({ apiUrl, userId }: { apiUrl: string; userId: string }) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [currentFolder]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const url = currentFolder
        ? `${apiUrl}/drive/files?userId=${userId}&folderId=${currentFolder}`
        : `${apiUrl}/drive/files?userId=${userId}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setFiles(data.files.map((f: any) => ({ ...f, modifiedTime: new Date(f.modifiedTime) })));
      }
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      if (currentFolder) {
        formData.append('folderId', currentFolder);
      }

      const res = await fetch(`${apiUrl}/drive/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        fetchFiles();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Google Drive</h2>
          {currentFolder && (
            <button
              onClick={() => setCurrentFolder(undefined)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Back to root
            </button>
          )}
        </div>
        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2">
          <Upload className="w-5 h-5" />
          {uploading ? 'Uploading...' : 'Upload File'}
          <input type="file" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => file.isFolder && setCurrentFolder(file.id)}
            >
              <div className="flex items-start gap-3">
                {file.isFolder ? (
                  <HardDrive className="w-8 h-8 text-yellow-600 flex-shrink-0" />
                ) : (
                  <File className="w-8 h-8 text-gray-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate mb-1 text-sm">{file.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {file.size ? formatFileSize(file.size) : 'Folder'}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(file.modifiedTime)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Google Calendar Panel
 */
function CalendarPanel({ apiUrl, userId }: { apiUrl: string; userId: string }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [nlInput, setNlInput] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const res = await fetch(
        `${apiUrl}/calendar/primary/events?userId=${userId}&timeMin=${now.toISOString()}&timeMax=${nextWeek.toISOString()}`
      );
      const data = await res.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNaturalLanguageSchedule = async () => {
    if (!nlInput.trim()) return;
    try {
      const res = await fetch(`${apiUrl}/calendar/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, input: nlInput }),
      });
      const data = await res.json();
      if (data.success) {
        setCreating(false);
        setNlInput('');
        fetchEvents();
      }
    } catch (error) {
      console.error('Failed to schedule event:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Google Calendar</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Event
        </button>
      </div>

      {creating && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-start gap-2 mb-2">
            <Zap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-medium text-purple-900 mb-2">Smart Scheduling</h3>
              <p className="text-sm text-purple-700 mb-3">
                Describe your event in natural language
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., 'Meeting with John tomorrow at 2pm for 1 hour'"
                  value={nlInput}
                  onChange={(e) => setNlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNaturalLanguageSchedule()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                  autoFocus
                />
                <button
                  onClick={handleNaturalLanguageSchedule}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Schedule
                </button>
                <button
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 text-center flex-shrink-0">
                  <div className="text-sm text-gray-500">
                    {formatEventDate(event.start.dateTime || event.start.date!)}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatEventTime(event.start.dateTime || event.start.date!)}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium mb-1">{event.summary}</h3>
                  {event.location && (
                    <p className="text-sm text-gray-600 mb-1">Location: {event.location}</p>
                  )}
                  {event.description && (
                    <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                  )}
                  {event.attendees && event.attendees.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Users className="w-4 h-4" />
                      {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  <a
                    href={event.htmlLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Calendar
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Utility functions
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return date.toLocaleDateString();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
