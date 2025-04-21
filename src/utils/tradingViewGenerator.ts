//@version=5
import { BacktestResult, TradePosition } from "../types";
import { CandlestickWithSubCandlesticksAndRsi } from "../types/okx.types";
import * as fs from "fs";
import * as path from "path";

/**
 * Generates TradingView Pine Script from backtest results
 */
export function generateTradingViewScript(
  result: BacktestResult,
  historicalData: CandlestickWithSubCandlesticksAndRsi[],
  outputFilePath: string = "trading_strategy.pine",
): string {
  const { config, trades } = result;

  // Generate Pine Script
  const pineScript = `
//@version=5
strategy("RSI Trading Strategy", overlay=true, initial_capital=10000, default_qty_type=strategy.fixed, default_qty_value=1)

// Input parameters
longEntryRsi = input.float(${config.longEntryRsi}, "Long Entry RSI", minval=0, maxval=100)
longExitRsi = input.float(${config.longExitRsi}, "Long Exit RSI", minval=0, maxval=100)
shortEntryRsi = input.float(${config.shortEntryRsi}, "Short Entry RSI", minval=0, maxval=100)
shortExitRsi = input.float(${config.shortExitRsi}, "Short Exit RSI", minval=0, maxval=100)
rsiLength = input.int(14, "RSI Length")
breakEvenThreshold = input.float(${config.breakEvenThreshold}, "Break Even Threshold %")
minProfitPercent = input.float(${config.minProfitPercent}, "Minimum Profit %")

// Calculate RSI
rsi = ta.rsi(close, rsiLength)

// Plot RSI levels
hline(70, "RSI 70", color=color.new(color.red, 50))
hline(30, "RSI 30", color=color.new(color.green, 50))
plot(rsi, "RSI", color=color.blue)

// Trading conditions
longEntry = rsi <= longEntryRsi
longExit = rsi >= longExitRsi
shortEntry = rsi >= shortEntryRsi
shortExit = rsi <= shortExitRsi

// Strategy execution
if (longEntry)
    strategy.entry("Long", strategy.long)

if (longExit)
    strategy.close("Long")

if (shortEntry)
    strategy.entry("Short", strategy.short)

if (shortExit)
    strategy.close("Short")

// Plot entry/exit points
plotshape(longEntry, "Long Entry", location=location.belowbar, color=color.green, style=shape.triangleup, size=size.small)
plotshape(longExit, "Long Exit", location=location.abovebar, color=color.red, style=shape.triangledown, size=size.small)
plotshape(shortEntry, "Short Entry", location=location.abovebar, color=color.red, style=shape.triangledown, size=size.small)
plotshape(shortExit, "Short Exit", location=location.belowbar, color=color.green, style=shape.triangleup, size=size.small)

// Break-even and profit targets
var float entryPrice = na
if (strategy.position_size != 0 and strategy.position_size[1] == 0)
    entryPrice := close

if (strategy.position_size != 0)
    if (strategy.position_size > 0)
        strategy.exit("Long TP/BE", "Long", profit=minProfitPercent/100 * entryPrice, stop=entryPrice * (1 + breakEvenThreshold/100))
    else
        strategy.exit("Short TP/BE", "Short", profit=minProfitPercent/100 * entryPrice, stop=entryPrice * (1 - breakEvenThreshold/100))
`;

  // Write Pine Script to file
  const outputPath = path.resolve(outputFilePath);
  fs.writeFileSync(outputPath, pineScript);

  console.log(`TradingView Pine Script generated at: ${outputPath}`);
  console.log("To use this strategy in TradingView:");
  console.log("1. Open TradingView and create a new Pine Script");
  console.log("2. Copy and paste the contents of the generated file");
  console.log("3. Add to Chart and configure the strategy parameters");

  return outputPath;
}
