import React from 'react';
import './SegmentedTabs.css';

function SegmentedTabs({ tabs, activeTab, onTabChange }) {
  return (
    <div className="segmented-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`segmented-tab ${activeTab === tab.key ? 'active' : ''}`}
          onClick={() => onTabChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedTabs;
