import React, { useState, useRef, useCallback } from "react";
import { VariableSizeList as List } from "react-window";
import { BacktestResult, TradePosition } from "../types";
import "./TradeTable.css";

interface TradeTableProps {
  result: BacktestResult;
}

export const TradeTable: React.FC<TradeTableProps> = ({ result }) => {
  const { trades, stats } = result;
  const [expandedTrades, setExpandedTrades] = useState<{ [key: string]: boolean }>({});
  const listRef = useRef<List>(null);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const formatProfit = (profit: number) => {
    return profit.toFixed(2);
  };

  const getItemSize = useCallback(
    (index: number) => {
      const trade = trades[index];
      const isExpanded = expandedTrades[`trade-${index}`];
      // Base height for collapsed state
      let height = 70;
      if (isExpanded) {
        // Add height for expanded details
        height += 220;
        // Add height for entries table
        height += trade.entries.length * 52;
      }
      console.log(height);

      return height;
    },
    [trades, expandedTrades],
  );

  const toggleTrade = (tradeId: string) => {
    setExpandedTrades((prev) => {
      const newState = {
        ...prev,
        [tradeId]: !prev[tradeId],
      };
      // Reset the list to recalculate item sizes
      setTimeout(() => {
        listRef.current?.resetAfterIndex(0);
      }, 0);
      return newState;
    });
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const trade = trades[index];
    return (
      <div style={style}>
        <div className="trade-section">
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
                      const entriesUpToHere = trade.entries.slice(0, entryIndex + 1);
                      const currentPositionSize = entriesUpToHere.reduce((sum, e) => sum + e.size, 0);
                      const gapFromAvg = ((entry.price - entry.breakevenPrice) / entry.breakevenPrice) * 100;

                      return (
                        <tr key={entryIndex}>
                          <td>{new Date(entry.timestamp).toLocaleString()}</td>
                          <td>{entry.price.toFixed(8)}</td>
                          <td>{entry.size.toFixed(2)}</td>
                          <td>{currentPositionSize.toFixed(2)}</td>
                          <td>{entry.breakevenPrice.toFixed(8)}</td>
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
      </div>
    );
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
        <List ref={listRef} height={600} itemCount={trades.length} itemSize={getItemSize} width="100%">
          {Row}
        </List>
      </div>
    </div>
  );
};
