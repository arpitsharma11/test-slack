"use client";

export default function ConnectSlackButton() {
  const handleConnectSlack = () => {
    console.log("Connect to Slack button clicked");
  };

  return (
    <button
      className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors text-lg font-semibold"
      onClick={handleConnectSlack}
    >
      Connect to Slack
    </button>
  );
}
