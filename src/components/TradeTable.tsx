import React, { useState } from "react";
import { BacktestResult, TradePosition } from "../types";
import "./TradeTable.css";

interface TradeTableProps {
  result: BacktestResult;
}

export const TradeTable: React.FC<TradeTableProps> = ({ result }) => {
  const { trades, stats } = result;
  const [expandedTrades, setExpandedTrades] = useState<{ [key: string]: boolean }>({});

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const formatProfit = (profit: number) => {
    return profit.toFixed(2);
  };

  const toggleTrade = (tradeId: string) => {
    setExpandedTrades((prev) => ({
      ...prev,
      [tradeId]: !prev[tradeId],
    }));
  };

  return (
    <div className="trade-table-container">
      <h2>Trading Performance</h2>
      <div className="stats-summary">
        <div className="stat-item">
          <label>Total Profit:</label>
          <span className={stats.totalProfit >= 0 ? "profit" : "loss"}>{formatProfit(stats.totalProfit)} USDT</span>
        </div>
        <div className="stat-item">
          <label>Win Rate:</label>
          <span>{(stats.winRate * 100).toFixed(1)}%</span>
        </div>
        <div className="stat-item">
          <label>Total Trades:</label>
          <span>{stats.totalTrades}</span>
        </div>
        <div className="stat-item">
          <label>Winning/Losing:</label>
          <span>
            {stats.winningTrades}/{stats.losingTrades}
          </span>
        </div>
        <div className="stat-item">
          <label>Max Drawdown:</label>
          <span className="loss">{formatProfit(stats.maxDrawdown)} USDT</span>
        </div>
        <div className="stat-item">
          <label>Sharpe Ratio:</label>
          <span>{stats.sharpeRatio.toFixed(2)}</span>
        </div>
        <div className="stat-item">
          <label>Avg Profit:</label>
          <span className="profit">{formatProfit(stats.averageProfit)} USDT</span>
        </div>
        <div className="stat-item">
          <label>Avg Loss:</label>
          <span className="loss">{formatProfit(stats.averageLoss)} USDT</span>
        </div>
      </div>

      <h3>Trade History</h3>
      <div className="trades-container">
        {trades.map((trade: TradePosition, index: number) => (
          <div key={index} className="trade-section">
            <div className="trade-header" onClick={() => toggleTrade(`trade-${index}`)}>
              <div className="trade-summary">
                <span className={`trade-type ${trade.type.toLowerCase()}`}>{trade.type}</span>
                <span className="trade-timestamp">
                  {new Date(trade.openTimestamp).toLocaleString()} -{" "}
                  {trade.closeTimestamp ? new Date(trade.closeTimestamp).toLocaleString() : "Open"}
                </span>
                <span className={`trade-profit ${trade.profit && trade.profit >= 0 ? "profit" : "loss"}`}>
                  {trade.profit?.toFixed(2) || "-"} USDT ({trade.profitPercent?.toFixed(2) || "-"}%)
                </span>
              </div>
              <button className={`expand-button ${expandedTrades[`trade-${index}`] ? "expanded" : ""}`}>
                {expandedTrades[`trade-${index}`] ? "−" : "+"}
              </button>
            </div>

            {expandedTrades[`trade-${index}`] && (
              <div className="trade-details">
                <div className="trade-info">
                  <div className="info-group">
                    <label>Initial Entry:</label>
                    <span>{trade.entries[0].price.toFixed(2)} USDT</span>
                  </div>
                  <div className="info-group">
                    <label>Average Entry:</label>
                    <span>{trade.averageEntryPrice.toFixed(2)} USDT</span>
                  </div>
                  <div className="info-group">
                    <label>Position Size:</label>
                    <span>{trade.entries.reduce((sum, entry) => sum + entry.size, 0).toFixed(2)} USDT</span>
                  </div>
                  {trade.closePrice && (
                    <div className="info-group">
                      <label>Exit Price:</label>
                      <span>{trade.closePrice.toFixed(2)} USDT</span>
                    </div>
                  )}
                </div>

                <div className="trade-entries">
                  <h4>Entry History</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Price</th>
                        <th>Entry Size</th>
                        <th>Position Size</th>
                        <th>Break-even</th>
                        <th>Gap from BE</th>
                        <th>RSI</th>
                        <th>PnL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trade.entries.map((entry, entryIndex) => {
                        // Calculate cumulative position details up to this entry
                        const entriesUpToHere = trade.entries.slice(0, entryIndex + 1);
                        const currentPositionSize = entriesUpToHere.reduce((sum, e) => sum + e.size, 0);
                        const weightedSum = entriesUpToHere.reduce((sum, e) => sum + e.price * e.size, 0);
                        const avgEntry = weightedSum / currentPositionSize;
                        const gapFromAvg = ((entry.price - avgEntry) / avgEntry) * 100;

                        return (
                          <tr key={entryIndex}>
                            <td>{new Date(entry.timestamp).toLocaleString()}</td>
                            <td>{entry.price.toFixed(2)}</td>
                            <td>{entry.size.toFixed(2)}</td>
                            <td>{currentPositionSize.toFixed(2)}</td>
                            <td>{avgEntry.toFixed(2)}</td>
                            <td className={gapFromAvg >= 0 ? "profit" : "loss"}>{gapFromAvg.toFixed(2)}%</td>
                            <td>{entry.entryRsi.toFixed(2)}</td>
                            <td className={entry.pnl >= 0 ? "profit" : "loss"}>{entry.pnl.toFixed(2)} USDT</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
