import React, { useState } from "react";
import { TradingTab } from "./TradingTab";
import { TradeConfig } from "../types";
import { OkxCandlesticksData } from "../types/okx.types";
import "./TabManager.css";

interface Tab {
  id: string;
  title: string;
  initialConfig?: Partial<TradeConfig>;
}

interface OkxCacheEntry {
  data: OkxCandlesticksData[];
  timeframe: string;
  timestamp: number;
  amountOfCandlesticks: number;
}

export const TabManager: React.FC = () => {
  const [tabs, setTabs] = useState<Tab[]>([{ id: "1", title: "Trading Tab 1" }]);
  const [activeTabId, setActiveTabId] = useState("1");
  const [okxCacheData, setOkxCacheData] = useState<{ [key: string]: OkxCacheEntry }>({});

  const addTab = () => {
    const newTabId = String(tabs.length + 1);
    setTabs([...tabs, { id: newTabId, title: `Trading Tab ${newTabId}` }]);
    setActiveTabId(newTabId);
  };

  const removeTab = (tabId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (tabs.length === 1) return; // Don't remove the last tab

    const newTabs = tabs.filter((tab) => tab.id !== tabId);
    setTabs(newTabs);

    // If we're removing the active tab, activate the previous tab
    if (activeTabId === tabId) {
      const index = tabs.findIndex((tab) => tab.id === tabId);
      const newActiveId = index === 0 ? newTabs[0].id : newTabs[index - 1].id;
      setActiveTabId(newActiveId);
    }
  };

  const handleCacheUpdate = (newCache: { [key: string]: OkxCacheEntry }) => {
    setOkxCacheData(newCache);
  };

  return (
    <div className="tab-manager">
      <div className="tab-bar">
        <div className="tabs">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab ${activeTabId === tab.id ? "active" : ""}`}
              onClick={() => setActiveTabId(tab.id)}
            >
              <span className="tab-title">{tab.title}</span>
              {tabs.length > 1 && (
                <button className="close-tab" onClick={(e) => removeTab(tab.id, e)}>
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="new-tab" onClick={addTab}>
          +
        </button>
      </div>
      <div className="tab-content">
        {tabs.map((tab) => (
          <div key={tab.id} className={`tab-panel ${activeTabId === tab.id ? "active" : ""}`}>
            <TradingTab
              initialConfig={tab.initialConfig}
              okxCacheData={okxCacheData}
              onCacheUpdate={handleCacheUpdate}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
