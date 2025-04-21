import React, { useState } from 'react';
import { TradingModelForm } from './components/TradingModelForm';
import { TradeConfig, BacktestResult } from './types';
import { RsiTradeBasedModel } from './models/rsiTradeBasedModel';
import { OKXService } from './services/okx.service';
import { TradingViewChart } from './components/TradingViewChart';
import { CandlestickWithSubCandlesticksAndRsi } from './types/okx.types';
import { TradeTable } from './components/TradeTable';
import './App.css';
import { ProgressLoader } from './components/ProgressLoader';

interface CacheEntry {
    data: CandlestickWithSubCandlesticksAndRsi[];
    timeframe: string;
    timestamp: number;
}

const App: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [historicalData, setHistoricalData] = useState<CandlestickWithSubCandlesticksAndRsi[] | null>(null);
    // Add cache for historical data with timestamps
    const [cachedData, setCachedData] = useState<{
        [key: string]: CacheEntry
    }>({});
    const [mainCandlesProgress, setMainCandlesProgress] = useState(0);
    const [subCandlesProgress, setSubCandlesProgress] = useState(0);
    const [tradesProgress, setTradesProgress] = useState(0);
    const [stage, setStage] = useState<'idle' | 'main-candles' | 'sub-candles' | 'trades' | 'complete'>('idle');
    const [totalMainCandles, setTotalMainCandles] = useState(0);
    const [totalSubCandles, setTotalSubCandles] = useState(0);
    const [totalTrades, setTotalTrades] = useState(0);

    const handleSubmit = async (config: TradeConfig) => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            let data: CandlestickWithSubCandlesticksAndRsi[];
            const cacheKey = config.symbol;
            const now = Date.now();

            // Check if we have valid cached data
            const isCacheValid = cachedData[cacheKey] && 
                               cachedData[cacheKey].timeframe === config.timeframe &&
                               config.cacheTTL > 0 && // Only use cache if TTL > 0
                               (now - cachedData[cacheKey].timestamp) < (config.cacheTTL * 60 * 1000); // Convert minutes to milliseconds

            if (isCacheValid) {
                console.log('Using cached data for', config.symbol);
                data = cachedData[cacheKey].data;
            } else {
                // Fetch new data if not cached, cache expired, or timeframe changed
                console.log('Fetching new data for', config.symbol, 
                    isCacheValid ? '' : 
                    config.cacheTTL === 0 ? '(caching disabled)' : 
                    cachedData[cacheKey] ? '(cache expired)' : '(not in cache)');
                
                const okxService = new OKXService();
                data = await okxService.getCandlesticksWithSubCandlesticks({
                    instId: config.symbol,
                    bar: config.timeframe,
                    limit: config.limit,
                    subCandlesticksTimeFrame: "1m",
                    
                },  { 
                onMainCandlestickStart: (amountOfFetched) => {
                    setStage('main-candles');
                    setTotalMainCandles(amountOfFetched);
                    setMainCandlesProgress(0);
                },

                onMainCandlestickProgress: (amountOfFetched, totalAmount) => {
                    setMainCandlesProgress(amountOfFetched);
                },
                onMainCandlestickEnd: (amountOfFetched) => {
                    setMainCandlesProgress(amountOfFetched);
                },
                onSubCandlestickStart: (amountOfFetched) => {
                    setStage('sub-candles');
                    setTotalSubCandles(amountOfFetched);
                    setSubCandlesProgress(0);
                },
                onSubCandlestickEnd: (amountOfFetched) => {
                    setSubCandlesProgress(amountOfFetched);
                },
                onSubCandlestickProgress: (amountOfFetched, totalAmount) => {
                    setSubCandlesProgress(amountOfFetched);
                },
                onTradesGenerationStart: (amountOfTrades) => {
                    setStage('trades');
                    setTotalTrades(amountOfTrades);
                    setTradesProgress(0);
                },
            }
                );

                // Cache the new data if caching is enabled
                if (config.cacheTTL > 0) {
                    setCachedData(prev => ({
                        ...prev,
                        [cacheKey]: {
                            data,
                            timeframe: config.timeframe,
                            timestamp: now
                        }
                    }));
                }
            }

            // Initialize the trading model with the config and historical data
            const model = new RsiTradeBasedModel(config, data);

            // Run the backtest
            const backtestResult = await model.runTradeBasedBacktest();

            setResult(backtestResult);
            setHistoricalData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="app">
            <header className="app-header">
                <h1>RSI Trading Model</h1>
                <p>Configure and run your RSI-based trading strategy</p>
            </header>

            <main className="app-main">
                <TradingModelForm onSubmit={handleSubmit} />

                {isLoading && (
                    <ProgressLoader
                        mainCandlesProgress={mainCandlesProgress}
                        subCandlesProgress={subCandlesProgress}
                        tradesProgress={tradesProgress}
                        stage={stage}
                        totalMainCandles={totalMainCandles}
                        totalSubCandles={totalSubCandles}
                        totalTrades={totalTrades}
                    />
                )}

                {error && (
                    <div className="error">
                        <h3>Error</h3>
                        <p>{error}</p>
                    </div>
                )}

                {result && historicalData && (
                    <div className="results">
                        <h2>Backtest Results</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <h3>Total Profit</h3>
                                <p className={result.stats.totalProfit >= 0 ? 'profit' : 'loss'}>
                                    {result.stats.totalProfit.toFixed(2)} USDT
                                </p>
                            </div>
                            <div className="stat-card">
                                <h3>Win Rate</h3>
                                <p>{result.stats.winRate.toFixed(2)}%</p>
                                <small>{result.stats.winningTrades} winning, {result.stats.losingTrades} losing</small>
                            </div>
                            <div className="stat-card">
                                <h3>Max Drawdown</h3>
                                <p className="loss">{result.stats.maxDrawdown.toFixed(2)}%</p>
                            </div>
                            <div className="stat-card">
                                <h3>Sharpe Ratio</h3>
                                <p>{result.stats.sharpeRatio.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="chart-container">
                            <TradingViewChart result={result} historicalData={historicalData} />
                        </div>
                        <TradeTable result={result} />

                        <div className="recent-trades">
                            <h3>Recent Trades</h3>
                            <table>
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
                                    {result.trades.slice(-10).map((trade, index) => (
                                        <tr key={index}>
                                            <td>{trade.type}</td>
                                            <td>{new Date(trade.openTimestamp).toLocaleString()}</td>
                                            <td>
                                                {trade.closeTimestamp 
                                                    ? new Date(trade.closeTimestamp).toLocaleString() 
                                                    : 'Open'}
                                            </td>
                                            <td>{trade.averageEntryPrice.toFixed(2)}</td>
                                            <td>{trade.closePrice?.toFixed(2) || '-'}</td>
                                            <td className={trade.profit && trade.profit >= 0 ? 'profit' : 'loss'}>
                                                {trade.profit?.toFixed(2) || '-'} USDT
                                                ({trade.profitPercent?.toFixed(2) || '-'}%)
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default App; 