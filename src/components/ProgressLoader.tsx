import React from "react";
import "./ProgressLoader.css";

interface ProgressLoaderProps {
  mainCandlesProgress: number;
  subCandlesProgress: number;
  tradesProgress: number;
  stage: "idle" | "main-candles" | "sub-candles" | "trades" | "processing" | "complete";
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
  totalTrades,
}) => {
  const getStageText = () => {
    switch (stage) {
      case "main-candles":
        return `Fetching main candlesticks (${mainCandlesProgress}/${totalMainCandles})...`;
      case "sub-candles":
        return `Fetching sub candlesticks (${subCandlesProgress}/${totalSubCandles})...`;
      case "trades":
        return `Generating trades (${tradesProgress}/${totalTrades})...`;
      case "processing":
        return "Processing data in background...";
      case "complete":
        return "Complete!";
      default:
        return "Preparing...";
    }
  };

  const getProgress = () => {
    switch (stage) {
      case "main-candles":
        return (mainCandlesProgress / totalMainCandles) * 100;
      case "sub-candles":
        return (subCandlesProgress / totalSubCandles) * 100;
      case "trades":
        return (tradesProgress / totalTrades) * 100;
      case "processing":
        return 100; // Show full progress bar during processing
      case "complete":
        return 100;
      default:
        return 0;
    }
  };

  return (
    <div className="progress-loader">
      <div className="progress-text">{getStageText()}</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${getProgress()}%` }} />
      </div>
    </div>
  );
};
