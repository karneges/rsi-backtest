import { BacktestResult, TradePosition, HistoricalData } from "../types";
import * as fs from "fs";
import * as path from "path";
import { calculateRSI } from "../indicators/rsi";
import { CandlestickWithSubCandlesticksAndRsi } from "../types/okx.types";

/**
 * Utility class for generating HTML charts from backtest results
 */
export class ChartVisualizer {
  /**
   * Generate HTML file with interactive charts from backtest results
   */
  static generateCharts(
    result: BacktestResult,
    historicalData: CandlestickWithSubCandlesticksAndRsi[],
    outputFilePath: string = "backtest-results.html",
  ): string {
    const { config, trades, stats, equityCurve } = result;

    // Format data for charts
    const equityCurveData = equityCurve.map((point) => ({
      x: new Date(point.timestamp).toISOString(),
      y: point.equity,
    }));

    // Format trades for chart
    const longEntries = trades
      .filter((trade) => trade.type === "LONG")
      .flatMap((trade) =>
        trade.entries.map((entry) => ({
          x: new Date(entry.timestamp).toISOString(),
          y: entry.price,
          size: entry.size,
          rsi: entry.entryRsi,
        })),
      );

    const longExits = trades
      .filter((trade) => trade.type === "LONG" && trade.closeTimestamp && trade.closePrice)
      .map((trade) => ({
        x: new Date(trade.closeTimestamp!).toISOString(),
        y: trade.closePrice!,
        profit: trade.profit || 0,
        rsi: trade.closeRsi,
      }));

    const shortEntries = trades
      .filter((trade) => trade.type === "SHORT")
      .flatMap((trade) =>
        trade.entries.map((entry) => ({
          x: new Date(entry.timestamp).toISOString(),
          y: entry.price,
          size: entry.size,
          rsi: entry.entryRsi,
        })),
      );

    const shortExits = trades
      .filter((trade) => trade.type === "SHORT" && trade.closeTimestamp && trade.closePrice)
      .map((trade) => ({
        x: new Date(trade.closeTimestamp!).toISOString(),
        y: trade.closePrice!,
        profit: trade.profit || 0,
        rsi: trade.closeRsi,
      }));

    // Format price data
    const priceData = historicalData.map((candle) => ({
      x: new Date(candle.timestamp).toISOString(),
      y: candle.closePrice,
      o: candle.openPrice,
      h: candle.highPrice,
      l: candle.lowPrice,
      v: candle.volume,
    }));

    // Calculate RSI data
    const closePrices = historicalData.map((candle) => candle.closePrice);
    const rsiValues = calculateRSI(closePrices);

    // Align RSI values with correct candles (RSI calculation loses some initial candles)
    const rsiData = historicalData
      .map((candle, index) => {
        const rsiIndex = index - (historicalData.length - rsiValues.length);
        const rsiValue = rsiIndex >= 0 ? rsiValues[rsiIndex] : null;

        return {
          x: new Date(candle.timestamp).toISOString(),
          y: rsiValue,
        };
      })
      .filter((point) => point.y !== null);

    // Generate HTML with embedded charts
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSI Trading Model - Backtest Results</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f8f9fa;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .chart-container {
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 30px;
      height: 400px;
    }
    .stats-container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-box {
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 15px;
      flex: 1;
      min-width: 200px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #3498db;
      margin: 5px 0;
    }
    .win {
      color: #2ecc71;
    }
    .loss {
      color: #e74c3c;
    }
    .trades-container {
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 30px;
      max-height: 400px;
      overflow-y: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .rsi-reference-container {
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 15px;
      margin-bottom: 30px;
    }
    .rsi-color-scale {
      display: flex;
      margin: 10px 0;
    }
    .rsi-color-item {
      flex: 1;
      text-align: center;
      padding: 8px 0;
      color: black;
      font-weight: bold;
      text-shadow: 0px 0px 2px rgba(255, 255, 255, 0.8);
    }
    .rsi-thresholds {
      display: flex;
      justify-content: space-around;
      margin-top: 10px;
      font-weight: bold;
    }
    .entry-details-row {
      display: none;
    }
    
    .entry-details {
      padding: 10px;
      background-color: #f5f9fc;
      border-radius: 4px;
    }
    
    .entry-table {
      width: 100%;
      font-size: 0.9em;
    }
    
    .entry-table th, .entry-table td {
      padding: 4px 8px;
    }
    
    .trade-row {
      cursor: pointer;
    }
    
    .trade-row:hover {
      background-color: #e9f0f7 !important;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns"></script>
</head>
<body>
  <div class="container">
    <h1>RSI Trading Model - Backtest Results</h1>
    
    <div class="stats-container">
      <div class="stat-box">
        <h3>Symbol</h3>
        <div class="stat-value">${config.symbol}</div>
        <div>Timeframe: ${config.timeframe}</div>
      </div>
      <div class="stat-box">
        <h3>Total Profit</h3>
        <div class="stat-value ${stats.totalProfit >= 0 ? "win" : "loss"}">${stats.totalProfit.toFixed(2)} USDT</div>
      </div>
      <div class="stat-box">
        <h3>Win Rate</h3>
        <div class="stat-value">${stats.winRate.toFixed(2)}%</div>
        <div>${stats.winningTrades} winning, ${stats.losingTrades} losing</div>
      </div>
      <div class="stat-box">
        <h3>Max Drawdown</h3>
        <div class="stat-value loss">${stats.maxDrawdown.toFixed(2)}%</div>
      </div>
    </div>
    
    <div class="rsi-reference-container">
      <h3>RSI Value Color Reference</h3>
      <div class="rsi-color-scale">
        <div class="rsi-color-item" style="background-color: #FF3300;">0-10</div>
        <div class="rsi-color-item" style="background-color: #FF6600;">10-20</div>
        <div class="rsi-color-item" style="background-color: #FF9900;">20-30</div>
        <div class="rsi-color-item" style="background-color: #FFCC00;">30-40</div>
        <div class="rsi-color-item" style="background-color: #FFFF00;">40-50</div>
        <div class="rsi-color-item" style="background-color: #CCFF00;">50-60</div>
        <div class="rsi-color-item" style="background-color: #99FF00;">60-70</div>
        <div class="rsi-color-item" style="background-color: #66FF00;">70-80</div>
        <div class="rsi-color-item" style="background-color: #33FF00;">80-90</div>
        <div class="rsi-color-item" style="background-color: #00FF00;">90-100</div>
      </div>
      <div class="rsi-thresholds">
        <div>Long Entry: ≤ ${config.longEntryRsi}</div>
        <div>Long Exit: ≥ ${config.longExitRsi}</div>
        <div>Short Entry: ≥ ${config.shortEntryRsi}</div>
        <div>Short Exit: ≤ ${config.shortExitRsi}</div>
      </div>
    </div>
    
    <div class="chart-container">
      <h2>Equity Curve</h2>
      <canvas id="equityChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h2>Price & Trades</h2>
      <canvas id="priceChart"></canvas>
    </div>
    
    <div class="chart-container">
      <h2>RSI Indicator</h2>
      <canvas id="rsiChart"></canvas>
    </div>
    
    <h2>Strategy Configuration</h2>
    <div class="stats-container">
      <div class="stat-box">
        <h3>RSI Parameters</h3>
        <div>Long Entry: ≤ ${config.longEntryRsi}</div>
        <div>Long Exit: ≥ ${config.longExitRsi}</div>
        <div>Short Entry: ≥ ${config.shortEntryRsi}</div>
        <div>Short Exit: ≤ ${config.shortExitRsi}</div>
      </div>
      <div class="stat-box">
        <h3>Position Sizing</h3>
        <div>Fixed Size: ${config.fixedPositionSize} USDT</div>
        <div>Leverage: ${config.leverage}x</div>
        <div>Max Loss Entries: ${config.maxLossEntries}</div>
        <div>Position Add Delay: ${config.positionAddDelay / 1000}s</div>
      </div>
      <div class="stat-box">
        <h3>Profit Requirements</h3>
        <div>Min Profit: ${config.minProfitPercent}%</div>
        <div>Break-Even Threshold: ${config.breakEvenThreshold}%</div>
      </div>
    </div>
    
    <div class="stats-container">
      <div class="stat-box">
        <h3>Long Trades</h3>
        <div class="stat-value">${stats.longTradeStats.totalTrades}</div>
        <div>Win Rate: ${stats.longTradeStats.winRate.toFixed(2)}%</div>
        <div>Profit: ${stats.longTradeStats.totalProfit.toFixed(2)} USDT</div>
      </div>
      <div class="stat-box">
        <h3>Short Trades</h3>
        <div class="stat-value">${stats.shortTradeStats.totalTrades}</div>
        <div>Win Rate: ${stats.shortTradeStats.winRate.toFixed(2)}%</div>
        <div>Profit: ${stats.shortTradeStats.totalProfit.toFixed(2)} USDT</div>
      </div>
      <div class="stat-box">
        <h3>Other Metrics</h3>
        <div>Sharpe Ratio: ${stats.sharpeRatio.toFixed(2)}</div>
        <div>Avg Trade Length: ${stats.averageTradeLength.toFixed(2)} hours</div>
        <div>Max Consecutive Wins: ${stats.maxConsecutiveWins}</div>
        <div>Max Consecutive Losses: ${stats.maxConsecutiveLosses}</div>
      </div>
    </div>
    
    <div class="trades-container">
      <h2>Recent Trades (Last 10)</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Open Time</th>
            <th>Open RSI</th>
            <th>Close Time</th>
            <th>Close RSI</th>
            <th>Entries</th>
            <th>Avg Entry</th>
            <th>Exit Price</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          ${trades
            .slice(-10)
            .map(
              (trade) => `
            <tr class="trade-row" data-trade-id="${trade.openTimestamp}">
              <td>${trade.type}</td>
              <td>${new Date(trade.openTimestamp).toLocaleString()}</td>
              <td>${trade.openRsi ? trade.openRsi.toFixed(2) : "-"}</td>
              <td>${trade.closeTimestamp ? new Date(trade.closeTimestamp).toLocaleString() : "Open"}</td>
              <td>${trade.closeRsi ? trade.closeRsi.toFixed(2) : "-"}</td>
              <td>${trade.entries.length}</td>
              <td>${trade.averageEntryPrice.toFixed(4)}</td>
              <td>${trade.closePrice ? trade.closePrice.toFixed(4) : "-"}</td>
              <td style="color: ${(trade.profit || 0) >= 0 ? "#2ecc71" : "#e74c3c"}">
                ${trade.profit ? trade.profit.toFixed(2) : "-"} 
                (${trade.profitPercent ? trade.profitPercent.toFixed(2) : "-"}%)
              </td>
            </tr>
            <tr class="entry-details-row" id="details-${trade.openTimestamp}">
              <td colspan="9">
                <div class="entry-details">
                  <h4>Entry Details</h4>
                  <table class="entry-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Time</th>
                        <th>Price</th>
                        <th>Size</th>
                        <th>RSI</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${trade.entries
                        .map(
                          (entry, index) => `
                        <tr>
                          <td>${index + 1}</td>
                          <td>${new Date(entry.timestamp).toLocaleString()}</td>
                          <td>${entry.price.toFixed(4)}</td>
                          <td>${entry.size.toFixed(4)}</td>
                          <td>${entry.entryRsi ? entry.entryRsi.toFixed(2) : "-"}</td>
                        </tr>
                      `,
                        )
                        .join("")}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  </div>

  <script>
    // Synchronize zooming between charts
    const timeRanges = {
      all: { min: null, max: null },
      month: { min: null, max: null },
      week: { min: null, max: null },
      day: { min: null, max: null }
    };

    // Determine time ranges for filters
    const timestamps = ${JSON.stringify(historicalData.map((d) => d.timestamp))};
    if (timestamps.length > 0) {
      const newest = Math.max(...timestamps);
      timeRanges.all.min = new Date(Math.min(...timestamps));
      timeRanges.all.max = new Date(newest);
      
      // Last month
      timeRanges.month.min = new Date(newest - 30 * 24 * 60 * 60 * 1000);
      timeRanges.month.max = new Date(newest);
      
      // Last week
      timeRanges.week.min = new Date(newest - 7 * 24 * 60 * 60 * 1000);
      timeRanges.week.max = new Date(newest);
      
      // Last day
      timeRanges.day.min = new Date(newest - 24 * 60 * 60 * 1000);
      timeRanges.day.max = new Date(newest);
    }
    
    // Current active time range
    let activeRange = 'all';
    
    // Charts reference
    const charts = {};
    
    // Equity Curve Chart
    const equityCtx = document.getElementById('equityChart').getContext('2d');
    charts.equity = new Chart(equityCtx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Equity (USDT)',
          data: ${JSON.stringify(equityCurveData)},
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              tooltipFormat: 'MMM d, yyyy, HH:mm'
            },
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Equity (USDT)'
            },
            min: ${Math.floor(Math.min(...equityCurve.map((p) => p.equity)) * 0.95)}
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Equity Curve'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return 'Equity: ' + context.parsed.y.toFixed(2) + ' USDT';
              }
            }
          }
        }
      }
    });
    
    // Price & Trades Chart
    const priceCtx = document.getElementById('priceChart').getContext('2d');
    charts.price = new Chart(priceCtx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'Price',
            data: ${JSON.stringify(priceData)},
            borderColor: '#7f8c8d',
            borderWidth: 1,
            pointRadius: 0,
            tension: 0.1
          },
          {
            label: 'Long Entries',
            data: ${JSON.stringify(longEntries)},
            backgroundColor: 'rgba(46, 204, 113, 0.8)',
            borderColor: 'rgba(46, 204, 113, 1)',
            borderWidth: 2,
            pointRadius: 6,
            pointStyle: 'triangle',
            showLine: false
          },
          {
            label: 'Long Exits',
            data: ${JSON.stringify(longExits)},
            backgroundColor: 'rgba(26, 188, 156, 0.8)',
            borderColor: 'rgba(26, 188, 156, 1)',
            borderWidth: 2,
            pointRadius: 6,
            pointStyle: 'triangle',
            pointRotation: 180,
            showLine: false
          },
          {
            label: 'Short Entries',
            data: ${JSON.stringify(shortEntries)},
            backgroundColor: 'rgba(231, 76, 60, 0.8)',
            borderColor: 'rgba(231, 76, 60, 1)',
            borderWidth: 2,
            pointRadius: 6,
            pointStyle: 'triangle',
            pointRotation: 180,
            showLine: false
          },
          {
            label: 'Short Exits',
            data: ${JSON.stringify(shortExits)},
            backgroundColor: 'rgba(230, 126, 34, 0.8)',
            borderColor: 'rgba(230, 126, 34, 1)',
            borderWidth: 2,
            pointRadius: 6,
            pointStyle: 'triangle',
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              tooltipFormat: 'MMM d, yyyy, HH:mm'
            },
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Price'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Price Chart with Trade Entries & Exits'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const dataset = context.dataset.label;
                const point = context.raw;
                let label = dataset + ': ' + context.parsed.y.toFixed(6);
                
                if (dataset.includes('Entries')) {
                  label += ' | RSI: ' + (point.rsi ? point.rsi.toFixed(2) : 'N/A');
                  label += ' | Size: ' + (point.size ? point.size.toFixed(4) : 'N/A');
                } else if (dataset.includes('Exits')) {
                  label += ' | RSI: ' + (point.rsi ? point.rsi.toFixed(2) : 'N/A');
                  label += ' | Profit: ' + (point.profit ? point.profit.toFixed(2) : 'N/A') + ' USDT';
                }
                
                return label;
              }
            }
          }
        }
      }
    });
    
    // RSI Chart
    const rsiCtx = document.getElementById('rsiChart').getContext('2d');
    charts.rsi = new Chart(rsiCtx, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'RSI',
            data: ${JSON.stringify(rsiData)},
            borderColor: '#8e44ad',
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0
          },
          {
            label: 'Long Entry',
            data: [{x: timeRanges.all.min, y: ${config.longEntryRsi}}, {x: timeRanges.all.max, y: ${
      config.longEntryRsi
    }}],
            borderColor: '#2ecc71',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0
          },
          {
            label: 'Long Exit',
            data: [{x: timeRanges.all.min, y: ${config.longExitRsi}}, {x: timeRanges.all.max, y: ${
      config.longExitRsi
    }}],
            borderColor: '#e67e22',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0
          },
          {
            label: 'Short Entry',
            data: [{x: timeRanges.all.min, y: ${config.shortEntryRsi}}, {x: timeRanges.all.max, y: ${
      config.shortEntryRsi
    }}],
            borderColor: '#e74c3c',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0
          },
          {
            label: 'Short Exit',
            data: [{x: timeRanges.all.min, y: ${config.shortExitRsi}}, {x: timeRanges.all.max, y: ${
      config.shortExitRsi
    }}],
            borderColor: '#3498db',
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              tooltipFormat: 'MMM d, yyyy, HH:mm'
            },
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'RSI Value'
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'RSI Indicator'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const datasetLabel = context.dataset.label;
                const value = context.parsed.y;
                
                if (datasetLabel === 'RSI') {
                  return 'RSI: ' + value.toFixed(2);
                }
                
                return datasetLabel + ': ' + value.toFixed(2);
              }
            }
          }
        }
      }
    });
    
    // Add time range filter buttons
    const chartContainer = document.querySelector('.container');
    const filterDiv = document.createElement('div');
    filterDiv.style.textAlign = 'center';
    filterDiv.style.marginBottom = '20px';
    filterDiv.innerHTML = \`
      <button id="range-all" class="active">All Data</button>
      <button id="range-month">Last Month</button>
      <button id="range-week">Last Week</button>
      <button id="range-day">Last Day</button>
    \`;
    chartContainer.insertBefore(filterDiv, document.querySelector('.chart-container'));
    
    // Add event listeners to buttons
    document.getElementById('range-all').addEventListener('click', () => setTimeRange('all'));
    document.getElementById('range-month').addEventListener('click', () => setTimeRange('month'));
    document.getElementById('range-week').addEventListener('click', () => setTimeRange('week'));
    document.getElementById('range-day').addEventListener('click', () => setTimeRange('day'));
    
    function setTimeRange(range) {
      // Update active button
      document.querySelectorAll('#range-all, #range-month, #range-week, #range-day').forEach(btn => {
        btn.classList.remove('active');
      });
      document.getElementById('range-' + range).classList.add('active');
      
      // Update chart ranges
      Object.keys(charts).forEach(key => {
        const chart = charts[key];
        chart.options.scales.x.min = timeRanges[range].min;
        chart.options.scales.x.max = timeRanges[range].max;
        chart.update();
      });
      
      activeRange = range;
    }
    
    // Apply initial time range
    setTimeRange('all');

    // Add this JavaScript to the page for expanding/collapsing trade details
    document.addEventListener('DOMContentLoaded', function() {
      const tradeRows = document.querySelectorAll('.trade-row');
      
      tradeRows.forEach(row => {
        row.addEventListener('click', function() {
          const tradeId = this.getAttribute('data-trade-id');
          const detailsRow = document.getElementById('details-' + tradeId);
          
          if (detailsRow.style.display === 'table-row') {
            detailsRow.style.display = 'none';
          } else {
            // Hide all other detail rows
            document.querySelectorAll('.entry-details-row').forEach(row => {
              row.style.display = 'none';
            });
            
            detailsRow.style.display = 'table-row';
          }
        });
      });
    });
  </script>
</body>
</html>
    `;

    // Write the HTML to file
    const outputPath = path.resolve(outputFilePath);
    fs.writeFileSync(outputPath, html);

    console.log(`Chart visualization generated at: ${outputPath}`);
    return outputPath;
  }

  /**
   * Save backtest results as JSON for further analysis
   */
  static saveResultsAsJson(
    result: BacktestResult,
    historicalData: HistoricalData[],
    outputFilePath: string = "backtest-results.json",
  ): string {
    // Create a simplified version of the data for exporting
    const exportData = {
      config: result.config,
      stats: result.stats,
      trades: result.trades.map((trade) => ({
        type: trade.type,
        entries: trade.entries,
        averageEntryPrice: trade.averageEntryPrice,
        openTimestamp: trade.openTimestamp,
        closeTimestamp: trade.closeTimestamp,
        closePrice: trade.closePrice,
        profit: trade.profit,
        profitPercent: trade.profitPercent,
      })),
      equityCurve: result.equityCurve,
      historicalPrices: historicalData.map((candle) => ({
        timestamp: candle.timestamp,
        close: candle.close,
      })),
    };

    // Write the JSON to file
    const outputPath = path.resolve(outputFilePath);
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log(`JSON results saved to: ${outputPath}`);
    return outputPath;
  }
}
