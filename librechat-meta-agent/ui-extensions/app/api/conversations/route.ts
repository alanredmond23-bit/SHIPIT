import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  model?: string;
  tokens_used?: number;
  metadata?: Record<string, unknown>;
}

interface Conversation {
  id: string;
  user_id: string | null;
  title: string;
  summary?: string;
  agent_type: string;
  model_used?: string;
  message_count: number;
  total_tokens: number;
  is_archived: boolean;
  is_pinned: boolean;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

// ============================================================================
// IN-MEMORY STORAGE (Replace with database in production)
// ============================================================================

// Global store - in production this would be PostgreSQL/Supabase
const conversationStore = new Map<string, Map<string, Conversation>>();

function getSessionId(request: NextRequest): string {
  const cookieStore = cookies();
  let sessionId = cookieStore.get('meta-agent-session')?.value;
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
}

function getUserConversations(sessionId: string): Map<string, Conversation> {
  if (!conversationStore.has(sessionId)) {
    conversationStore.set(sessionId, new Map());
  }
  return conversationStore.get(sessionId)!;
}

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateTitle(messages: Message[]): string {
  // Generate title from first user message
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    const content = firstUserMsg.content;
    // Truncate to first 50 chars or first sentence
    const title = content.split(/[.!?]/)[0].substring(0, 50);
    return title + (title.length < content.length ? '...' : '');
  }
  return 'New Conversation';
}

// ============================================================================
// GET - List all conversations or get single conversation
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const userConversations = getUserConversations(sessionId);
    const { searchParams } = new URL(request.url);

    const conversationId = searchParams.get('id');
    const archived = searchParams.get('archived') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get single conversation
    if (conversationId) {
      const conversation = userConversations.get(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ conversation });
    }

    // List all conversations
    const allConversations = Array.from(userConversations.values())
      .filter(c => c.is_archived === archived)
      .sort((a, b) => {
        // Pinned first, then by updated_at
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      })
      .slice(offset, offset + limit);

    return NextResponse.json({
      conversations: allConversations.map(c => ({
        ...c,
        messages: undefined, // Don't include messages in list view
        preview: c.messages[c.messages.length - 1]?.content.substring(0, 100),
      })),
      total: userConversations.size,
      hasMore: offset + limit < userConversations.size,
    }, {
      headers: {
        'Set-Cookie': `meta-agent-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Create new conversation or add message
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const userConversations = getUserConversations(sessionId);
    const body = await request.json();

    const { conversation_id, message, messages, title, agent_type = 'general' } = body;

    // Add message to existing conversation
    if (conversation_id && message) {
      const conversation = userConversations.get(conversation_id);
      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }

      const newMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: message.role,
        content: message.content,
        timestamp: new Date().toISOString(),
        model: message.model,
        tokens_used: message.tokens_used,
        metadata: message.metadata,
      };

      conversation.messages.push(newMessage);
      conversation.message_count = conversation.messages.length;
      conversation.total_tokens += message.tokens_used || 0;
      conversation.updated_at = new Date().toISOString();

      if (message.model) {
        conversation.model_used = message.model;
      }

      // Auto-update title if it's still default
      if (conversation.title === 'New Conversation' && conversation.messages.length >= 2) {
        conversation.title = generateTitle(conversation.messages);
      }

      userConversations.set(conversation_id, conversation);

      return NextResponse.json({
        success: true,
        conversation_id,
        message_id: newMessage.id,
      }, {
        headers: {
          'Set-Cookie': `meta-agent-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
        },
      });
    }

    // Create new conversation
    const newId = generateId();
    const initialMessages: Message[] = messages?.map((m: Message, i: number) => ({
      id: `msg_${Date.now()}_${i}`,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp || new Date().toISOString(),
      model: m.model,
      tokens_used: m.tokens_used,
    })) || [];

    const newConversation: Conversation = {
      id: newId,
      user_id: sessionId,
      title: title || generateTitle(initialMessages) || 'New Conversation',
      agent_type,
      model_used: initialMessages.find(m => m.model)?.model,
      message_count: initialMessages.length,
      total_tokens: initialMessages.reduce((sum, m) => sum + (m.tokens_used || 0), 0),
      is_archived: false,
      is_pinned: false,
      messages: initialMessages,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    userConversations.set(newId, newConversation);

    return NextResponse.json({
      success: true,
      conversation: newConversation,
    }, {
      status: 201,
      headers: {
        'Set-Cookie': `meta-agent-session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
      },
    });
  } catch (error) {
    console.error('Error creating/updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create/update conversation' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update conversation metadata
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const userConversations = getUserConversations(sessionId);
    const body = await request.json();

    const { conversation_id, title, is_archived, is_pinned, summary } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    const conversation = userConversations.get(conversation_id);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (title !== undefined) conversation.title = title;
    if (is_archived !== undefined) conversation.is_archived = is_archived;
    if (is_pinned !== undefined) conversation.is_pinned = is_pinned;
    if (summary !== undefined) conversation.summary = summary;
    conversation.updated_at = new Date().toISOString();

    userConversations.set(conversation_id, conversation);

    return NextResponse.json({
      success: true,
      conversation: {
        ...conversation,
        messages: undefined, // Don't return all messages on update
      },
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete conversation
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const userConversations = getUserConversations(sessionId);
    const { searchParams } = new URL(request.url);

    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!userConversations.has(conversationId)) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    userConversations.delete(conversationId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}
