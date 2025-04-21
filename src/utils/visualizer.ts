import { BacktestResult, TradePosition, TradeStats } from '../types';

/**
 * Utility class for formatting and displaying backtest results
 */
export class Visualizer {
  /**
   * Format backtest results into a readable text format
   */
  static formatBacktestResults(result: BacktestResult): string {
    const { config, trades, stats } = result;
    
    // Format configuration
    const configSection = this.formatConfiguration(config);
    
    // Format statistics
    const statsSection = this.formatStats(stats);
    
    // Format trades summary
    const tradesSection = this.formatTradesSummary(trades);
    
    return `
=== RSI Trading Strategy Backtest Results ===

${configSection}

${statsSection}

${tradesSection}
`;
  }

  /**
   * Format configuration settings
   */
  private static formatConfiguration(config: any): string {
    return `--- Strategy Configuration ---
Symbol: ${config.symbol}
Timeframe: ${config.timeframe}
Leverage: ${config.leverage}x
Long Entry RSI: <= ${config.longEntryRsi}
Long Exit RSI: >= ${config.longExitRsi}
Short Entry RSI: >= ${config.shortEntryRsi}
Short Exit RSI: <= ${config.shortExitRsi}
Break-Even Threshold: ${config.breakEvenThreshold}%`;
  }

  /**
   * Format statistics
   */
  private static formatStats(stats: TradeStats): string {
    return `--- Performance Statistics ---
Total Trades: ${stats.totalTrades}
Win Rate: ${stats.winRate.toFixed(2)}% (${stats.winningTrades} winning, ${stats.losingTrades} losing)
Total Profit: ${stats.totalProfit.toFixed(2)} USDT
Average Profit (winners): ${stats.averageProfit.toFixed(2)} USDT
Average Loss (losers): ${stats.averageLoss.toFixed(2)} USDT
Profit/Loss Ratio: ${stats.profitLossRatio.toFixed(2)}
Max Drawdown: ${stats.maxDrawdown.toFixed(2)}%
Sharpe Ratio: ${stats.sharpeRatio.toFixed(2)}
Max Consecutive Wins: ${stats.maxConsecutiveWins}
Max Consecutive Losses: ${stats.maxConsecutiveLosses}
Average Trade Length: ${stats.averageTradeLength.toFixed(2)} hours

--- Long Trades ---
Total Long Trades: ${stats.longTradeStats.totalTrades}
Long Win Rate: ${stats.longTradeStats.winRate.toFixed(2)}%
Long Total Profit: ${stats.longTradeStats.totalProfit.toFixed(2)} USDT

--- Short Trades ---
Total Short Trades: ${stats.shortTradeStats.totalTrades}
Short Win Rate: ${stats.shortTradeStats.winRate.toFixed(2)}%
Short Total Profit: ${stats.shortTradeStats.totalProfit.toFixed(2)} USDT`;
  }

  /**
   * Format trades summary
   */
  private static formatTradesSummary(trades: TradePosition[]): string {
    if (trades.length === 0) {
      return '--- Trades Summary ---\nNo trades executed during the backtest period.';
    }

    // Show recent trades
    const recentTrades = trades.slice(-5);
    const tradesOutput = recentTrades.map((trade, index) => {
      const openTime = new Date(trade.openTimestamp).toLocaleString();
      const closeTime = trade.closeTimestamp ? new Date(trade.closeTimestamp).toLocaleString() : 'Open';
      const entries = trade.entries.length;
      const profit = trade.profit ? `${trade.profit.toFixed(2)} USDT (${trade.profitPercent?.toFixed(2)}%)` : 'N/A';
      const result = trade.profit && trade.profit > 0 ? 'WIN' : 'LOSS';
      
      return `Trade #${trades.length - recentTrades.length + index + 1}: ${trade.type}
  Open: ${openTime} at ${trade.averageEntryPrice.toFixed(4)}
  Close: ${closeTime} ${trade.closePrice ? `at ${trade.closePrice.toFixed(4)}` : ''}
  Entries: ${entries}
  Result: ${result} (${profit})`;
    }).join('\n\n');

    return `--- Recent Trades (Last 5) ---
${tradesOutput}

Total Trades: ${trades.length}`;
  }

  /**
   * Format monthly performance summary
   */
  static formatMonthlyPerformance(result: BacktestResult): string {
    const { trades, equityCurve } = result;
    
    if (trades.length === 0) {
      return 'No trades to analyze for monthly performance.';
    }
    
    // Group trades by month
    const tradesByMonth: Record<string, TradePosition[]> = {};
    
    for (const trade of trades) {
      if (trade.closeTimestamp) {
        const date = new Date(trade.closeTimestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!tradesByMonth[monthKey]) {
          tradesByMonth[monthKey] = [];
        }
        
        tradesByMonth[monthKey].push(trade);
      }
    }
    
    // Calculate monthly statistics
    const monthlyStats: Array<{ 
      month: string, 
      trades: number, 
      winRate: number, 
      profit: number 
    }> = [];
    
    for (const [month, monthTrades] of Object.entries(tradesByMonth)) {
      const winningTrades = monthTrades.filter(trade => (trade.profit || 0) > 0).length;
      const totalProfit = monthTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0);
      
      monthlyStats.push({
        month,
        trades: monthTrades.length,
        winRate: monthTrades.length ? (winningTrades / monthTrades.length) * 100 : 0,
        profit: totalProfit
      });
    }
    
    // Sort by month
    monthlyStats.sort((a, b) => a.month.localeCompare(b.month));
    
    // Format the output
    const monthlyOutput = monthlyStats.map(stat => {
      const [year, month] = stat.month.split('-');
      const monthName = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleString('default', { month: 'long' });
      
      return `${monthName} ${year}: ${stat.trades} trades, ${stat.winRate.toFixed(2)}% win rate, ${stat.profit.toFixed(2)} USDT`;
    }).join('\n');
    
    return `--- Monthly Performance ---
${monthlyOutput}`;
  }
} 