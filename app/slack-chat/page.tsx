// In any page, e.g., /pages/index.tsx

import type { NextPage } from 'next';
import Component from './Component';

const ChatPage: NextPage = () => {
  return (
    <div>
      <Component />
    </div>
  );
};

export default ChatPage;