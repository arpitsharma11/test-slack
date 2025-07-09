// /pages/slack-chat.tsx

import type { NextPage } from 'next';
import { useEffect, useState, FormEvent } from 'react';

type Channel = {
  id: string;
  name: string;
};

type Message = {
  ts: string;
  user: string;
  text: string;
};

const SlackChatPage: NextPage = () => {
  // State for channels
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(true);
  const [channelsError, setChannelsError] = useState<string | null>(null);

  // State for messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // NEW: State for the message input
  const [newMessage, setNewMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  useEffect(() => {
    // Fetch channels on initial load (code is unchanged)
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

  const handleChannelSelect = async (channelId: string) => {
    // Select channel and fetch history (code is unchanged)
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

  // NEW: Handler to send a message
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChannel || isSending) return;

    setIsSending(true);

    try {
      const response = await fetch('/api/slack/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: selectedChannel.id,
          text: newMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const sentMessage: Message = await response.json();
      
      // Optimistically add the new message to the UI
      setMessages(prevMessages => [...prevMessages, sentMessage]);
      setNewMessage(''); // Clear the input field

    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      alert(`Error sending message: ${error.message}`); // Simple error feedback
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', color: '#333' }}>
      <aside style={{ width: '250px', backgroundColor: '#f8f8f8', borderRight: '1px solid #ddd', padding: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Slack Channels</h2>
        {/* Channel list JSX is unchanged */}
        {isLoadingChannels ? <p>Loading channels...</p> : null}
        {channelsError ? <p style={{ color: 'red' }}>Error: {channelsError}</p> : null}
        <ul style={{ padding: 0, margin: 0 }}>
          {channels.map(channel => (
            <li key={channel.id} onClick={() => handleChannelSelect(channel.id)} style={{ listStyle: 'none', padding: '8px', cursor: 'pointer', borderRadius: '4px', fontWeight: channel.id === selectedChannel?.id ? 'bold' : 'normal', backgroundColor: channel.id === selectedChannel?.id ? '#e0e0e0' : 'transparent' }}>
              # {channel.name}
            </li>
          ))}
        </ul>
      </aside>

      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', maxHeight: '100vh' }}>
        <header style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '20px', flexShrink: 0 }}>
          <h1>{selectedChannel ? `# ${selectedChannel.name}` : 'Slack Integration'}</h1>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px' }}>
          {/* Message display logic is unchanged */}
          {!selectedChannel ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <p style={{ color: '#888', fontSize: '1.1rem' }}>Please select a channel to view messages.</p>
            </div>
          ) : isLoadingMessages ? (
            <p>Loading messages...</p>
          ) : messagesError ? (
            <p style={{ color: 'red' }}>Error: {messagesError}</p>
          ) : messages.length === 0 ? (
            <p>No messages in this channel. Be the first to post!</p>
          ) : (
            <div>
              {messages.map(msg => (
                <div key={msg.ts} style={{ marginBottom: '12px' }}>
                  <strong style={{ display: 'block', fontSize: '0.9rem' }}>{msg.user}</strong>
                  <p style={{ margin: '4px 0' }}>{msg.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEW: Message Input Form */}
        {selectedChannel && (
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${selectedChannel.name}`}
              disabled={isSending}
              style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
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