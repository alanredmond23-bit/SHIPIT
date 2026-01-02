import { Pool } from 'pg';
import { Logger } from 'pino';
import { google, Auth, gmail_v1, drive_v3, docs_v1, sheets_v4, calendar_v3 } from 'googleapis';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';

/**
 * Email interfaces
 */
export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  snippet: string;
  body: string;
  date: Date;
  labels: string[];
  attachments?: EmailAttachment[];
  isRead: boolean;
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

export interface Draft {
  id: string;
  message: Email;
}

export interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';
  color?: {
    backgroundColor: string;
    textColor: string;
  };
}

/**
 * Google Docs interfaces
 */
export interface Document {
  id: string;
  title: string;
  content: string;
  createdTime: Date;
  modifiedTime: Date;
  mimeType: string;
  webViewLink: string;
}

/**
 * Google Sheets interfaces
 */
export interface Spreadsheet {
  id: string;
  title: string;
  sheets: Sheet[];
  createdTime: Date;
  modifiedTime: Date;
  webViewLink: string;
}

export interface Sheet {
  sheetId: number;
  title: string;
  rowCount: number;
  columnCount: number;
}

/**
 * Google Drive interfaces
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime: Date;
  modifiedTime: Date;
  webViewLink: string;
  thumbnailLink?: string;
  parents?: string[];
  isFolder: boolean;
}

/**
 * Google Calendar interfaces
 */
export interface Calendar {
  id: string;
  summary: string;
  description?: string;
  timeZone: string;
  primary: boolean;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  }>;
  conferenceData?: {
    conferenceSolution?: {
      name: string;
      iconUri?: string;
    };
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  status?: 'confirmed' | 'tentative' | 'cancelled';
  htmlLink: string;
}

export interface CreateEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  conferenceData?: boolean;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
}

export interface TimeSlot {
  start: Date;
  end: Date;
}

/**
 * OAuth token storage
 */
interface TokenData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  scope: string;
  expires_at: Date;
}

/**
 * Google Workspace Service
 * Provides unified access to Gmail, Docs, Sheets, Drive, and Calendar
 */
export class GoogleWorkspaceService {
  private oauth2Client: Auth.OAuth2Client;
  private gmail: gmail_v1.Gmail;
  private drive: drive_v3.Drive;
  private docs: docs_v1.Docs;
  private sheets: sheets_v4.Sheets;
  private calendar: calendar_v3.Calendar;

  constructor(private userId: string, tokens: TokenData) {
    // Create OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      scope: tokens.scope,
      expiry_date: tokens.expires_at.getTime(),
    });

    // Initialize API clients
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
    this.docs = google.docs({ version: 'v1', auth: this.oauth2Client });
    this.sheets = google.sheets({ version: 'v4', auth: this.oauth2Client });
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * GMAIL METHODS
   */

  async listEmails(query?: string, maxResults: number = 20): Promise<Email[]> {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });

    const messages = response.data.messages || [];
    const emails: Email[] = [];

    for (const message of messages) {
      if (message.id) {
        const email = await this.getEmail(message.id);
        emails.push(email);
      }
    }

    return emails;
  }

  async getEmail(id: string): Promise<Email> {
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const message = response.data;
    const headers = message.payload?.headers || [];

    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const body = this.extractEmailBody(message.payload);

    return {
      id: message.id!,
      threadId: message.threadId!,
      from: getHeader('from'),
      to: getHeader('to').split(',').map((e) => e.trim()),
      cc: getHeader('cc') ? getHeader('cc').split(',').map((e) => e.trim()) : undefined,
      subject: getHeader('subject'),
      snippet: message.snippet || '',
      body,
      date: new Date(parseInt(message.internalDate || '0')),
      labels: message.labelIds || [],
      isRead: !(message.labelIds || []).includes('UNREAD'),
      attachments: this.extractAttachments(message.payload),
    };
  }

  private extractEmailBody(payload?: gmail_v1.Schema$MessagePart): string {
    if (!payload) return '';

    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
        const nested = this.extractEmailBody(part);
        if (nested) return nested;
      }
    }

    return '';
  }

  private extractAttachments(payload?: gmail_v1.Schema$MessagePart): EmailAttachment[] {
    const attachments: EmailAttachment[] = [];

    const extractFromPart = (part: gmail_v1.Schema$MessagePart) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0,
          attachmentId: part.body.attachmentId,
        });
      }

      if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    if (payload) {
      extractFromPart(payload);
    }

    return attachments;
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    attachments?: Array<{ filename: string; content: Buffer; mimeType: string }>
  ): Promise<void> {
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  }

  async draftEmail(to: string, subject: string, body: string): Promise<Draft> {
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const response = await this.gmail.users.drafts.create({
      userId: 'me',
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });

    const draftId = response.data.id!;
    const draftMessage = response.data.message!;

    return {
      id: draftId,
      message: await this.getEmail(draftMessage.id!),
    };
  }

  async replyToEmail(emailId: string, body: string): Promise<void> {
    const originalEmail = await this.getEmail(emailId);

    const messageParts = [
      `To: ${originalEmail.from}`,
      `Subject: Re: ${originalEmail.subject}`,
      `In-Reply-To: ${emailId}`,
      `References: ${emailId}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      body,
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: originalEmail.threadId,
      },
    });
  }

  async searchEmails(query: string): Promise<Email[]> {
    return this.listEmails(query, 50);
  }

  async getLabels(): Promise<Label[]> {
    const response = await this.gmail.users.labels.list({
      userId: 'me',
    });

    return (response.data.labels || []).map((label) => ({
      id: label.id!,
      name: label.name!,
      type: label.type === 'system' ? 'system' : 'user',
      color: label.color
        ? {
            backgroundColor: label.color.backgroundColor || '#000000',
            textColor: label.color.textColor || '#ffffff',
          }
        : undefined,
    }));
  }

  async applyLabel(emailId: string, labelId: string): Promise<void> {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }

  /**
   * GOOGLE DOCS METHODS
   */

  async listDocuments(): Promise<Document[]> {
    const response = await this.drive.files.list({
      q: "mimeType='application/vnd.google-apps.document'",
      fields: 'files(id,name,createdTime,modifiedTime,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    const files = response.data.files || [];
    const documents: Document[] = [];

    for (const file of files) {
      documents.push({
        id: file.id!,
        title: file.name!,
        content: '', // Content loaded separately
        createdTime: new Date(file.createdTime!),
        modifiedTime: new Date(file.modifiedTime!),
        mimeType: 'application/vnd.google-apps.document',
        webViewLink: file.webViewLink!,
      });
    }

    return documents;
  }

  async getDocument(id: string): Promise<Document> {
    const [docResponse, metadataResponse] = await Promise.all([
      this.docs.documents.get({ documentId: id }),
      this.drive.files.get({ fileId: id, fields: 'createdTime,modifiedTime,webViewLink' }),
    ]);

    const doc = docResponse.data;
    const metadata = metadataResponse.data;

    // Extract text content
    let content = '';
    if (doc.body?.content) {
      for (const element of doc.body.content) {
        if (element.paragraph?.elements) {
          for (const textElement of element.paragraph.elements) {
            if (textElement.textRun?.content) {
              content += textElement.textRun.content;
            }
          }
        }
      }
    }

    return {
      id: doc.documentId!,
      title: doc.title!,
      content,
      createdTime: new Date(metadata.createdTime!),
      modifiedTime: new Date(metadata.modifiedTime!),
      mimeType: 'application/vnd.google-apps.document',
      webViewLink: metadata.webViewLink!,
    };
  }

  async createDocument(title: string, content?: string): Promise<Document> {
    const response = await this.docs.documents.create({
      requestBody: {
        title,
      },
    });

    const documentId = response.data.documentId!;

    if (content) {
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content,
              },
            },
          ],
        },
      });
    }

    return this.getDocument(documentId);
  }

  async updateDocument(id: string, content: string): Promise<void> {
    // Get current document to find end index
    const doc = await this.docs.documents.get({ documentId: id });
    const endIndex = doc.data.body?.content?.[doc.data.body.content.length - 1]?.endIndex || 1;

    await this.docs.documents.batchUpdate({
      documentId: id,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: 1,
                endIndex: endIndex - 1,
              },
            },
          },
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      },
    });
  }

  async appendToDocument(id: string, content: string): Promise<void> {
    const doc = await this.docs.documents.get({ documentId: id });
    const endIndex = doc.data.body?.content?.[doc.data.body.content.length - 1]?.endIndex || 1;

    await this.docs.documents.batchUpdate({
      documentId: id,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: endIndex - 1 },
              text: content,
            },
          },
        ],
      },
    });
  }

  async exportDocument(id: string, format: 'pdf' | 'docx' | 'txt'): Promise<Buffer> {
    const mimeTypes = {
      pdf: 'application/pdf',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
    };

    const response = await this.drive.files.export(
      {
        fileId: id,
        mimeType: mimeTypes[format],
      },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  }

  /**
   * GOOGLE SHEETS METHODS
   */

  async listSpreadsheets(): Promise<Spreadsheet[]> {
    const response = await this.drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet'",
      fields: 'files(id,name,createdTime,modifiedTime,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    });

    const files = response.data.files || [];
    const spreadsheets: Spreadsheet[] = [];

    for (const file of files) {
      spreadsheets.push({
        id: file.id!,
        title: file.name!,
        sheets: [], // Sheets loaded separately
        createdTime: new Date(file.createdTime!),
        modifiedTime: new Date(file.modifiedTime!),
        webViewLink: file.webViewLink!,
      });
    }

    return spreadsheets;
  }

  async getSpreadsheet(id: string): Promise<Spreadsheet> {
    const [sheetResponse, metadataResponse] = await Promise.all([
      this.sheets.spreadsheets.get({ spreadsheetId: id }),
      this.drive.files.get({ fileId: id, fields: 'createdTime,modifiedTime,webViewLink' }),
    ]);

    const spreadsheet = sheetResponse.data;
    const metadata = metadataResponse.data;

    return {
      id: spreadsheet.spreadsheetId!,
      title: spreadsheet.properties?.title!,
      sheets: (spreadsheet.sheets || []).map((sheet) => ({
        sheetId: sheet.properties?.sheetId!,
        title: sheet.properties?.title!,
        rowCount: sheet.properties?.gridProperties?.rowCount || 0,
        columnCount: sheet.properties?.gridProperties?.columnCount || 0,
      })),
      createdTime: new Date(metadata.createdTime!),
      modifiedTime: new Date(metadata.modifiedTime!),
      webViewLink: metadata.webViewLink!,
    };
  }

  async createSpreadsheet(title: string): Promise<Spreadsheet> {
    const response = await this.sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title,
        },
      },
    });

    return this.getSpreadsheet(response.data.spreadsheetId!);
  }

  async getValues(spreadsheetId: string, range: string): Promise<any[][]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  }

  async setValues(spreadsheetId: string, range: string, values: any[][]): Promise<void> {
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });
  }

  async appendRows(spreadsheetId: string, sheetName: string, rows: any[][]): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });
  }

  /**
   * GOOGLE DRIVE METHODS
   */

  async listFiles(folderId?: string): Promise<DriveFile[]> {
    const query = folderId ? `'${folderId}' in parents` : undefined;

    const response = await this.drive.files.list({
      q: query,
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,parents)',
      orderBy: 'modifiedTime desc',
      pageSize: 100,
    });

    return (response.data.files || []).map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? parseInt(file.size) : undefined,
      createdTime: new Date(file.createdTime!),
      modifiedTime: new Date(file.modifiedTime!),
      webViewLink: file.webViewLink!,
      thumbnailLink: file.thumbnailLink,
      parents: file.parents,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));
  }

  async searchFiles(query: string): Promise<DriveFile[]> {
    const response = await this.drive.files.list({
      q: `name contains '${query}'`,
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink)',
      pageSize: 50,
    });

    return (response.data.files || []).map((file) => ({
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? parseInt(file.size) : undefined,
      createdTime: new Date(file.createdTime!),
      modifiedTime: new Date(file.modifiedTime!),
      webViewLink: file.webViewLink!,
      thumbnailLink: file.thumbnailLink,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));
  }

  async getFile(id: string): Promise<DriveFile> {
    const response = await this.drive.files.get({
      fileId: id,
      fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,parents',
    });

    const file = response.data;

    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? parseInt(file.size) : undefined,
      createdTime: new Date(file.createdTime!),
      modifiedTime: new Date(file.modifiedTime!),
      webViewLink: file.webViewLink!,
      thumbnailLink: file.thumbnailLink,
      parents: file.parents,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    };
  }

  async uploadFile(
    name: string,
    content: Buffer,
    mimeType: string,
    folderId?: string
  ): Promise<DriveFile> {
    const response = await this.drive.files.create({
      requestBody: {
        name,
        parents: folderId ? [folderId] : undefined,
      },
      media: {
        mimeType,
        body: content,
      } as any,
      fields: 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink',
    });

    const file = response.data;

    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? parseInt(file.size) : undefined,
      createdTime: new Date(file.createdTime!),
      modifiedTime: new Date(file.modifiedTime!),
      webViewLink: file.webViewLink!,
      isFolder: false,
    };
  }

  async downloadFile(id: string): Promise<Buffer> {
    const response = await this.drive.files.get(
      {
        fileId: id,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data as ArrayBuffer);
  }

  async deleteFile(id: string): Promise<void> {
    await this.drive.files.delete({ fileId: id });
  }

  async createFolder(name: string, parentId?: string): Promise<DriveFile> {
    const response = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : undefined,
      },
      fields: 'id,name,mimeType,createdTime,modifiedTime,webViewLink',
    });

    const file = response.data;

    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      createdTime: new Date(file.createdTime!),
      modifiedTime: new Date(file.modifiedTime!),
      webViewLink: file.webViewLink!,
      isFolder: true,
    };
  }

  async shareFile(id: string, email: string, role: 'reader' | 'writer'): Promise<void> {
    await this.drive.permissions.create({
      fileId: id,
      requestBody: {
        type: 'user',
        role,
        emailAddress: email,
      },
    });
  }

  /**
   * GOOGLE CALENDAR METHODS
   */

  async listCalendars(): Promise<Calendar[]> {
    const response = await this.calendar.calendarList.list();

    return (response.data.items || []).map((cal) => ({
      id: cal.id!,
      summary: cal.summary!,
      description: cal.description,
      timeZone: cal.timeZone!,
      primary: cal.primary || false,
    }));
  }

  async listEvents(
    calendarId: string = 'primary',
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    const response = await this.calendar.events.list({
      calendarId,
      timeMin: timeMin?.toISOString(),
      timeMax: timeMax?.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    return (response.data.items || []).map((event) => this.mapCalendarEvent(event));
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const response = await this.calendar.events.get({
      calendarId,
      eventId,
    });

    return this.mapCalendarEvent(response.data);
  }

  async createEvent(calendarId: string, event: CreateEventInput): Promise<CalendarEvent> {
    const requestBody: calendar_v3.Schema$Event = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
      attendees: event.attendees,
      reminders: event.reminders,
    };

    if (event.conferenceData) {
      requestBody.conferenceData = {
        createRequest: {
          requestId: uuidv4(),
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    const response = await this.calendar.events.insert({
      calendarId,
      conferenceDataVersion: event.conferenceData ? 1 : undefined,
      requestBody,
    });

    return this.mapCalendarEvent(response.data);
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const response = await this.calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updates as calendar_v3.Schema$Event,
    });

    return this.mapCalendarEvent(response.data);
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId,
      eventId,
    });
  }

  async findFreeTime(
    calendarId: string,
    duration: number,
    within: { start: Date; end: Date }
  ): Promise<TimeSlot[]> {
    const events = await this.listEvents(calendarId, within.start, within.end);

    const freeSlots: TimeSlot[] = [];
    let currentTime = within.start;

    for (const event of events) {
      const eventStart = new Date(event.start.dateTime || event.start.date!);

      if (currentTime < eventStart) {
        const gap = eventStart.getTime() - currentTime.getTime();
        if (gap >= duration * 60 * 1000) {
          freeSlots.push({
            start: new Date(currentTime),
            end: new Date(eventStart),
          });
        }
      }

      const eventEnd = new Date(event.end.dateTime || event.end.date!);
      currentTime = eventEnd > currentTime ? eventEnd : currentTime;
    }

    if (currentTime < within.end) {
      const gap = within.end.getTime() - currentTime.getTime();
      if (gap >= duration * 60 * 1000) {
        freeSlots.push({
          start: new Date(currentTime),
          end: within.end,
        });
      }
    }

    return freeSlots;
  }

  private mapCalendarEvent(event: calendar_v3.Schema$Event): CalendarEvent {
    return {
      id: event.id!,
      summary: event.summary!,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.start?.dateTime,
        date: event.start?.date,
        timeZone: event.start?.timeZone,
      },
      end: {
        dateTime: event.end?.dateTime,
        date: event.end?.date,
        timeZone: event.end?.timeZone,
      },
      attendees: event.attendees?.map((a) => ({
        email: a.email!,
        displayName: a.displayName,
        responseStatus: a.responseStatus as any,
      })),
      conferenceData: event.conferenceData
        ? {
            conferenceSolution: {
              name: event.conferenceData.conferenceSolution?.name || 'Google Meet',
              iconUri: event.conferenceData.conferenceSolution?.iconUri,
            },
            entryPoints: event.conferenceData.entryPoints?.map((ep) => ({
              entryPointType: ep.entryPointType!,
              uri: ep.uri!,
              label: ep.label,
            })),
          }
        : undefined,
      reminders: event.reminders
        ? {
            useDefault: event.reminders.useDefault || false,
            overrides: event.reminders.overrides?.map((o) => ({
              method: o.method as 'email' | 'popup',
              minutes: o.minutes!,
            })),
          }
        : undefined,
      status: event.status as any,
      htmlLink: event.htmlLink!,
    };
  }
}

/**
 * Google Workspace Engine
 * Manages OAuth flow and AI-powered workspace actions
 */
export class GoogleWorkspaceEngine {
  private oauth2Client: Auth.OAuth2Client;
  private anthropic: Anthropic;

  constructor(
    private db: Pool,
    private logger: Logger,
    private config: {
      googleClientId: string;
      googleClientSecret: string;
      googleRedirectUri: string;
      anthropicApiKey: string;
    }
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );

    this.anthropic = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(userId: string, scopes: string[]): Promise<string> {
    const url = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId,
      prompt: 'consent',
    });

    return url;
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(userId: string, code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);

    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await this.db.query(
      `INSERT INTO google_oauth_tokens
       (user_id, access_token, refresh_token, token_type, scope, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = COALESCE(EXCLUDED.refresh_token, google_oauth_tokens.refresh_token),
         token_type = EXCLUDED.token_type,
         scope = EXCLUDED.scope,
         expires_at = EXCLUDED.expires_at,
         updated_at = NOW()`,
      [
        userId,
        tokens.access_token,
        tokens.refresh_token,
        tokens.token_type,
        tokens.scope,
        expiresAt,
      ]
    );

    this.logger.info({ user_id: userId }, 'Google Workspace connected');
  }

  /**
   * Refresh access token
   */
  async refreshToken(userId: string): Promise<void> {
    const { rows } = await this.db.query(
      `SELECT * FROM google_oauth_tokens WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error('No OAuth tokens found');
    }

    const tokenData = rows[0];

    this.oauth2Client.setCredentials({
      refresh_token: tokenData.refresh_token,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    const expiresAt = credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    await this.db.query(
      `UPDATE google_oauth_tokens
       SET access_token = $1,
           expires_at = $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [credentials.access_token, expiresAt, userId]
    );
  }

  /**
   * Revoke access
   */
  async revokeAccess(userId: string): Promise<void> {
    const { rows } = await this.db.query(
      `DELETE FROM google_oauth_tokens
       WHERE user_id = $1
       RETURNING access_token`,
      [userId]
    );

    if (rows.length > 0) {
      try {
        await this.oauth2Client.revokeToken(rows[0].access_token);
      } catch (error) {
        this.logger.warn({ error }, 'Failed to revoke token at Google');
      }
    }

    this.logger.info({ user_id: userId }, 'Google Workspace disconnected');
  }

  /**
   * Get service for user
   */
  async getService(userId: string): Promise<GoogleWorkspaceService> {
    const { rows } = await this.db.query(
      `SELECT * FROM google_oauth_tokens WHERE user_id = $1`,
      [userId]
    );

    if (rows.length === 0) {
      throw new Error('User not connected to Google Workspace');
    }

    const tokenData = rows[0];

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      await this.refreshToken(userId);
      return this.getService(userId);
    }

    return new GoogleWorkspaceService(userId, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      scope: tokenData.scope,
      expires_at: tokenData.expires_at,
    });
  }

  /**
   * Track action
   */
  private async trackAction(
    userId: string,
    service: string,
    action: string,
    resourceId?: string,
    metadata?: any
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO google_workspace_actions
       (user_id, service, action, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, service, action, resourceId, metadata ? JSON.stringify(metadata) : null]
    );
  }

  /**
   * AI: Summarize emails
   */
  async summarizeEmails(userId: string, query?: string): Promise<string> {
    const service = await this.getService(userId);
    const emails = await service.listEmails(query, 20);

    const emailSummaries = emails
      .map((email) => `From: ${email.from}\nSubject: ${email.subject}\nSnippet: ${email.snippet}`)
      .join('\n\n---\n\n');

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Please summarize these emails, highlighting key topics, action items, and important messages:\n\n${emailSummaries}`,
        },
      ],
    });

    const summary = response.content[0].type === 'text' ? response.content[0].text : '';

    await this.trackAction(userId, 'gmail', 'summarize_emails', undefined, { count: emails.length });

    return summary;
  }

  /**
   * AI: Draft reply
   */
  async draftReply(userId: string, emailId: string, instructions: string): Promise<string> {
    const service = await this.getService(userId);
    const email = await service.getEmail(emailId);

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `I received this email:\n\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}\n\nPlease draft a reply following these instructions: ${instructions}\n\nWrite ONLY the reply content, no subject line or greeting metadata.`,
        },
      ],
    });

    const reply = response.content[0].type === 'text' ? response.content[0].text : '';

    await this.trackAction(userId, 'gmail', 'draft_reply', emailId);

    return reply;
  }

  /**
   * AI: Analyze spreadsheet
   */
  async analyzeSpreadsheet(userId: string, spreadsheetId: string, question: string): Promise<string> {
    const service = await this.getService(userId);
    const spreadsheet = await service.getSpreadsheet(spreadsheetId);

    // Get data from first sheet
    const firstSheet = spreadsheet.sheets[0];
    const values = await service.getValues(spreadsheetId, `${firstSheet.title}!A1:Z100`);

    const dataPreview = values.slice(0, 20).map((row) => row.join('\t')).join('\n');

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Here is data from a spreadsheet titled "${spreadsheet.title}":\n\n${dataPreview}\n\n${question}`,
        },
      ],
    });

    const analysis = response.content[0].type === 'text' ? response.content[0].text : '';

    await this.trackAction(userId, 'sheets', 'analyze', spreadsheetId);

    return analysis;
  }

  /**
   * AI: Schedule from natural language
   */
  async scheduleFromNaturalLanguage(userId: string, input: string): Promise<CalendarEvent> {
    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Extract event details from this natural language input and return a JSON object with these fields:
- summary (string, required)
- description (string, optional)
- location (string, optional)
- startDateTime (ISO 8601 string, required)
- endDateTime (ISO 8601 string, required)
- attendees (array of email strings, optional)

Input: "${input}"

Return ONLY valid JSON, no other text.`,
        },
      ],
    });

    const jsonText = response.content[0].type === 'text' ? response.content[0].text : '';
    const eventData = JSON.parse(jsonText);

    const service = await this.getService(userId);

    const event = await service.createEvent('primary', {
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: { dateTime: eventData.startDateTime },
      end: { dateTime: eventData.endDateTime },
      attendees: eventData.attendees?.map((email: string) => ({ email })),
    });

    await this.trackAction(userId, 'calendar', 'create_event', event.id);

    return event;
  }
}
