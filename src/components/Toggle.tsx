// components/Toggle.tsx
'use client';

import React from 'react';
import { DataSourceType } from '../core/BaseFetcher';

interface ToggleProps {
  onToggleMode: (isServer: boolean) => void;
  onChangeDataSource: (dataSource: DataSourceType) => void;
  isServer: boolean;
  dataSource: DataSourceType;
}

export function Toggle({ onToggleMode, onChangeDataSource, isServer, dataSource }: ToggleProps) {
  return (
    <div className="toggle-container">
      <div className="mode-toggle">
        <h3>Fetch Mode:</h3>
        <div className="toggle-buttons">
          <button 
            className={isServer ? 'active' : ''} 
            onClick={() => onToggleMode(true)}
          >
            Server-side
          </button>
          <button 
            className={!isServer ? 'active' : ''} 
            onClick={() => onToggleMode(false)}
          >
            Client-side
          </button>
        </div>
      </div>
      
      <div className="data-source-toggle">
        <h3>Data Source:</h3>
        <select 
          value={dataSource} 
          onChange={(e) => onChangeDataSource(e.target.value as DataSourceType)}
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="txt">TXT</option>
          <option value="api">API</option>
        </select>
      </div>
    </div>
  );
}