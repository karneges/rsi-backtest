import { BacktestResult, HistoricalData } from "../types";
import { Visualizer } from "./visualizer";
import { ChartVisualizer } from "./chartVisualizer";
import { CandlestickWithSubCandlesticksAndRsi } from "../types/okx.types";

/**
 * Generate an HTML report from backtest results
 * @param result Backtest results
 */
export async function generateHtmlReport(
  result: BacktestResult,
  historicalData: CandlestickWithSubCandlesticksAndRsi[],
): Promise<void> {
  // Print text results
  console.log("\nTrade-Based Model Results:");
  console.log(Visualizer.formatBacktestResults(result));

  // Generate charts
  console.log("\nGenerating interactive charts...");
  const chartPath = ChartVisualizer.generateCharts(result, historicalData, "./backtest-results.html");
  console.log(`Chart visualization generated at: ${chartPath}`);
  console.log(`Chart visualization saved to: ${chartPath}`);
  console.log("Open this file in your browser to view interactive charts");

  console.log("\n===== Analysis Complete =====");
}
