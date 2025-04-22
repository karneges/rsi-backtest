import React from 'react';
import { BacktestResult, TradePosition } from '../types';
import './TradeTable.css';

interface TradeTableProps {
  result: BacktestResult;
}

export const TradeTable: React.FC<TradeTableProps> = ({ result }) => {
  const { trades, stats } = result;

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const formatProfit = (profit: number) => {
    return profit.toFixed(2);
  };

  return (
    <div className="trade-table-container">
      <h2>Trading Performance</h2>
      <div className="stats-summary">
        <div className="stat-item">
          <label>Total Profit:</label>
          <span className={stats.totalProfit >= 0 ? 'profit' : 'loss'}>
            {formatProfit(stats.totalProfit)} USDT
          </span>
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
          <span>{stats.winningTrades}/{stats.losingTrades}</span>
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
          <div key={index} className={`trade-card ${trade.type.toLowerCase()}`}>
            <div className="trade-header">
              <span className="trade-type">{trade.type}</span>
              <span className={`trade-status ${trade.status.toLowerCase()}`}>
                {trade.status}
              </span>
            </div>
            
            <div className="trade-entries">
              <h4>Position Summary</h4>
              <div className="position-summary">
                <div className="position-details">
                  <h5>Initial Entry</h5>
                  <div className="summary-item">
                    <label>Entry Price:</label>
                    <span>{formatPrice(trade.entries[0].price)}</span>
                  </div>
                  <div className="summary-item">
                    <label>Size:</label>
                    <span>{trade.entries[0].size}</span>
                  </div>
                </div>
                <div className="position-details">
                  <h5>Current Position</h5>
                  <div className="summary-item">
                    <label>Avg Entry:</label>
                    <span>{formatPrice(trade.averageEntryPrice)}</span>
                  </div>
                  <div className="summary-item">
                    <label>Total Size:</label>
                    <span>{trade.entries.reduce((sum, entry) => sum + entry.size, 0)}</span>
                  </div>
                  {trade.status === 'CLOSED' ? (
                    <div className="summary-item">
                      <label>Status:</label>
                      <span className={trade.profit! >= 0 ? 'profit' : 'loss'}>
                        CLOSED ({trade.profitPercent!.toFixed(2)}%)
                      </span>
                    </div>
                  ) : trade.status === 'NOT_COMPLETED' ? (
                    <div className="summary-item">
                      <label>Status:</label>
                      <span className="not-completed">NOT COMPLETED</span>
                    </div>
                  ) : (
                    <div className="summary-item">
                      <label>Status:</label>
                      <span className="open">OPEN</span>
                    </div>
                  )}
                </div>
              </div>

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
                    <th>PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {trade.entries.map((entry, entryIndex) => {
                    // Calculate cumulative position details up to this entry
                    const entriesUpToNow = trade.entries.slice(0, entryIndex + 1);
                    const currentPositionSize = entriesUpToNow.reduce((sum, e) => sum + e.size, 0);
                    const currentAvgEntry = entriesUpToNow.reduce((sum, e) => sum + (e.price * e.size), 0) / currentPositionSize;
                    
                    // Break-even is the same as average entry for both LONG and SHORT
                    const breakEvenPrice = currentAvgEntry;
                    
                    // Calculate gap from break-even instead of average
                    const priceGap = ((entry.price - breakEvenPrice) / breakEvenPrice * 100);
                    // For LONG: positive when entry is below BE (good), negative when above (bad)
                    // For SHORT: positive when entry is above BE (good), negative when below (bad)
                    const isPositiveGap = trade.type === 'LONG' ? priceGap < 0 : priceGap > 0;
                    
                    return (
                      <tr key={entryIndex}>
                        <td>{formatTimestamp(entry.timestamp)}</td>
                        <td>{formatPrice(entry.price)}</td>
                        <td>{entry.size}</td>
                        <td>{currentPositionSize}</td>
                        <td>{formatPrice(breakEvenPrice)}</td>
                        <td className={isPositiveGap ? 'profit' : 'loss'}>
                          {priceGap.toFixed(2)}%
                        </td>
                        <td className={entry.pnl >= 0 ? 'profit' : 'loss'}>
                          {formatProfit(entry.pnl)} USDT
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {trade.closeTimestamp && (
              <div className="trade-exit">
                <h4>Exit</h4>
                <table>
                  <tbody>
                    <tr>
                      <td>Time:</td>
                      <td>{formatTimestamp(trade.closeTimestamp)}</td>
                    </tr>
                    <tr>
                      <td>Price:</td>
                      <td>{formatPrice(trade.closePrice!)}</td>
                    </tr>
                    <tr>
                      <td>Profit:</td>
                      <td className={trade.profit! >= 0 ? 'profit' : 'loss'}>
                        {formatProfit(trade.profit!)} USDT ({trade.profitPercent!.toFixed(2)}%)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 