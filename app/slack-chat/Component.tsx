// /app/slack-chat/Component.tsx
"use client";

import type { NextPage } from 'next';
import { useEffect, useState, FormEvent, useRef } from 'react';

// Define our data shapes
type Channel = { id: string; name: string };
type Message = { ts: string; user: string; text: string };
type User = { id: string; name: string; avatar: string };

// This new component is responsible for rendering a single message.
// It fetches the user info for its message and displays it.
const MessageItem = ({ message, usersCache, setUsersCache }: {
  message: Message;
  usersCache: Record<string, User>;
  setUsersCache: React.Dispatch<React.SetStateAction<Record<string, User>>>;
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      // Check client-side cache first
      if (usersCache[message.user]) {
        setUser(usersCache[message.user]);
        return;
      }
      // If not in cache, fetch from our API
      try {
        const response = await fetch(`/api/slack/user?userId=${message.user}`);
        if (response.ok) {
          const userData: User = await response.json();
          setUsersCache(prev => ({ ...prev, [message.user]: userData }));
          setUser(userData);
        } else {
          // Handle cases where user lookup might fail
          setUser({ id: message.user, name: 'Unknown User', avatar: '' });
        }
      } catch (error) {
        console.error("Failed to fetch user", error);
        setUser({ id: message.user, name: 'Unknown User', avatar: '' });
      }
    };
    fetchUser();
  }, [message.user, usersCache, setUsersCache]);

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
      <img 
        src={user?.avatar || 'https://via.placeholder.com/40'} // Fallback avatar
        alt={user?.name || 'Avatar'}
        width={40}
        height={40}
        style={{ borderRadius: '5px' }}
      />
      <div>
        <strong style={{ display: 'block', fontSize: '0.9rem' }}>
          {user ? user.name : 'Loading...'}
        </strong>
        <p style={{ margin: '4px 0' }}>{message.text}</p>
      </div>
    </div>
  );
};


const SlackChatPage: NextPage = () => {
  // State variables
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // NEW: Client-side cache for user objects to prevent re-fetching
  const [usersCache, setUsersCache] = useState<Record<string, User>>({});

  // Refs for real-time connection and auto-scrolling
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to the bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // All other useEffects and handlers remain the same...
  useEffect(() => { /* Fetch channels */
    const fetchChannels = async () => {
      try {
        const response = await fetch('/api/slack/channels');
        if (!response.ok) throw new Error('Failed to fetch channels');
        const data: Channel[] = await response.json();
        setChannels(data);
      } catch (err: any) { setChannelsError(err.message); } finally { setIsLoadingChannels(false); }
    };
    fetchChannels();
  }, []);

  useEffect(() => { /* Manage SSE connection */
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

  const handleChannelSelect = async (channelId: string) => { /* Fetch history */
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
    } catch (err: any) { setMessagesError(err.message); } finally { setIsLoadingMessages(false); }
  };

  const handleSendMessage = async (e: FormEvent) => { /* Send message */
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel || isSending) return;
    setIsSending(true);
    try {
      const response = await fetch('/api/slack/message', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: selectedChannel.id, text: newMessage }),
      });
      if (!response.ok) {
        const errorData = await response.json(); throw new Error(errorData.error || 'Failed to send message');
      }
      setNewMessage('');
    } catch (error: any) { alert(`Error sending message: ${error.message}`); } finally { setIsSending(false); }
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

      {/* UI CHANGE: Added dark grey background to the main chat area */}
      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '100vh', backgroundColor: '#282828' }}>
        <header style={{ borderBottom: '1px solid #444', paddingBottom: '10px', marginBottom: '20px', flexShrink: 0 }}>
          <h1>{selectedChannel ? `# ${selectedChannel.name}` : 'Slack Integration'}</h1>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
          {isLoadingMessages && <p>Loading messages...</p>}
          {messagesError && <p style={{ color: 'red' }}>Error: {messagesError}</p>}
          
          {/* RENDER CHANGE: Use the new MessageItem component */}
          {messages.map(msg => (
            <MessageItem key={msg.ts} message={msg} usersCache={usersCache} setUsersCache={setUsersCache} />
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