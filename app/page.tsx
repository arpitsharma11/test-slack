// In any page, e.g., /pages/index.tsx

import type { NextPage } from 'next';

const ConnectPage: NextPage = () => {
  return (
    <div>
      <h1>Integrate with Slack</h1>
      <p>Connect your account to read and send messages.</p>
      <a href="/api/slack/connect">
        <img
          alt="Add to Slack"
          height="40"
          width="139"
          src="https://platform.slack-edge.com/img/add_to_slack.png"
          srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
        />
      </a>
    </div>
  );
};

export default ConnectPage;