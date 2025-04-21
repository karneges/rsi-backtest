# RSI Trading Model Analyzer

This project provides a comprehensive backtesting and analysis tool for an RSI-based trading strategy on OKX futures.

## Strategy Description

The implemented RSI trading strategy:

- Uses RSI (Relative Strength Index) indicator for entry and exit signals
- Trades with leverage (5x-10x) on futures markets
- Opens LONG positions when RSI is 30 or below, closes at RSI 55 or above
- Opens SHORT positions when RSI is 70 or above, closes at RSI 45 or below
- Uses fixed position sizing (10 USDT by default) for consistent risk management
- Adds additional fixed-size positions when RSI moves deeper into entry zones
- Implements averaging/DCA when price moves against position (more than 1% from break-even)
- Recalculates RSI with every trade for more accurate simulation of real trading conditions
- Requires minimum profit (1% by default) before closing positions on RSI signals
- Automatically closes positions at significant profit levels (3% by default) regardless of RSI signals

## Features

- Historical data fetching from OKX exchange (both candles and trades)
- Two backtest models:
  - Traditional candle-based backtesting
  - Advanced trade-by-trade backtesting with RSI updates after each trade
- Performance comparison between models
- Parameter optimization for maximum profit and best risk-adjusted returns
- Comprehensive performance metrics (win rate, profit/loss ratio, drawdown, Sharpe ratio)
- Monthly performance breakdown
- Trade-by-trade analysis
- Fixed position sizing for consistent risk management
- Multiple position entry strategies based on RSI values and trends
- Profit-based exit conditions to maximize returns

## Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

## Usage

To run the analysis with default parameters:

```bash
npm run build
npm start
```

## Configuration

You can modify the trading parameters in `src/index.ts`:

```typescript
const config: TradeConfig = {
  leverage: 10,                   // Leverage (5x-10x)
  longEntryRsi: 30,               // RSI level to enter LONG positions
  longExitRsi: 55,                // RSI level to exit LONG positions
  shortEntryRsi: 70,              // RSI level to enter SHORT positions 
  shortExitRsi: 45,               // RSI level to exit SHORT positions
  breakEvenThreshold: 1,          // Percentage threshold for averaging
  minProfitPercent: 1.0,          // Minimum profit percentage required to close a position
  significantProfitMultiplier: 3, // Multiplier for significant profit (exit regardless of RSI)
  fixedPositionSize: 10,          // Fixed position size in USDT for each trade
  symbol: 'BTC-USDT-SWAP',        // Trading pair
  timeframe: '15m'                // Candle timeframe
};
```

## Fixed Position Sizing Strategy

The model implements a fixed position sizing strategy for better risk management:

1. **Consistent Risk Per Trade**: Each new position or additional position uses exactly the same amount of capital (10 USDT by default)
2. **Capital Efficiency**: Instead of using a percentage of available capital, fixed sizing ensures consistent exposure
3. **Simplified Accounting**: Makes it easier to track performance across different market conditions
4. **Gradual Scaling**: As RSI continues to move deeper into zones, additional fixed-size positions are added

When RSI gives entry signals or moves deeper into entry zones, the model will:
- Open a new position with exactly 10 USDT (or configured amount)
- Add additional 10 USDT positions when RSI moves deeper or price moves against the position
- Continue adding fixed-size positions as long as capital is available

This approach allows for:
- More predictable risk management
- Clearly defined maximum position sizes based on available capital
- Easier position management and profit calculation

## Profit-Based Exit Strategy

The model implements an advanced exit strategy that combines RSI signals with profit targets:

1. **RSI Exit Signal + Minimum Profit**: When RSI gives an exit signal, the position will only be closed if it has reached the minimum profit percentage (default 1%) or is in a loss.
2. **Significant Profit Auto-Exit**: Positions will automatically close when they reach a significant profit level (default 3%) regardless of RSI signals.
3. **Loss Protection**: Losing positions can still exit on RSI signals to prevent further losses.

This approach helps maximize profits by:
- Avoiding premature exits when profit is too small
- Taking profits automatically when they reach significant levels
- Maintaining proper risk management for losing trades

## Trade-Based Backtesting

The trade-based model provides more realistic backtesting results by:

1. Fetching historical trades alongside candles
2. Organizing trades within their respective candles
3. Processing each trade chronologically
4. Recalculating RSI after each trade
5. Making trading decisions after every trade, not just at candle close
6. More accurately simulating how trading would work in a live environment

Benefits of the trade-based model:
- More accurate entry and exit points
- Captures intra-candle volatility and opportunities
- Better representation of real market conditions
- More realistic profit/loss calculations

## Project Structure

- `src/types.ts` - Type definitions
- `src/indicators/rsi.ts` - RSI indicator implementation
- `src/services/okxService.ts` - OKX API service for candles and trades
- `src/models/rsiBacktestModel.ts` - Traditional candle-based backtest model
- `src/models/rsiTradeBasedModel.ts` - Advanced trade-by-trade backtest model
- `src/models/parameterOptimizer.ts` - Parameter optimization
- `src/utils/visualizer.ts` - Visualization and formatting utilities
- `src/index.ts` - Main entry point

## Example Output

```
===== RSI Trading Model Analysis =====
Symbol: BTC-USDT-SWAP
Timeframe: 15m
Initial Capital: 10,000 USDT
Analyzing 3 days of historical data
----------------------------------
Fetching historical candle data from OKX...
Fetched 288 candles from 4/5/2023 to 4/8/2023
Fetching historical trade data from OKX...
Fetched 12546 historical trades

Candle-Based Model Results:
Total Trades: 5
Win Rate: 80.00% (4 winning, 1 losing)
Total Profit: 52.31 USDT

Trade-Based Model Results:
Total Trades: 8
Win Rate: 75.00% (6 winning, 2 losing)
Total Profit: 71.45 USDT
...
```

## License

ISC 