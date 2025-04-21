import React from 'react';
import './ProgressLoader.css';

interface ProgressLoaderProps {
  mainCandlesProgress: number;
  subCandlesProgress: number;
  tradesProgress: number;
  stage: 'idle' | 'main-candles' | 'sub-candles' | 'trades' | 'complete';
  totalMainCandles: number;
  totalSubCandles: number;
  totalTrades: number;
}

export const ProgressLoader: React.FC<ProgressLoaderProps> = ({
  mainCandlesProgress,
  subCandlesProgress,
  tradesProgress,
  stage,
  totalMainCandles,
  totalSubCandles,
  totalTrades
}) => {
  const getStageText = () => {
    switch (stage) {
      case 'main-candles':
        return 'Fetching main candlestick data...';
      case 'sub-candles':
        return 'Fetching sub-candlestick data...';
      case 'trades':
        return 'Generating trades...';
      case 'complete':
        return 'Processing complete!';
      default:
        return 'Initializing...';
    }
  };

  const getProgress = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.min(100, Math.round((current / total) * 100));
  };

  return (
    <div className="progress-loader">
      <div className="progress-status">
        <h3>{getStageText()}</h3>
        
        <div className="progress-bars">
          <div className="progress-section">
            <div className="progress-label">
              <span>Main Candles</span>
              <span>{getProgress(mainCandlesProgress, totalMainCandles)}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${getProgress(mainCandlesProgress, totalMainCandles)}%`,
                  backgroundColor: stage === 'main-candles' ? '#4299e1' : '#48bb78'
                }}
              />
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-label">
              <span>Sub Candles</span>
              <span>{getProgress(subCandlesProgress, totalSubCandles)}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${getProgress(subCandlesProgress, totalSubCandles)}%`,
                  backgroundColor: stage === 'sub-candles' ? '#4299e1' : 
                                 stage === 'main-candles' ? '#e2e8f0' : '#48bb78'
                }}
              />
            </div>
          </div>

          <div className="progress-section">
            <div className="progress-label">
              <span>Trades</span>
              <span>{getProgress(tradesProgress, totalTrades)}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: `${getProgress(tradesProgress, totalTrades)}%`,
                  backgroundColor: stage === 'trades' ? '#4299e1' : 
                                 stage === 'complete' ? '#48bb78' : '#e2e8f0'
                }}
              />
            </div>
          </div>
        </div>

        {stage === 'complete' && (
          <div className="completion-message">
            <span className="checkmark">✓</span>
            Ready to display results
          </div>
        )}
      </div>
    </div>
  );
}; 