import { BacktestResult, TradeConfig, TradePosition, TradeStats } from "../types";

import { CandlestickWithSubCandlesticksAndRsi } from "../types/okx.types";

export class RsiTradeBasedModel {
  private config: TradeConfig;

  private candlesWithTrades: CandlestickWithSubCandlesticksAndRsi[] = [];

  private positionTrades: TradePosition[] = [];
  private currentPosition: TradePosition | null = null;
  private initialCapital: number;
  private currentCapital: number;
  private equityCurve: { timestamp: number; equity: number }[] = [];
  private lastProcessedPrice: number = 0;

  constructor(config: TradeConfig, candles: CandlestickWithSubCandlesticksAndRsi[], initialCapital: number = 10000) {
    this.config = config;
    this.initialCapital = initialCapital;
    this.currentCapital = initialCapital;
    debugger;
    // Convert candles to the candlesWithTrades format
    this.candlesWithTrades = candles;
  }

  /**
   * Run backtest using trade data for more accurate price movement simulation
   */
  async runTradeBasedBacktest(): Promise<BacktestResult> {
    // Check if we have trades to work with

    // Check if we have a reasonable distribution of trades
    const candlesWithTradesCount = this.candlesWithTrades.filter((c) => c.trades.length > 0).length;

    // Initialize metrics
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let peakEquity = this.initialCapital;

    // Default RSI period if not specified in config
    const rsiPeriod = 14;

    // Get start and end times from the first and last candles
    const startTime = this.candlesWithTrades[0].timestamp;
    const endTime = this.candlesWithTrades[this.candlesWithTrades.length - 1].timestamp;

    // // Save initial equity point
    // this.equityCurve.push({
    //   timestamp: this.candles[rsiPeriod].timestamp,
    //   equity: this.initialCapital,
    // });

    // Process each candle
    for (let i = rsiPeriod; i < this.candlesWithTrades.length; i++) {
      const candle = this.candlesWithTrades[i];

      // If this candle has trades, process them
      if (candle.trades.length > 0) {
        // Sort trades by timestamp to process them in order
        const sortedTrades = [...candle.trades].sort((a, b) => a.timestamp - b.timestamp);

        for (const trade of sortedTrades) {
          // Process the trade by checking positions
          this.checkClosePositions(trade.price, trade.rsi!, trade.timestamp, trade.atr!);
          this.checkOpenPositions(trade.price, trade.rsi!, trade.timestamp, trade.atr!);

          // Update equity curve after processing each trade
          this.updateEquityCurve(trade.price, trade.timestamp);

          // Calculate drawdown
          if (this.currentCapital > peakEquity) {
            peakEquity = this.currentCapital;
            currentDrawdown = 0;
          } else {
            currentDrawdown = ((peakEquity - this.currentCapital) / peakEquity) * 100;
            if (currentDrawdown > maxDrawdown) {
              maxDrawdown = currentDrawdown;
            }
          }
        }
      } else {
        // For candles without trades, use the candle's closing price
        this.checkClosePositions(candle.closePrice, candle.rsi!, candle.timestamp, candle.atr!);
        this.checkOpenPositions(candle.closePrice, candle.rsi!, candle.timestamp, candle.atr!);

        // Update equity curve
        this.updateEquityCurve(candle.closePrice, candle.timestamp);

        // Calculate drawdown
        if (this.currentCapital > peakEquity) {
          peakEquity = this.currentCapital;
          currentDrawdown = 0;
        } else {
          currentDrawdown = ((peakEquity - this.currentCapital) / peakEquity) * 100;
          if (currentDrawdown > maxDrawdown) {
            maxDrawdown = currentDrawdown;
          }
        }
      }
    }

    // Close any open position at the end of the test
    if (this.currentPosition) {
      const lastPrice = this.lastProcessedPrice;
      const lastCandle = this.candlesWithTrades[this.candlesWithTrades.length - 1];

      // Check if we have remaining trades or if this is the end of data
      if (lastCandle.trades.length === 0) {
        // No more trades available, mark as NOT_COMPLETED
        this.currentPosition.status = "NOT_COMPLETED";
        this.positionTrades.push({ ...this.currentPosition });
        this.currentPosition = null;
      } else {
        // Close the position normally if we have trades
        this.closePosition(lastPrice, lastCandle.timestamp, lastCandle.rsi!, lastCandle.atr!);
      }
    }
    this.positionTrades = this.positionTrades.filter((t) => {
      if (!t.closeTimestamp) {
        return true;
      }
      const timeDiff = t.closeTimestamp - t.openTimestamp;
      return timeDiff > 1000 * 60 * 15;
    });

    // Calculate statistics
    const stats = this.calculateStats();

    return {
      config: this.config,
      trades: this.positionTrades,
      stats,
      equityCurve: this.equityCurve,
      startTime,
      endTime,
    };
  }

  /**
   * Check if we should close current position based on RSI and minimum profit
   */
  private checkClosePositions(price: number, rsi: number, timestamp: number, atr: number): void {
    if (!this.currentPosition) return;

    const { type, averageEntryPrice, currentSize } = this.currentPosition;
    const addPositionSize = this.config.addPositionSize ?? this.config.fixedPositionSize / 2; // Default to half of initial size

    // Calculate profit in USDT
    let profit = 0;
    if (type === "LONG") {
      profit = (currentSize * (price - averageEntryPrice)) / averageEntryPrice;
    } else {
      // SHORT
      profit = (currentSize * (averageEntryPrice - price)) / averageEntryPrice;
    }

    // Calculate profit percentage relative to position size
    const profitPercent = (profit / currentSize) * 100;

    // Get minimum profit percentage from config (default to 1% if not specified)
    const minProfitPercent = this.config.minProfitPercent ?? 1.0;

    // Check exit conditions: RSI exit signal AND minimum profit achieved
    const rsiExitSignal =
      (type === "LONG" && rsi >= this.config.longExitRsi) || (type === "SHORT" && rsi <= this.config.shortExitRsi);

    const isReadyToClose = this.config.closeStrategy === "rsi" ? rsiExitSignal : profitPercent >= minProfitPercent;

    if (isReadyToClose) {
      // Only close if profit is at least the minimum required
      if (profitPercent >= minProfitPercent) {
        console.log(
          `Closing ${type} position at ${price}, RSI: ${rsi.toFixed(2)}, Profit: ${profit.toFixed(
            2,
          )} USDT (${profitPercent.toFixed(2)}%), Minimum required: ${minProfitPercent}%`,
        );
        this.closePosition(price, timestamp, rsi, atr);
      } else {
        // If we have an exit signal but insufficient profit, add to position instead (if we have capital)
        if (this.currentCapital >= addPositionSize / this.config.leverage && profitPercent < 0) {
          // Only add to LONG positions if RSI is below 50
          // Only add to SHORT positions if RSI is above 50
          const rsiConditionMet = (type === "LONG" && rsi <= 50) || (type === "SHORT" && rsi >= 50);

          if (rsiConditionMet) {
            console.log(`Instead of closing at a loss, adding ${addPositionSize} USDT to ${type} position at ${price}`);
            this.averagePosition(price, addPositionSize, timestamp, rsi, atr);
          } else {
            console.log(
              `Not adding to ${type} position because RSI ${rsi.toFixed(2)} is not favorable (need ${
                type === "LONG" ? "<= 50" : ">= 50"
              })`,
            );
          }
        }
      }
    }
  }

  /**
   * Check if we should open new position or average down existing position
   */
  private checkOpenPositions(price: number, rsi: number, timestamp: number, atr: number): void {
    debugger;
    // Get fixed position size from config (default to 10 if not specified)
    const fixedPositionSize = this.config.fixedPositionSize ?? 10;
    const addPositionSize = this.config.addPositionSize ?? fixedPositionSize / 2; // Default to half of initial size

    // Check if we have enough capital for a new trade
    const availableCapital = this.currentCapital;

    // If we don't have an open position, check if we should open one
    if (!this.currentPosition) {
      // Check LONG entry condition
      if (rsi <= this.config.longEntryRsi && availableCapital >= fixedPositionSize) {
        console.log(`Opening LONG position, RSI ${rsi.toFixed(2)} <= ${this.config.longEntryRsi} threshold`);
        this.openPosition("LONG", price, fixedPositionSize, timestamp, rsi, atr); // Use fixed position size for initial entry
      }
      // Check SHORT entry condition
      else if (rsi >= this.config.shortEntryRsi && availableCapital >= fixedPositionSize) {
        console.log(`Opening SHORT position, RSI ${rsi.toFixed(2)} >= ${this.config.shortEntryRsi} threshold`);
        this.openPosition("SHORT", price, fixedPositionSize, timestamp, rsi, atr); // Use fixed position size for initial entry
      }
    }
    // If we have an open position, check if we should add to it
    else if (availableCapital >= addPositionSize) {
      // Check against addPositionSize instead
      const { type, averageEntryPrice, lastEntryTimestamp } = this.currentPosition;

      // Check time delay since last entry
      const timeSinceLastEntry = timestamp - lastEntryTimestamp;
      const readableTimeSinceLastEntry = (timeSinceLastEntry / 1000).toFixed(1) + "s";
      const readableRequiredDelay = (this.config.positionAddDelay / 1000).toFixed(1) + "s";
      const delayMet = timeSinceLastEntry >= this.config.positionAddDelay;

      // Calculate price gap from break-even
      const priceGapPercent = Math.abs(((price - averageEntryPrice) / averageEntryPrice) * 100);

      // Calculate current PNL
      let currentPnL = 0;
      if (type === "LONG") {
        currentPnL = (price - averageEntryPrice) * this.currentPosition.currentSize;
      } else {
        currentPnL = (averageEntryPrice - price) * this.currentPosition.currentSize;
      }

      let shouldAddPosition = false;
      let reasonToAdd = "";

      if (type === "LONG") {
        // For LONG positions:
        // 1. Gap must be > threshold
        // 2. Current RSI must be lower than open RSI (more oversold)
        // 3. Must be in loss
        if (priceGapPercent > this.config.breakEvenThreshold && rsi < this.currentPosition.openRsi && currentPnL < 0) {
          shouldAddPosition = true;
          reasonToAdd = `gap ${priceGapPercent.toFixed(2)}% > ${this.config.breakEvenThreshold}%, RSI ${rsi.toFixed(
            2,
          )} < ${this.currentPosition.openRsi} (open), PnL: ${currentPnL.toFixed(2)} USDT`;
        }
      } else {
        // For SHORT positions:
        // 1. Gap must be > threshold
        // 2. Current RSI must be higher than open RSI (more overbought)
        // 3. Must be in loss
        if (priceGapPercent > this.config.breakEvenThreshold && rsi > this.currentPosition.openRsi && currentPnL < 0) {
          shouldAddPosition = true;
          reasonToAdd = `gap ${priceGapPercent.toFixed(2)}% > ${this.config.breakEvenThreshold}%, RSI ${rsi.toFixed(
            2,
          )} > ${this.currentPosition.openRsi} (open), PnL: ${currentPnL.toFixed(2)} USDT`;
        }
      }

      // Execute position addition if conditions are met
      if (shouldAddPosition && delayMet) {
        this.averagePosition(price, addPositionSize, timestamp, rsi, atr); // Use addPositionSize instead
        console.log(
          `Adding to ${type} position at ${this.formatPrice(price)}, RSI: ${rsi.toFixed(
            2,
          )}, Adding: ${addPositionSize} USDT, Reason: ${reasonToAdd}, Time since last entry: ${readableTimeSinceLastEntry}`,
        );
      } else if (shouldAddPosition) {
        console.log(
          `Wanted to add to ${type} position but delay not met. Time since last entry: ${readableTimeSinceLastEntry}, required: ${readableRequiredDelay}`,
        );
      }
    }
  }

  /**
   * Open a new position
   */
  private openPosition(
    type: "LONG" | "SHORT",
    price: number,
    capital: number,
    timestamp: number,
    rsi: number,
    atr: number,
  ): void {
    // capital is already leveraged, so we don't multiply by leverage here
    // size will be in USDT
    const size = capital;

    this.currentPosition = {
      type,
      entries: [{ price, size, timestamp, entryRsi: rsi, pnl: 0, entryAtr: atr }],
      averageEntryPrice: price,
      currentSize: size,
      openTimestamp: timestamp,
      lastEntryTimestamp: timestamp,
      openRsi: rsi,
      status: "OPEN",
    };

    // Update current capital (divide capital by leverage to get required margin)
    this.currentCapital -= capital / this.config.leverage;

    console.log(`Opening ${type} position at ${price}, RSI: ${rsi}, Size: ${size.toFixed(2)} USDT`);
  }

  /**
   * Add to an existing position (averaging down or up)
   */
  private averagePosition(price: number, capital: number, timestamp: number, rsi: number, atr: number): void {
    if (!this.currentPosition) return;
    let profit = 0;

    // Check if we should limit averaging down for losing positions
    if (this.config.maxLossEntries > 0) {
      // Calculate current profit
      const { type, averageEntryPrice, currentSize } = this.currentPosition;

      if (type === "LONG") {
        profit = (currentSize * (price - averageEntryPrice)) / averageEntryPrice;
      } else {
        // SHORT
        profit = (currentSize * (averageEntryPrice - price)) / averageEntryPrice;
      }

      // If we're at a loss, check how many entries we already have
      if (profit < 0 && this.currentPosition.entries.length >= this.config.maxLossEntries + 1) {
        console.log(`Not adding to losing position - already at maximum entries (${this.config.maxLossEntries})`);
        return;
      }
    }

    // size will be in USDT
    const additionalSize = capital;

    // Add new entry to the position
    this.currentPosition.entries.push({
      price,
      size: additionalSize,
      timestamp,
      entryRsi: rsi,
      pnl: profit,
      entryAtr: atr,
    });

    // Update last entry timestamp for delay tracking
    this.currentPosition.lastEntryTimestamp = timestamp;

    // Recalculate average entry price (weighted by USDT size)
    const totalValue = this.currentPosition.entries.reduce((sum, entry) => sum + entry.size, 0);
    const weightedPrice = this.currentPosition.entries.reduce((sum, entry) => sum + entry.price * entry.size, 0);

    this.currentPosition.averageEntryPrice = weightedPrice / totalValue;
    this.currentPosition.currentSize += additionalSize;

    // Update current capital (divide capital by leverage to get required margin)
    this.currentCapital -= capital / this.config.leverage;
  }

  /**
   * Close the current position
   */
  private closePosition(price: number, timestamp: number, rsi: number, atr: number): void {
    if (!this.currentPosition) return;

    const { type, averageEntryPrice, currentSize } = this.currentPosition;

    // Calculate profit/loss in USDT
    let profit = 0;

    if (type === "LONG") {
      profit = (currentSize * (price - averageEntryPrice)) / averageEntryPrice;
    } else {
      // SHORT
      profit = (currentSize * (averageEntryPrice - price)) / averageEntryPrice;
    }

    // Calculate profit percentage relative to position size
    const profitPercent = (profit / currentSize) * 100;

    // Get minimum profit percentage from config (default to 1% if not specified)
    const minProfitPercent = this.config.minProfitPercent ?? 1.0;

    // Double-check that we're closing with a profit
    if (profitPercent < minProfitPercent) {
      console.log(`Not closing ${type} position - profit ${profitPercent.toFixed(2)}% < ${minProfitPercent}% minimum`);

      // If we have an exit signal but insufficient profit, add to position instead (if we have capital)
      const fixedPositionSize = this.config.fixedPositionSize ?? 10;
      if (this.currentCapital >= fixedPositionSize / this.config.leverage && profitPercent < 0) {
        // Only add to LONG positions if RSI is below 50
        // Only add to SHORT positions if RSI is above 50
        const rsiConditionMet = (type === "LONG" && rsi <= 50) || (type === "SHORT" && rsi >= 50);

        if (rsiConditionMet) {
          console.log(`Instead of closing at a loss, adding ${fixedPositionSize} USDT to ${type} position at ${price}`);
          this.averagePosition(price, fixedPositionSize, timestamp, rsi, atr);
        } else {
          console.log(
            `Not adding to ${type} position because RSI ${rsi.toFixed(2)} is not favorable (need ${
              type === "LONG" ? "<= 50" : ">= 50"
            })`,
          );
        }
      }

      return; // Don't close the position
    }

    // Update the trade with closing data
    this.currentPosition.closeTimestamp = timestamp;
    this.currentPosition.closePrice = price;
    this.currentPosition.closeRsi = rsi;
    this.currentPosition.profit = profit;
    this.currentPosition.profitPercent = profitPercent;
    this.currentPosition.status = "CLOSED";

    // Add to completed trades
    this.positionTrades.push({ ...this.currentPosition });

    // Return the margin back to capital plus profit
    this.currentCapital += currentSize / this.config.leverage + profit;

    console.log(
      `Closing ${type} position at ${price}, RSI: ${rsi.toFixed(2)}, Profit: ${profit.toFixed(
        2,
      )} USDT (${profitPercent.toFixed(2)}%)`,
    );

    // Reset current trade
    this.currentPosition = null;
  }

  /**
   * Update the equity curve with the current portfolio value
   */
  private updateEquityCurve(price: number, timestamp: number): void {
    let equity = this.currentCapital;

    // Add unrealized P&L if there's an open position
    if (this.currentPosition) {
      const { type, averageEntryPrice, currentSize } = this.currentPosition;

      let unrealizedPnL = 0;
      if (type === "LONG") {
        unrealizedPnL = (price - averageEntryPrice) * currentSize;
      } else {
        // SHORT
        unrealizedPnL = (averageEntryPrice - price) * currentSize;
      }

      // Add the position value + unrealized P&L
      const positionValue = this.currentPosition.entries.reduce((sum, entry) => sum + entry.price * entry.size, 0);

      equity += positionValue + unrealizedPnL;
    }

    // Only add equity points at unique timestamps
    const lastEquityPoint = this.equityCurve[this.equityCurve.length - 1];
    if (!lastEquityPoint || lastEquityPoint.timestamp !== timestamp) {
      this.equityCurve.push({
        timestamp,
        equity,
      });
    } else {
      // Update the existing equity point if timestamp is the same
      lastEquityPoint.equity = equity;
    }
  }

  /**
   * Calculate performance statistics
   */
  private calculateStats(): TradeStats {
    const winningTrades = this.positionTrades.filter((trade) => (trade.profit || 0) > 0);
    const losingTrades = this.positionTrades.filter((trade) => (trade.profit || 0) <= 0);

    // Calculate consecutive wins/losses
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let currentConsecutiveWins = 0;
    let currentConsecutiveLosses = 0;

    for (const trade of this.positionTrades) {
      if ((trade.profit || 0) > 0) {
        currentConsecutiveWins++;
        currentConsecutiveLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, currentConsecutiveWins);
      } else {
        currentConsecutiveLosses++;
        currentConsecutiveWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentConsecutiveLosses);
      }
    }

    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = this.initialCapital;

    for (const point of this.equityCurve) {
      if (point.equity > peak) {
        peak = point.equity;
      }

      const drawdown = ((peak - point.equity) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Calculate Sharpe ratio (simplified)
    const dailyReturns: number[] = [];

    // Group equity points by day
    const dailyEquity: Record<string, number> = {};

    for (const point of this.equityCurve) {
      const date = new Date(point.timestamp).toISOString().split("T")[0];
      dailyEquity[date] = point.equity;
    }

    // Calculate daily returns
    const dates = Object.keys(dailyEquity).sort();
    for (let i = 1; i < dates.length; i++) {
      const prevEquity = dailyEquity[dates[i - 1]];
      const currentEquity = dailyEquity[dates[i]];
      const dailyReturn = (currentEquity - prevEquity) / prevEquity;
      dailyReturns.push(dailyReturn);
    }

    const avgReturn = dailyReturns.length ? dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length : 0;

    const stdDev = dailyReturns.length
      ? Math.sqrt(dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / dailyReturns.length)
      : 0;

    const sharpeRatio = stdDev === 0 ? 0 : (avgReturn / stdDev) * Math.sqrt(365); // Annualized

    // Calculate average trade length
    const tradeLengths = this.positionTrades.map((trade) => {
      const openTime = trade.openTimestamp;
      const closeTime = trade.closeTimestamp || this.candlesWithTrades[this.candlesWithTrades.length - 1].timestamp;
      return (closeTime - openTime) / (1000 * 60 * 60); // Convert to hours
    });

    const avgTradeLength = tradeLengths.length
      ? tradeLengths.reduce((sum, length) => sum + length, 0) / tradeLengths.length
      : 0;

    // Calculate stats for LONG and SHORT trades separately
    const longTrades = this.positionTrades.filter((trade) => trade.type === "LONG");
    const shortTrades = this.positionTrades.filter((trade) => trade.type === "SHORT");

    const longWinningTrades = longTrades.filter((trade) => (trade.profit || 0) > 0);
    const shortWinningTrades = shortTrades.filter((trade) => (trade.profit || 0) > 0);

    return {
      totalTrades: this.positionTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: this.positionTrades.length ? (winningTrades.length / this.positionTrades.length) * 100 : 0,
      averageProfit: winningTrades.length
        ? winningTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / winningTrades.length
        : 0,
      averageLoss: losingTrades.length
        ? losingTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / losingTrades.length
        : 0,
      profitLossRatio:
        losingTrades.length && winningTrades.length
          ? Math.abs(winningTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / winningTrades.length) /
            Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0) / losingTrades.length)
          : 0,
      totalProfit: this.positionTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0),
      maxDrawdown,
      sharpeRatio,
      maxConsecutiveWins,
      maxConsecutiveLosses,
      averageTradeLength: avgTradeLength,
      longTradeStats: {
        totalTrades: longTrades.length,
        winningTrades: longWinningTrades.length,
        winRate: longTrades.length ? (longWinningTrades.length / longTrades.length) * 100 : 0,
        totalProfit: longTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0),
      },
      shortTradeStats: {
        totalTrades: shortTrades.length,
        winningTrades: shortWinningTrades.length,
        winRate: shortTrades.length ? (shortWinningTrades.length / shortTrades.length) * 100 : 0,
        totalProfit: shortTrades.reduce((sum, trade) => sum + (trade.profit || 0), 0),
      },
    };
  }

  // Helper function to format price with 5 decimal places
  private formatPrice(price: number): string {
    return price.toFixed(5);
  }
}
