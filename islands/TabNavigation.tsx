import { useState } from "preact/hooks";

type TabType = "events" | "leaderboard" | "results" | "members" | "admin";

export default function TabNavigation() {
  const [activeTab, setActiveTab] = useState<TabType>("events");

  const tabs: { id: TabType; label: string }[] = [
    { id: "events", label: "Eventos" },
    { id: "leaderboard", label: "Leaderboard" },
    { id: "results", label: "Resultados" },
    { id: "members", label: "Members" },
    { id: "admin", label: "Admin" },
  ];

  const handleTabClick = (tabId: TabType) => {
    setActiveTab(tabId);
    // Update content visibility
    tabs.forEach((tab) => {
      const element = document.getElementById(tab.id);
      if (element) {
        if (tab.id === tabId) {
          element.classList.add("active");
        } else {
          element.classList.remove("active");
        }
      }
    });
  };

  return (
    <nav class="nav">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          class={`tab ${activeTab === tab.id ? "active" : ""}`}
          onClick={() => handleTabClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
