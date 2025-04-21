import React, { useState } from 'react';
import { TradeConfig } from '../types';

interface TradingModelFormProps {
    onSubmit: (config: TradeConfig) => void;
}

export const TradingModelForm: React.FC<TradingModelFormProps> = ({ onSubmit }) => {
    const [config, setConfig] = useState<TradeConfig>({
        symbol: 'BTC-USDT',
        timeframe: '15m',
        longEntryRsi: 30,
        longExitRsi: 55,
        shortEntryRsi: 70,
        shortExitRsi: 45,
        leverage: 10,
        fixedPositionSize: 1,
        addPositionSize: 0.5, // Default to half of the initial position size
        breakEvenThreshold: 1,
        minProfitPercent: 1,
        maxLossEntries: 3,
        positionAddDelay: 60000, // 60 seconds in milliseconds
        limit: 200, // Default value for number of candlesticks
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(config);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig(prev => ({
            ...prev,
            [name]: name.includes('Rsi') || name.includes('leverage') || name.includes('Size') || 
                    name.includes('Threshold') || name.includes('Percent') || name.includes('Entries') ? 
                    Number(value) : value
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="trading-model-form">
            <div className="form-section">
                <h3>Market Configuration</h3>
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
                        max="1000"
                        step="50"
                    />
                </div>
            </div>

            <div className="form-section">
                <h3>RSI Settings</h3>
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

            <div className="form-section">
                <h3>Position Settings</h3>
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
                        onChange={(e) => handleChange({
                            ...e,
                            target: { ...e.target, value: String(Number(e.target.value) * 1000), name: 'positionAddDelay' }
                        })}
                        min="0"
                    />
                </div>
            </div>

            <button type="submit" className="submit-button">Start Trading Model</button>
        </form>
    );
}; 