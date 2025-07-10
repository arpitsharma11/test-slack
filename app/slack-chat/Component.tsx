// /app/slack-chat/Component.tsx
"use client";

import type { NextPage } from 'next';
import { useEffect, useState, FormEvent, useRef } from 'react';

// Define our data shapes (User type is no longer needed)
type Channel = { id: string; name: string };
type Message = { ts: string; user: string; text: string };

const SlackChatPage: NextPage = () => {
  // State variables (usersCache is removed)
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Refs for real-time connection and auto-scrolling
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch channels on initial load
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch('/api/slack/channels');
        if (!response.ok) throw new Error('Failed to fetch channels');
        const data: Channel[] = await response.json();
        setChannels(data);
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        setChannelsError(err.message);
      } finally {
        setIsLoadingChannels(false);
      }
    };
    fetchChannels();
  }, []);

  // Manage SSE connection
  useEffect(() => {
    if (eventSourceRef.current) eventSourceRef.current.close();
    if (selectedChannel) {
      const eventSource = new EventSource(`/api/slack/stream?channel=${selectedChannel.id}`);
      eventSourceRef.current = eventSource;
      eventSource.onmessage = (event) => {
        const newMessage: Message = JSON.parse(event.data);
        setMessages(prev => prev.some(msg => msg.ts === newMessage.ts) ? prev : [...prev, newMessage]);
      };
      eventSource.onerror = (err) => { console.error('EventSource failed:', err); eventSource.close(); };
    }
    return () => { if (eventSourceRef.current) eventSourceRef.current.close(); };
  }, [selectedChannel]);

  // Fetch history when a channel is selected
  const handleChannelSelect = async (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (!channel || channel.id === selectedChannel?.id) return;
    setSelectedChannel(channel);
    setIsLoadingMessages(true);
    setMessages([]);
    setMessagesError(null);
    try {
      const response = await fetch(`/api/slack/history?channel=${channelId}`);
      if (!response.ok) throw new Error('Failed to fetch history');
      const history: Message[] = await response.json();
      setMessages(history);
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setMessagesError(err.message);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Send a new message
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel || isSending) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/slack/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel.id, text: newMessage }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }
      setNewMessage('');
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      alert(`Error sending message: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', color: '#f0f0f0' }}>
      <aside style={{ width: '250px', backgroundColor: '#f8f8f8', borderRight: '1px solid #ddd', padding: '20px', color: '#333' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Slack Channels</h2>
        {isLoadingChannels && <p>Loading channels...</p>}
        {channelsError && <p style={{ color: 'red' }}>Error: {channelsError}</p>}
        <ul style={{ padding: 0, margin: 0 }}>
          {channels.map(channel => (
            <li key={channel.id} onClick={() => handleChannelSelect(channel.id)} style={{ listStyle: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: channel.id === selectedChannel?.id ? 'bold' : 'normal', backgroundColor: channel.id === selectedChannel?.id ? '#e0e0e0' : 'transparent' }}>
              # {channel.name}
            </li>
          ))}
        </ul>
      </aside>

      {/* UI CHANGE: Applying dark grey theme to the main chat area */}
      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '100vh', backgroundColor: '#282828' }}>
        <header style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '20px', flexShrink: 0 }}>
          <h1>{selectedChannel ? `# ${selectedChannel.name}` : 'Slack Integration'}</h1>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
          {isLoadingMessages && <p>Loading messages...</p>}
          {messagesError && <p style={{ color: 'red' }}>Error: {messagesError}</p>}
          
          {/* LOGIC REVERTED: Directly rendering messages with user ID */}
          {messages.map(msg => (
            <div key={msg.ts} style={{ marginBottom: '12px' }}>
              <strong style={{ display: 'block', fontSize: '0.9rem', color: '#888' }}>
                {msg.user}
              </strong>
              <p style={{ margin: '4px 0' }}>{msg.text}</p>
            </div>
          ))}

          {/* This empty div is the target for auto-scrolling */}
          <div ref={messagesEndRef} />
        </div>

        {selectedChannel && (
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${selectedChannel.name}`}
              disabled={isSending}
              style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #555', backgroundColor: '#3c3c3c', color: '#f0f0f0' }}
            />
            <button type="submit" disabled={isSending || !newMessage.trim()} style={{ padding: '10px 20px', borderRadius: '5px', border: 'none', backgroundColor: '#007a5a', color: 'white', cursor: 'pointer' }}>
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};

export default SlackChatPage;