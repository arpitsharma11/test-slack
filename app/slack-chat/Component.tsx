// /app/slack-chat/Component.tsx
"use client";

import type { NextPage } from 'next';
import { useEffect, useState, FormEvent, useRef } from 'react';

// Define the shape of a message
type Message = { ts: string; user: string; text: string };

// --- Configuration ---
// The specific Slack channel to connect to.
const CHANNEL_ID = 'C095VAJLKS4';

// A user-friendly name for display purposes.
const CHANNEL_NAME = 'Approvals';
// --------------------


const SlackChatPage: NextPage = () => {
  // --- State Management ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // --- Refs ---
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- Effects ---
  // Effect to auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Effect to fetch initial history and set up the real-time connection on mount
  useEffect(() => {
    // 1. Fetch initial message history
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/slack/history?channel=${CHANNEL_ID}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch chat history.');
        }
        const history: Message[] = await response.json();
        setMessages(history.filter(msg => !msg.text.includes('has joined the channel')));
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();

    // 2. Set up Server-Sent Events (SSE) connection for real-time updates
    const eventSource = new EventSource(`/api/slack/stream?channel=${CHANNEL_ID}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      const newMessage: Message = JSON.parse(event.data);
      // Filter out 'user has joined' messages in real-time
      if (newMessage.text && !newMessage.text.includes('has joined the channel')) {
        setMessages(prev => prev.some(msg => msg.ts === newMessage.ts) ? prev : [...prev, newMessage]);
      }
    };

    eventSource.onerror = (err) => {
      console.error('EventSource failed:', err);
      setError('Connection to server lost. Please refresh.');
      eventSource.close();
    };

    // 3. Cleanup function to close the connection when the component unmounts
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []); // The empty dependency array ensures this runs only once on mount

  // --- Handlers ---
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/slack/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: CHANNEL_ID, text: newMessage }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      setNewMessage(''); // Clear input on success
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setError(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // --- Render Logic ---
  const renderContent = () => {
    if (isLoading) {
      return <div style={centerStyle}>Loading Conversation...</div>;
    }
    if (error) {
      return <div style={{ ...centerStyle, color: '#ff6b6b' }}>Error: {error}</div>;
    }
    return (
      <>
        {messages.map(msg => (
          <div key={msg.ts} style={messageBubbleStyle}>
            <strong style={userIdStyle}>{msg.user}</strong>
            <p style={messageTextStyle}>{msg.text}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </>
    );
  };
  
  return (
    <main style={mainContainerStyle}>
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Quote Approval Flow</h1>
        <p style={{ margin: '4px 0 0', color: '#999' }}>
          #{CHANNEL_NAME}
        </p>
      </header>

      <div style={chatWindowStyle}>
        {renderContent()}
      </div>

      <div style={formContainerStyle}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isSending}
            style={inputStyle}
          />
          <button type="submit" disabled={isSending || !newMessage.trim()} style={sendButtonStyle}>
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </main>
  );
};


// --- Inline Styles for a Beautiful UI ---

const mainContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: '#e0e0e0',
  backgroundColor: '#1c1c1e' // Dark grey background
};

const headerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderBottom: '1px solid #3a3a3c',
  flexShrink: 0,
  backgroundColor: '#2c2c2e',
};

const chatWindowStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '24px',
};

const formContainerStyle: React.CSSProperties = {
  padding: '16px 24px',
  borderTop: '1px solid #3a3a3c',
  backgroundColor: '#2c2c2e',
  flexShrink: 0
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '12px 16px',
  borderRadius: '8px',
  border: '1px solid #4a4a4c',
  backgroundColor: '#3a3a3c',
  color: '#e0e0e0',
  fontSize: '1rem',
};

const sendButtonStyle: React.CSSProperties = {
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#0a84ff', // A modern blue
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '1rem',
};

const messageBubbleStyle: React.CSSProperties = {
  marginBottom: '16px',
  padding: '12px 16px',
  backgroundColor: '#2c2c2e',
  borderRadius: '12px',
  maxWidth: '75%',
  wordWrap: 'break-word',
};

const userIdStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  color: '#8e8e93', // Lighter grey for user ID
  marginBottom: '4px',
};

const messageTextStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  lineHeight: '1.4',
};

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  color: '#8e8e93',
  fontSize: '1.1rem',
};

export default SlackChatPage;