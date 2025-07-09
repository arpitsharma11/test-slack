"use client";

// /pages/slack-chat.tsx

import type { NextPage } from 'next';
import { useEffect, useState } from 'react';

// This is a placeholder for now. We will fetch real channels later.
const DUMMY_CHANNELS = [
  { id: 'C0949RER6Q4', name: 'general' }
];

const SlackChatPage: NextPage = () => {
  // We will replace this with a real loading state later
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching data after the page loads
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer); // Cleanup timer on component unmount
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', color: '#333' }}>
      {/* Left Sidebar for Channels */}
      <aside style={{ width: '250px', backgroundColor: '#f8f8f8', borderRight: '1px solid #ddd', padding: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Slack Channels</h2>
        {isLoading ? (
          <p>Loading channels...</p>
        ) : (
          <ul>
            {DUMMY_CHANNELS.map(channel => (
              <li key={channel.id} style={{ listStyle: 'none', padding: '8px 0', cursor: 'pointer' }}>
                # {channel.name}
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main Chat Area */}
      <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
          Slack Integration
        </h1>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#888', fontSize: '1.1rem' }}>
            ✅ Authentication successful! Select a channel to view messages.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SlackChatPage;