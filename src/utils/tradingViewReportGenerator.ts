import { BacktestResult } from "../types";
import { CandlestickWithSubCandlesticksAndRsi } from "../types/okx.types";
import * as fs from "fs";
import * as path from "path";

/**
 * Generates an HTML report with embedded TradingView Lightweight Charts
 */
export function generateTradingViewReport(
  result: BacktestResult,
  historicalData: CandlestickWithSubCandlesticksAndRsi[],
): string {
  const { config, trades, stats } = result;

  // Format data for Lightweight Charts
  const candleData = historicalData.map((candle) => ({
    time: Math.floor(candle.timestamp / 1000), // Convert to seconds
    open: candle.openPrice,
    high: candle.highPrice,
    low: candle.lowPrice,
    close: candle.closePrice,
    volume: candle.volume,
  }));

  // Calculate RSI values
  const rsiValues = historicalData.map((candle) => ({
    time: Math.floor(candle.timestamp / 1000),
    value: candle.rsi || 0,
  }));

  // Generate HTML
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RSI Trading Strategy - Analysis Results</title>
    <script src="https://unpkg.com/lightweight-charts@4.1.1/dist/lightweight-charts.standalone.production.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        .chart-container {
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            padding: 20px;
            margin-bottom: 30px;
        }
        .chart-wrapper {
            position: relative;
            height: 600px;
        }
        #price-chart, #rsi-chart {
            position: absolute;
            left: 0;
            right: 0;
        }
        #price-chart {
            height: 400px;
            top: 0;
        }
        #rsi-chart {
            height: 200px;
            bottom: 0;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2962FF;
            margin: 10px 0;
        }
        .stat-label {
            color: #666;
            font-size: 14px;
        }
        .trades-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .trades-table th,
        .trades-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .trades-table th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        .profit { color: #00C853; }
        .loss { color: #FF1744; }
        .header {
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1E88E5;
            margin-bottom: 10px;
        }
        .header p {
            color: #666;
            margin: 5px 0;
        }
        .timeframe-selector {
            margin-bottom: 10px;
            text-align: center;
        }
        .timeframe-btn {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            padding: 8px 16px;
            margin: 0 4px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .timeframe-btn:hover {
            background-color: #e9ecef;
        }
        .timeframe-btn.active {
            background-color: #2962FF;
            color: white;
            border-color: #2962FF;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>RSI Trading Strategy Analysis</h1>
            <p>Symbol: ${config.symbol}</p>
            <p>Timeframe: ${config.timeframe}</p>
            <p>Analysis Period: ${new Date(historicalData[0].timestamp).toLocaleDateString()} - ${new Date(
    historicalData[historicalData.length - 1].timestamp,
  ).toLocaleDateString()}</p>
        </div>

        <div class="chart-container">
            <div class="timeframe-selector">
                <button class="timeframe-btn" data-minutes="1">1m</button>
                <button class="timeframe-btn" data-minutes="5">5m</button>
                <button class="timeframe-btn" data-minutes="15">15m</button>
                <button class="timeframe-btn" data-minutes="30">30m</button>
                <button class="timeframe-btn" data-minutes="60">1h</button>
                <button class="timeframe-btn" data-minutes="240">4h</button>
                <button class="timeframe-btn" data-minutes="1440">1d</button>
            </div>
            <div class="chart-wrapper">
                <div id="price-chart"></div>
                <div id="rsi-chart"></div>
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Profit</div>
                <div class="stat-value ${stats.totalProfit >= 0 ? "profit" : "loss"}">
                    ${stats.totalProfit.toFixed(2)} USDT
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Win Rate</div>
                <div class="stat-value">${stats.winRate.toFixed(2)}%</div>
                <div>${stats.winningTrades} winning, ${stats.losingTrades} losing</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Max Drawdown</div>
                <div class="stat-value loss">${stats.maxDrawdown.toFixed(2)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Sharpe Ratio</div>
                <div class="stat-value">${stats.sharpeRatio.toFixed(2)}</div>
            </div>
        </div>

        <div class="chart-container">
            <h2>Recent Trades</h2>
            <table class="trades-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>Entry Time</th>
                        <th>Exit Time</th>
                        <th>Entry Price</th>
                        <th>Exit Price</th>
                        <th>Profit/Loss</th>
                    </tr>
                </thead>
                <tbody>
                    ${trades
                      .slice(-10)
                      .map(
                        (trade) => `
                        <tr>
                            <td>${trade.type}</td>
                            <td>${new Date(trade.openTimestamp).toLocaleString()}</td>
                            <td>${trade.closeTimestamp ? new Date(trade.closeTimestamp).toLocaleString() : "Open"}</td>
                            <td>${trade.averageEntryPrice.toFixed(4)}</td>
                            <td>${trade.closePrice ? trade.closePrice.toFixed(4) : "-"}</td>
                            <td class="${(trade.profit || 0) >= 0 ? "profit" : "loss"}">
                                ${trade.profit ? trade.profit.toFixed(2) : "-"} USDT
                                (${trade.profitPercent ? trade.profitPercent.toFixed(2) : "-"}%)
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
        // Initialize data
        const trades = ${JSON.stringify(trades)};
        const candleData = ${JSON.stringify(candleData)};
        const rsiValues = ${JSON.stringify(rsiValues)};

        // Initialize charts
        const chartOptions = {
            layout: {
                background: { color: '#ffffff' },
                textColor: '#333',
            },
            grid: {
                vertLines: { color: '#f0f0f0' },
                horzLines: { color: '#f0f0f0' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
                vertLine: {
                    labelBackgroundColor: '#4c525e',
                },
                horzLine: {
                    labelBackgroundColor: '#4c525e',
                },
            },
            timeScale: {
                borderColor: '#d1d4dc',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: '#d1d4dc',
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
            },
            handleScale: {
                mouseWheel: true,
                pinch: true,
            },
        };

        const { createChart } = window.LightweightCharts;
        
        const priceChart = createChart(document.getElementById('price-chart'), {
            ...chartOptions,
            height: 400,
        });

        const rsiChart = createChart(document.getElementById('rsi-chart'), {
            ...chartOptions,
            height: 200,
        });

        // Add candlestick series
        const candlestickSeries = priceChart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350'
        });

        // Add RSI series
        const rsiSeries = rsiChart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        // Add markers for position entries and exits
        const markers = [];
        for (const trade of trades) {
            // Entry marker
            markers.push({
                time: Math.floor(trade.openTimestamp / 1000),
                position: 'belowBar',
                color: trade.type === 'LONG' ? '#26a69a' : '#ef5350',
                shape: 'arrowUp',
                text: trade.type + ' Entry\\nPrice: ' + trade.averageEntryPrice.toFixed(2) + '\\nRSI: ' + trade.openRsi.toFixed(2) + '\\nPosition Size: ' + trade.currentSize.toFixed(2) + ' USDT',
            });

            // Exit marker (if trade is closed)
            if (trade.closeTimestamp) {
                markers.push({
                    time: Math.floor(trade.closeTimestamp / 1000),
                    position: 'aboveBar',
                    color: trade.type === 'LONG' ? '#ef5350' : '#26a69a',
                    shape: 'arrowDown',
                    text: trade.type + ' Exit\\nPrice: ' + trade.closePrice?.toFixed(2) + '\\nRSI: ' + trade.closeRsi?.toFixed(2) + '\\nPosition Size: ' + trade.currentSize.toFixed(2) + ' USDT\\nProfit: ' + trade.profitPercent?.toFixed(2) + '%',
                });
            }

            // Add markers for additional entries (averaging)
            if (trade.entries.length > 1) {
                let runningSize = trade.entries[0].size;
                for (let i = 1; i < trade.entries.length; i++) {
                    const entry = trade.entries[i];
                    runningSize += entry.size;
                    markers.push({
                        time: Math.floor(entry.timestamp / 1000),
                        position: 'belowBar',
                        color: trade.type === 'LONG' ? '#4CAF5088' : '#FF525288',
                        shape: 'circle',
                        text: 'Add to ' + trade.type + '\\nPrice: ' + entry.price.toFixed(2) + '\\nRSI: ' + entry.entryRsi?.toFixed(2) + '\\nAdd Size: ' + entry.size.toFixed(2) + ' USDT\\nPosition Size: ' + runningSize.toFixed(2) + ' USDT',
                    });
                }
            }
        }

        // Set the data
        candlestickSeries.setData(${JSON.stringify(candleData)});
        rsiSeries.setData(${JSON.stringify(rsiValues)});

        // Set markers after data is loaded
        setTimeout(() => {
            candlestickSeries.setMarkers(markers);
            
            // Add RSI levels with labels
            const rsiLevels = [
                { price: ${config.longEntryRsi}, color: '#26a69a', lineWidth: 1, lineStyle: 1, label: 'Long Entry' },
                { price: ${config.longExitRsi}, color: '#ef5350', lineWidth: 1, lineStyle: 1, label: 'Long Exit' },
                { price: ${config.shortEntryRsi}, color: '#ef5350', lineWidth: 1, lineStyle: 1, label: 'Short Entry' },
                { price: ${config.shortExitRsi}, color: '#26a69a', lineWidth: 1, lineStyle: 1, label: 'Short Exit' },
            ];
            
            rsiLevels.forEach((level) => {
                const series = rsiChart.addLineSeries({
                    color: level.color,
                    lineWidth: level.lineWidth,
                    lineStyle: level.lineStyle,
                    title: level.label,
                });
                
                series.setData([
                    { time: candleData[0].time, value: level.price },
                    { time: candleData[candleData.length - 1].time, value: level.price },
                ]);
            });

            // Fit the content after all data is loaded
            priceChart.timeScale().fitContent();
            rsiChart.timeScale().fitContent();
        }, 100);

        // Add RSI levels with labels
        const rsiLevels = [
            { price: ${config.longEntryRsi}, color: '#26a69a', lineWidth: 1, lineStyle: 1, label: 'Long Entry' },
            { price: ${config.longExitRsi}, color: '#ef5350', lineWidth: 1, lineStyle: 1, label: 'Long Exit' },
            { price: ${config.shortEntryRsi}, color: '#ef5350', lineWidth: 1, lineStyle: 1, label: 'Short Entry' },
            { price: ${config.shortExitRsi}, color: '#26a69a', lineWidth: 1, lineStyle: 1, label: 'Short Exit' },
        ];

        // Add timeframe selection functionality
        const timeframeButtons = document.querySelectorAll('.timeframe-btn');
        const defaultTimeframe = '${config.timeframe}';
        const defaultMinutes = defaultTimeframe.includes('m') ? 
            parseInt(defaultTimeframe) : 
            defaultTimeframe.includes('h') ? 
                parseInt(defaultTimeframe) * 60 : 
                parseInt(defaultTimeframe) * 1440;

        // Set initial active button
        timeframeButtons.forEach(btn => {
            if (parseInt(btn.dataset.minutes) === defaultMinutes) {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', async (e) => {
                // Update active button
                timeframeButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const minutes = parseInt(e.target.dataset.minutes);
                
                // Get raw data with proper timestamp handling
                const rawData = ${JSON.stringify(historicalData)};

                try {
                    // Aggregate candles for the selected timeframe
                    const aggregatedCandles = aggregateCandles(rawData, minutes);
                    
                    if (aggregatedCandles.length === 0) {
                        console.error('No data after aggregation');
                        return;
                    }

                    // Update candlestick series
                    await candlestickSeries.setData(aggregatedCandles);
                    
                    // Recalculate RSI for new timeframe
                    const closePrices = aggregatedCandles.map(d => d.close);
                    const rsiPeriod = 14;
                    const rsiData = calculateRSI(closePrices, rsiPeriod).map((value, i) => ({
                        time: aggregatedCandles[i + rsiPeriod - 1].time,
                        value: value
                    }));
                    
                    // Update RSI series
                    await rsiSeries.setData(rsiData);

                    // Update markers for the new timeframe
                    const adjustedMarkers = markers.map(marker => ({
                        ...marker,
                        time: Math.floor(marker.time)
                    }));

                    // Set markers after data update
                    setTimeout(() => {
                        candlestickSeries.setMarkers(adjustedMarkers);
                        
                        // Fit content after all updates
                        priceChart.timeScale().fitContent();
                        rsiChart.timeScale().fitContent();
                    }, 100);

                } catch (error) {
                    console.error('Error updating chart:', error);
                }
            });
        });

        // Function to aggregate candles to a larger timeframe
        function aggregateCandles(rawCandles, targetMinutes) {
            if (!Array.isArray(rawCandles) || rawCandles.length === 0) {
                console.error('Invalid or empty candle data');
                return [];
            }

            // For 1-minute timeframe, use subCandlesticks
            if (targetMinutes === 1) {
                const allSubCandles = [];
                rawCandles.forEach(candle => {
                    if (candle.subCandlesticks && Array.isArray(candle.subCandlesticks)) {
                        candle.subCandlesticks.forEach(subCandle => {
                            allSubCandles.push({
                                time: Math.floor(subCandle.timestamp / 1000),
                                open: subCandle.openPrice,
                                high: subCandle.highPrice,
                                low: subCandle.lowPrice,
                                close: subCandle.closePrice,
                                volume: subCandle.volume
                            });
                        });
                    }
                });
                return allSubCandles.sort((a, b) => a.time - b.time);
            }

            // For 5-minute timeframe, aggregate subCandlesticks
            if (targetMinutes === 5) {
                const allSubCandles = [];
                rawCandles.forEach(candle => {
                    if (candle.subCandlesticks && Array.isArray(candle.subCandlesticks)) {
                        candle.subCandlesticks.forEach(subCandle => {
                            allSubCandles.push({
                                timestamp: subCandle.timestamp,
                                openPrice: subCandle.openPrice,
                                highPrice: subCandle.highPrice,
                                lowPrice: subCandle.lowPrice,
                                closePrice: subCandle.closePrice,
                                volume: subCandle.volume
                            });
                        });
                    }
                });

                // Now aggregate these 1m candles into 5m candles
                const result = [];
                let currentCandle = null;
                const msPerMinute = 60 * 1000;
                const sortedCandles = allSubCandles.sort((a, b) => a.timestamp - b.timestamp);

                sortedCandles.forEach(candle => {
                    const timeGroup = Math.floor(candle.timestamp / (5 * msPerMinute)) * 5 * 60;

                    if (!currentCandle || currentCandle.time !== timeGroup) {
                        if (currentCandle) {
                            result.push(currentCandle);
                        }
                        currentCandle = {
                            time: timeGroup,
                            open: candle.openPrice,
                            high: candle.highPrice,
                            low: candle.lowPrice,
                            close: candle.closePrice,
                            volume: candle.volume
                        };
                    } else {
                        currentCandle.high = Math.max(currentCandle.high, candle.highPrice);
                        currentCandle.low = Math.min(currentCandle.low, candle.lowPrice);
                        currentCandle.close = candle.closePrice;
                        currentCandle.volume += candle.volume;
                    }
                });

                if (currentCandle) {
                    result.push(currentCandle);
                }

                return result;
            }

            // For larger timeframes, aggregate the 15m candles as before
            const result = [];
            let currentCandle = null;
            const msPerMinute = 60 * 1000;
            const sortedCandles = [...rawCandles].sort((a, b) => a.timestamp - b.timestamp);

            sortedCandles.forEach(candle => {
                const timeGroup = Math.floor(candle.timestamp / (targetMinutes * msPerMinute)) * targetMinutes * 60;

                if (!currentCandle || currentCandle.time !== timeGroup) {
                    if (currentCandle) {
                        result.push(currentCandle);
                    }
                    currentCandle = {
                        time: timeGroup,
                        open: candle.openPrice,
                        high: candle.highPrice,
                        low: candle.lowPrice,
                        close: candle.closePrice,
                        volume: candle.volume
                    };
                } else {
                    currentCandle.high = Math.max(currentCandle.high, candle.highPrice);
                    currentCandle.low = Math.min(currentCandle.low, candle.lowPrice);
                    currentCandle.close = candle.closePrice;
                    currentCandle.volume += candle.volume;
                }
            });

            if (currentCandle) {
                result.push(currentCandle);
            }

            return result;
        }

        // Function to calculate RSI
        function calculateRSI(prices, period = 14) {
            const deltas = prices.slice(1).map((price, i) => price - prices[i]);
            const gains = deltas.map(d => d > 0 ? d : 0);
            const losses = deltas.map(d => d < 0 ? -d : 0);

            let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
            let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

            const rsi = [100 - (100 / (1 + avgGain / avgLoss))];

            for (let i = period; i < prices.length - 1; i++) {
                avgGain = (avgGain * (period - 1) + gains[i]) / period;
                avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
                rsi.push(100 - (100 / (1 + avgGain / avgLoss)));
            }

            return rsi;
        }
    </script>
</body>
</html>`;

  // Create a Blob containing the HTML content
  const blob = new Blob([html], { type: "text/html" });

  // Create a URL for the Blob
  return URL.createObjectURL(blob);
}
