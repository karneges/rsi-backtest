import React, { useState, useEffect } from "react";
import { TradeConfig } from "../types";

interface TradingModelFormProps {
  onSubmit: (config: TradeConfig) => void;
  initialConfig?: Partial<TradeConfig>;
}

// Default configuration with current version
const DEFAULT_CONFIG: TradeConfig & { version: number } = {
  version: 1, // Increment this when making breaking changes to the config structure
  symbol: "BTC-USDT",
  timeframe: "15m",
  longEntryRsi: 30,
  longExitRsi: 55,
  shortEntryRsi: 70,
  shortExitRsi: 45,
  leverage: 10,
  fixedPositionSize: 1,
  addPositionSize: 0.5,
  breakEvenThreshold: 1,
  minProfitPercent: 1,
  maxLossEntries: 3,
  positionAddDelay: 60000,
  limit: 200,
  cacheTTL: 5,
  closeStrategy: "rsi", // Add default close strategy
  rsiPeriod: 14,
  atrPeriod: 14,
  avgAtrPeriod: 14,
  atrTradeMultiplier: 0,
};

const STORAGE_KEY = "trading_model_config";

export const TradingModelForm: React.FC<TradingModelFormProps> = ({ onSubmit, initialConfig }) => {
  const [config, setConfig] = useState<TradeConfig>(() => {
    // First try to use initialConfig from URL if available
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      return { ...DEFAULT_CONFIG, ...initialConfig };
    }

    // Then try to use saved config from localStorage
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);

        // Check if saved config is compatible with current version
        if (!parsed.version || parsed.version < DEFAULT_CONFIG.version) {
          console.log("Outdated config version, using defaults with saved values where possible");
          // Merge saved values with default config where keys match
          const mergedConfig = { ...DEFAULT_CONFIG };
          Object.keys(parsed).forEach((key) => {
            if (key in DEFAULT_CONFIG && key !== "version") {
              (mergedConfig as any)[key] = parsed[key];
            }
          });
          return mergedConfig;
        }

        return parsed;
      }
    } catch (error) {
      console.error("Error loading saved config:", error);
    }
    return DEFAULT_CONFIG;
  });

  // Update config when initialConfig changes
  useEffect(() => {
    if (initialConfig && Object.keys(initialConfig).length > 0) {
      setConfig((prev) => ({ ...prev, ...initialConfig }));
    }
  }, [initialConfig]);

  // Save config to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...config, version: DEFAULT_CONFIG.version }));
    } catch (error) {
      console.error("Error saving config:", error);
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(config);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    setConfig((prev) => ({
      ...prev,
      [name]:
        name.includes("rsi") ||
        name.includes("leverage") ||
        name.includes("size") ||
        name.includes("threshold") ||
        name.includes("percent") ||
        name.includes("entries") ||
        name.includes("atr") ||
        name === "limit" ||
        name === "cacheTTL" ||
        name === "atrPeriod" ||
        name == "avgAtrPeriod" ||
        name === "atrTradeMultiplier" ||
        name.includes("period")
          ? Number(value)
          : value,
    }));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all settings to default values?")) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="trading-model-form">
      <div className="form-section">
        <h3>Market Configuration</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="symbol">Trading Pair</label>
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={config.symbol}
              onChange={handleChange}
              placeholder="e.g., BTC-USDT"
            />
          </div>

          <div className="form-group">
            <label htmlFor="timeframe">Timeframe</label>
            <select id="timeframe" name="timeframe" value={config.timeframe} onChange={handleChange}>
              <option value="1m">1 minute</option>
              <option value="5m">5 minutes</option>
              <option value="15m">15 minutes</option>
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
              <option value="4h">4 hours</option>
              <option value="1d">1 day</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="limit">Number of Candlesticks</label>
            <input
              type="number"
              id="limit"
              name="limit"
              value={config.limit}
              onChange={handleChange}
              min="50"
              max="10000"
              step="50"
            />
          </div>

          <div className="form-group">
            <label htmlFor="cacheTTL">Cache Duration (minutes)</label>
            <input
              type="number"
              id="cacheTTL"
              name="cacheTTL"
              value={config.cacheTTL}
              onChange={handleChange}
              min="0"
              max="60"
              step="1"
              title="Time to live for candlesticks cache in minutes (0 = no cache)"
            />
            <small className="input-help">Set to 0 to disable caching</small>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Indicator Settings</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="rsiPeriod">RSI Period</label>
            <input type="number" id="rsiPeriod" name="rsiPeriod" value={config.rsiPeriod} onChange={handleChange} />
          </div>

          <div className="form-group">
            <label htmlFor="atrPeriod">ATR Period</label>
            <input
              type="number"
              id="atrPeriod"
              name="atrPeriod"
              value={config.atrPeriod}
              onChange={handleChange}
              min="2"
              max="50"
              step="1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="avgAtrPeriod">Average ATR Period</label>
            <input
              type="number"
              id="avgAtrPeriod"
              name="avgAtrPeriod"
              value={config.avgAtrPeriod}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
      <div className="form-section">
        <h3>ATR Settings</h3>
        <div className="form-group">
          <label htmlFor="atrTradeMultiplier">ATR Trade Multiplier (0 = disabled)</label>

          <input
            type="number"
            id="atrTradeMultiplier"
            name="atrTradeMultiplier"
            value={config.atrTradeMultiplier}
            onChange={handleChange}
            min="0"
            step="0.1"
            max="100"
          />
        </div>
      </div>
      <div className="form-section">
        <h3>RSI Settings</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="longEntryRsi">Long Entry RSI</label>
            <input
              type="number"
              id="longEntryRsi"
              name="longEntryRsi"
              value={config.longEntryRsi}
              onChange={handleChange}
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="longExitRsi">Long Exit RSI</label>
            <input
              type="number"
              id="longExitRsi"
              name="longExitRsi"
              value={config.longExitRsi}
              onChange={handleChange}
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="shortEntryRsi">Short Entry RSI</label>
            <input
              type="number"
              id="shortEntryRsi"
              name="shortEntryRsi"
              value={config.shortEntryRsi}
              onChange={handleChange}
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="shortExitRsi">Short Exit RSI</label>
            <input
              type="number"
              id="shortExitRsi"
              name="shortExitRsi"
              value={config.shortExitRsi}
              onChange={handleChange}
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Position Settings</h3>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="leverage">Leverage</label>
            <input
              type="number"
              id="leverage"
              name="leverage"
              value={config.leverage}
              onChange={handleChange}
              min="1"
              max="100"
            />
          </div>

          <div className="form-group">
            <label htmlFor="closeStrategy">Close Strategy</label>
            <select id="closeStrategy" name="closeStrategy" value={config.closeStrategy} onChange={handleChange}>
              <option value="rsi">RSI + Profit</option>
              <option value="profit">Profit</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fixedPositionSize">Initial Position Size (USDT)</label>
            <input
              type="number"
              id="fixedPositionSize"
              name="fixedPositionSize"
              value={config.fixedPositionSize}
              onChange={handleChange}
              min="0.1"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="addPositionSize">Add Position Size (USDT)</label>
            <input
              type="number"
              id="addPositionSize"
              name="addPositionSize"
              value={config.addPositionSize}
              onChange={handleChange}
              min="0.1"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="breakEvenThreshold">Break Even Threshold (%)</label>
            <input
              type="number"
              id="breakEvenThreshold"
              name="breakEvenThreshold"
              value={config.breakEvenThreshold}
              onChange={handleChange}
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="minProfitPercent">Minimum Profit (%)</label>
            <input
              type="number"
              id="minProfitPercent"
              name="minProfitPercent"
              value={config.minProfitPercent}
              onChange={handleChange}
              min="0"
              step="0.1"
            />
          </div>

          <div className="form-group">
            <label htmlFor="maxLossEntries">Maximum Loss Entries</label>
            <input
              type="number"
              id="maxLossEntries"
              name="maxLossEntries"
              value={config.maxLossEntries}
              onChange={handleChange}
              min="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="positionAddDelay">Position Add Delay (seconds)</label>
            <input
              type="number"
              id="positionAddDelay"
              name="positionAddDelay"
              value={config.positionAddDelay / 1000} // Convert from ms to seconds for display
              onChange={(e) =>
                handleChange({
                  ...e,
                  target: { ...e.target, value: String(Number(e.target.value) * 1000), name: "positionAddDelay" },
                })
              }
              min="0"
            />
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="submit-button">
          Start Trading Model
        </button>
        <button type="button" onClick={handleReset} className="reset-button">
          Reset to Defaults
        </button>
      </div>
    </form>
  );
};
