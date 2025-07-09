// /pages/slack-chat.tsx
"use client"
import type { NextPage } from 'next';
import { useEffect, useState } from 'react';

// This type definition should match the one in our API route
type Channel = {
  id: string;
  name: string;
};

const SlackChatPage: NextPage = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // This effect runs once when the component mounts
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        // Call our own backend API route
        const response = await fetch('/api/slack/channels');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch channels');
        }
        const data: Channel[] = await response.json();
        setChannels(data);
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, []); // Empty dependency array means this runs only once on mount

  const renderChannelList = () => {
    if (isLoading) {
      return <p>Loading channels...</p>;
    }
    if (error) {
      return <p style={{ color: 'red' }}>Error: {error}</p>;
    }
    if (channels.length === 0) {
      return <p>No channels found.</p>;
    }
    return (
      <ul>
        {channels.map(channel => (
          <li key={channel.id} style={{ listStyle: 'none', padding: '8px 0', cursor: 'pointer' }}>
            # {channel.name}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', color: '#333' }}>
      {/* Left Sidebar for Channels */}
      <aside style={{ width: '250px', backgroundColor: '#f8f8f8', borderRight: '1px solid #ddd', padding: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Slack Channels</h2>
        {renderChannelList()}
      </aside>

      {/* Main Chat Area */}
      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
          Slack Integration
        </h1>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#888', fontSize: '1.1rem' }}>
            {channels.length > 0 ? 'Select a channel to get started.' : 'Awaiting channel list...'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default SlackChatPage;