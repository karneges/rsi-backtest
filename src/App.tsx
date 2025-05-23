import React, { useState, useEffect } from "react";
import { TradingModelForm } from "./components/TradingModelForm";
import { TradeConfig, BacktestResult } from "./types";
import { RsiTradeBasedModel } from "./models/rsiTradeBasedModel";
import { generateData, OKXService } from "./services/okx.service";
import { TradingViewChart } from "./components/TradingViewChart";
import { CandlestickWithSubCandlesticksAndRsi, OkxCandlesticksData } from "./types/okx.types";
import { TradeTable } from "./components/TradeTable";
import "./App.css";
import { ProgressLoader } from "./components/ProgressLoader";
import { useDataWorker } from "./hooks/useDataWorker";

interface OkxCacheEntry {
  //   data: CandlestickWithSubCandlesticksAndRsi[];
  data: OkxCandlesticksData[];
  timeframe: string;
  timestamp: number;
  amountOfCandlesticks: number;
}

// Helper function to get config from URL params
const getConfigFromUrl = (): Partial<TradeConfig> => {
  const params = new URLSearchParams(window.location.search);
  const config: Partial<TradeConfig> = {};

  // Define parameter types for proper parsing
  const numberParams = [
    "leverage",
    "longEntryRsi",
    "longExitRsi",
    "shortEntryRsi",
    "shortExitRsi",
    "breakEvenThreshold",
    "minProfitPercent",
    "fixedPositionSize",
    "addPositionSize",
    "maxLossEntries",
    "positionAddDelay",
    "limit",
    "cacheTTL",
    "rsiPeriod",
    "atrPeriod",
    "avgAtrPeriod",
    "atrTradeMultiplier",
  ];
  // Parse all parameters
  params.forEach((value, key) => {
    if (numberParams.includes(key)) {
      // Special case for positionAddDelay which needs to be in milliseconds
      if (key === "positionAddDelay") {
        config[key as keyof TradeConfig] = (Number(value) * 1000) as any; // Convert seconds to milliseconds
      } else {
        config[key as keyof TradeConfig] = Number(value) as any;
      }
    } else {
      config[key as keyof TradeConfig] = value as any;
    }
  });

  return config;
};

// Helper function to update URL with config
const updateUrlWithConfig = (config: TradeConfig) => {
  const params = new URLSearchParams();

  Object.entries(config).forEach(([key, value]) => {
    // Convert positionAddDelay from milliseconds to seconds for URL
    if (key === "positionAddDelay") {
      params.set(key, String(Number(value) / 1000));
    } else {
      params.set(key, String(value));
    }
  });

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, "", newUrl);
};

type Stage = "idle" | "main-candles" | "sub-candles" | "trades" | "processing" | "complete";

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [historicalData, setHistoricalData] = useState<CandlestickWithSubCandlesticksAndRsi[] | null>(null);
  const [initialConfig, setInitialConfig] = useState<Partial<TradeConfig> | undefined>(undefined);
  const [okxCacheData, setOkxCachedData] = useState<{
    [key: string]: OkxCacheEntry;
  }>({});
  const [historicalDataKeyState, setHistoricalDataKey] = useState<string | null>(null);
  const [mainCandlesProgress, setMainCandlesProgress] = useState(0);
  const [subCandlesProgress, setSubCandlesProgress] = useState(0);
  const [tradesProgress, setTradesProgress] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [totalMainCandles, setTotalMainCandles] = useState(0);
  const [totalSubCandles, setTotalSubCandles] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const { generateDataAsync, backTestAsync } = useDataWorker();

  // Load initial config from URL on mount
  useEffect(() => {
    const urlConfig = getConfigFromUrl();
    if (Object.keys(urlConfig).length > 0) {
      setInitialConfig(urlConfig);
    }
  }, []);

  const handleSubmit = async (config: TradeConfig) => {
    setError(null);
    setIsLoading(true);
    setStage("main-candles");

    try {
      let data: OkxCandlesticksData[];
      const cacheKey = config.symbol;
      const now = Date.now();
      let candlesReFetched = false;

      // Check if we have valid cached data
      const isOkxCacheValid =
        okxCacheData[cacheKey] &&
        okxCacheData[cacheKey].timeframe === config.timeframe &&
        okxCacheData[cacheKey].amountOfCandlesticks === config.limit &&
        config.cacheTTL > 0 && // Only use cache if TTL > 0
        now - okxCacheData[cacheKey].timestamp < config.cacheTTL * 60 * 1000; // Convert minutes to milliseconds
      const okxService = new OKXService();

      if (isOkxCacheValid && okxCacheData[cacheKey].data.length > 0) {
        console.log("Using cached data for", config.symbol);
        data = okxCacheData[cacheKey].data;
      } else {
        // Fetch new data if not cached, cache expired, or timeframe changed
        console.log(
          "Fetching new data for",
          config.symbol,
          isOkxCacheValid
            ? ""
            : config.cacheTTL === 0
            ? "(caching disabled)"
            : okxCacheData[cacheKey]
            ? "(cache expired)"
            : "(not in cache)",
        );

        data = await okxService.getCandlesticksWithSubCandlesticks(
          {
            instId: config.symbol,
            bar: config.timeframe,
            limit: config.limit,
            subCandlesticksTimeFrame: "1m",
          },
          //   {
          //     rsiPeriod: config.rsiPeriod,
          //     atrPeriod: config.atrPeriod,
          //     avgAtrPeriod: config.avgAtrPeriod,
          //   },
          {
            onMainCandlestickStart: (amountOfFetched: number) => {
              setStage("main-candles");
              setTotalMainCandles(amountOfFetched);
              setMainCandlesProgress(0);
            },

            onMainCandlestickProgress: (amountOfFetched: number, totalAmount: number) => {
              setMainCandlesProgress(amountOfFetched);
            },
            onMainCandlestickEnd: (amountOfFetched: number) => {
              setMainCandlesProgress(amountOfFetched);
            },
            onSubCandlestickStart: (amountOfFetched: number) => {
              setStage("sub-candles");
              setTotalSubCandles(amountOfFetched);
              setSubCandlesProgress(0);
            },
            onSubCandlestickEnd: (amountOfFetched: number) => {
              setSubCandlesProgress(amountOfFetched);
            },
            onSubCandlestickProgress: (amountOfFetched: number, totalAmount: number) => {
              setSubCandlesProgress(amountOfFetched);
            },
            onTradesGenerationStart: (amountOfTrades: number) => {
              setStage("trades");
              setTotalTrades(amountOfTrades);
              setTradesProgress(0);
            },
            onTradesGenerationProgress: (amountOfTrades: number, totalAmount: number) => {
              setTradesProgress(amountOfTrades);
            },
          },
        );

        // Cache the new data if caching is enabled
        candlesReFetched = true;
        if (config.cacheTTL > 0) {
          setOkxCachedData((prev) => ({
            ...prev,
            [cacheKey]: {
              amountOfCandlesticks: config.limit,
              data,
              timeframe: config.timeframe,
              timestamp: now,
            },
          }));
        }
      }
      const historicalDataKey = cacheKey + config.atrPeriod + config.rsiPeriod + config.avgAtrPeriod;
      // TODO fix cache
      let generatedData: CandlestickWithSubCandlesticksAndRsi[] = historicalData || [];
      if (historicalDataKey !== historicalDataKeyState || !historicalData || candlesReFetched) {
        setIsLoading(true);
        setStage("trades");
        setTradesProgress(0);
        generatedData = await generateDataAsync(
          data,
          {
            atrPeriod: config.atrPeriod,
            rsiPeriod: config.rsiPeriod,
            avgAtrPeriod: config.avgAtrPeriod,
          },
          {
            onTradesGenerationStart: (amountOfTrades: number) => {
              setTotalTrades(amountOfTrades);
              setTradesProgress(0);
            },
            onTradesGenerationProgress: (amountOfTrades: number) => {
              setTradesProgress(amountOfTrades);
            },
          },
        );
        setHistoricalData(generatedData);
        setHistoricalDataKey(historicalDataKey);
      }
      // Initialize the trading model with the config and historical data
      // const model = new RsiTradeBasedModel(config, generatedData!);

      // // Run the backtest
      // const backtestResult = await model.runTradeBasedBacktest();

      // setResult(backtestResult);
      setStage("processing");

      // Run backtest with processed data
      // const modelProcessed = new RsiTradeBasedModel(config, generatedData!);
      // const resultProcessed = await modelProcessed.runTradeBasedBacktest();
      const resultProcessed = await backTestAsync(generatedData, config);
      setResult(resultProcessed);
      setHistoricalData(generatedData!);
      setStage("complete");
      updateUrlWithConfig(config);
      setIsLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
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
        <TradingModelForm onSubmit={handleSubmit} initialConfig={initialConfig} />

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

        {result && historicalData && !isLoading && (
          <div className="results">
            <h2>Backtest Results</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Profit</h3>
                <p className={result.stats.totalProfit >= 0 ? "profit" : "loss"}>
                  {result.stats.totalProfit.toFixed(2)} USDT
                </p>
              </div>
              <div className="stat-card">
                <h3>Win Rate</h3>
                <p>{result.stats.winRate.toFixed(2)}%</p>
                <small>
                  {result.stats.winningTrades} winning, {result.stats.losingTrades} losing
                </small>
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
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
