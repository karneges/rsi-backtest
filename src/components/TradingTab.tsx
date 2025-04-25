import React, { useState, useEffect } from "react";
import { TradingModelForm } from "./TradingModelForm";
import { TradeConfig, BacktestResult } from "../types";
import { OKXService } from "../services/okx.service";
import { TradingViewChart } from "./TradingViewChart";
import { CandlestickWithSubCandlesticksAndRsi, OkxCandlesticksData } from "../types/okx.types";
import { TradeTable } from "./TradeTable";
import { ProgressLoader } from "./ProgressLoader";
import { useDataWorker } from "../hooks/useDataWorker";

interface OkxCacheEntry {
  data: OkxCandlesticksData[];
  timeframe: string;
  timestamp: number;
  amountOfCandlesticks: number;
}

type Stage = "idle" | "main-candles" | "sub-candles" | "trades" | "processing" | "complete";

interface TradingTabProps {
  initialConfig?: Partial<TradeConfig>;
  okxCacheData: { [key: string]: OkxCacheEntry };
  onCacheUpdate: (newCache: { [key: string]: OkxCacheEntry }) => void;
}

export const TradingTab: React.FC<TradingTabProps> = ({ initialConfig, okxCacheData, onCacheUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [historicalData, setHistoricalData] = useState<CandlestickWithSubCandlesticksAndRsi[] | null>(null);
  const [historicalDataKeyState, setHistoricalDataKey] = useState<string | null>(null);
  const [mainCandlesProgress, setMainCandlesProgress] = useState(0);
  const [subCandlesProgress, setSubCandlesProgress] = useState(0);
  const [tradesProgress, setTradesProgress] = useState(0);
  const [stage, setStage] = useState<Stage>("idle");
  const [totalMainCandles, setTotalMainCandles] = useState(0);
  const [totalSubCandles, setTotalSubCandles] = useState(0);
  const [totalTrades, setTotalTrades] = useState(0);
  const { generateDataAsync, backTestAsync } = useDataWorker();

  const handleSubmit = async (config: TradeConfig) => {
    setError(null);
    setIsLoading(true);
    setStage("main-candles");

    try {
      let data: OkxCandlesticksData[];
      const cacheKey = config.symbol;
      const now = Date.now();
      let candlesReFetched = false;

      const isOkxCacheValid =
        okxCacheData[cacheKey] &&
        okxCacheData[cacheKey].timeframe === config.timeframe &&
        okxCacheData[cacheKey].amountOfCandlesticks === config.limit &&
        config.cacheTTL > 0 &&
        now - okxCacheData[cacheKey].timestamp < config.cacheTTL * 60 * 1000;

      const okxService = new OKXService();

      if (isOkxCacheValid && okxCacheData[cacheKey].data.length > 0) {
        console.log("Using cached data for", config.symbol);
        data = okxCacheData[cacheKey].data;
      } else {
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
          {
            onMainCandlestickStart: (amountOfFetched: number) => {
              setStage("main-candles");
              setTotalMainCandles(amountOfFetched);
              setMainCandlesProgress(0);
            },
            onMainCandlestickProgress: (amountOfFetched: number) => {
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
            onSubCandlestickProgress: (amountOfFetched: number) => {
              setSubCandlesProgress(amountOfFetched);
            },
            onTradesGenerationStart: (amountOfTrades: number) => {
              setStage("trades");
              setTotalTrades(amountOfTrades);
              setTradesProgress(0);
            },
            onTradesGenerationProgress: (amountOfTrades: number) => {
              setTradesProgress(amountOfTrades);
            },
          },
        );

        candlesReFetched = true;
        if (config.cacheTTL > 0) {
          const newCache = {
            ...okxCacheData,
            [cacheKey]: {
              amountOfCandlesticks: config.limit,
              data,
              timeframe: config.timeframe,
              timestamp: now,
            },
          };
          onCacheUpdate(newCache);
        }
      }

      const historicalDataKey = cacheKey + config.atrPeriod + config.rsiPeriod + config.avgAtrPeriod;
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

      setStage("processing");
      const resultProcessed = await backTestAsync(generatedData, config);
      setResult(resultProcessed);
      setHistoricalData(generatedData!);
      setStage("complete");
      setIsLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="trading-tab">
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
    </div>
  );
};
