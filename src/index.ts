import { RsiTradeBasedModel } from "./models/rsiTradeBasedModel";
import { generateTradingViewReport } from "./utils/tradingViewReportGenerator";
import { getMinutesFromTimeframe } from "./utils/timeframe";
import { HistoricalTrade } from "./types";
import { OKXService } from "./services/okx.service";
/**
 * Main entry point for the RSI trading model analysis
 */
async function main() {
  try {
    // Configuration
    const okxSymbol = "AI16Z-USDT-SWAP"; // OKX specific format
    const tradingViewSymbol = "BINANCE:AI16ZUSDT"; // TradingView format
    const timeframe = "15m";
    const daysToFetch = 5;
    const initialCapital = 10000; // USDT

    console.log(`===== RSI Trading Model Analysis =====`);
    console.log(`Symbol: ${okxSymbol} (${tradingViewSymbol} on TradingView)`);
    console.log(`Timeframe: ${timeframe}`);
    console.log(`Initial Capital: ${initialCapital} USDT`);
    console.log(`Analyzing ${daysToFetch} days of historical data`);
    console.log(`----------------------------------`);

    // Fetch historical candle data first
    console.log("Fetching historical candle data from OKX...");
    const okxService = new OKXService();

    // First fetch 15-minute candles for the model
    const historicalData = await okxService.getCandlesticksWithSubCandlesticks({
      instId: okxSymbol,
      bar: "15m",
      limit: 200,
      subCandlesticksTimeFrame: "1m",
    });

    // Initialize the model with historical data and generated trades
    const model = new RsiTradeBasedModel(
      {
        longEntryRsi: 20,
        longExitRsi: 55,
        shortEntryRsi: 70,
        shortExitRsi: 45,
        leverage: 10,
        fixedPositionSize: 1,
        minProfitPercent: 1,
        breakEvenThreshold: 1,
        maxLossEntries: 10_000,
        positionAddDelay: 20000, // 20 minutes in milliseconds
        symbol: tradingViewSymbol, // Use TradingView symbol format
        timeframe,
      },
      historicalData,
    );

    // Run backtest
    const result = await model.runTradeBasedBacktest();

    // Generate TradingView report with interactive charts
    const reportPath = await generateTradingViewReport(result, historicalData);

    // Print summary and instructions
    console.log("\nBacktest Results Summary:");
    console.log(`Total Trades: ${result.stats.totalTrades}`);
    console.log(`Win Rate: ${result.stats.winRate.toFixed(2)}%`);
    console.log(`Total Profit: ${result.stats.totalProfit.toFixed(2)} USDT`);
    console.log(`Max Drawdown: ${result.stats.maxDrawdown.toFixed(2)}%`);
    console.log(`Sharpe Ratio: ${result.stats.sharpeRatio.toFixed(2)}`);
    console.log(`\nDetailed report with interactive TradingView charts has been generated at: ${reportPath}`);
    console.log("Open this file in your browser to view the complete analysis with interactive charts");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the main function
main().catch(console.error);
