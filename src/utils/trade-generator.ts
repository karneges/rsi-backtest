import { Candlestick } from "../types/okx.types";

export interface Trade {
  price: number;
  timestamp: number;
  rsi?: number; // Added RSI value for each trade
  atr?: number; // Added ATR value for each trade
  avgAtr?: number; // Added ATR value for each trade
}

interface MarketState {
  trend: number; // Current price trend (-1 to 1)
  volatility: number; // Current volatility level (0 to 1)
  momentum: number; // Price momentum (-1 to 1)
  lastPrice: number; // Last traded price
  priceLevel: number; // Current price level within the range
}

interface CandlestickWithRSI extends Candlestick {
  rsi: number; // RSI value for the candlestick
  atr: number; // ATR value for the candlestick
}

export function generateSyntheticTrades(
  candle: Candlestick,
  count: number,
  candleDurationMs: number = 15 * 60 * 1000,
): Trade[] {
  const { timestamp, openPrice, highPrice, lowPrice, closePrice, volume, volumeCurrency } = candle;

  // Validate input
  if (
    lowPrice > highPrice ||
    openPrice < lowPrice ||
    openPrice > highPrice ||
    closePrice < lowPrice ||
    closePrice > highPrice
  ) {
    throw new Error("Invalid candlestick: prices out of range");
  }
  if (count < 2 || count > 100000) {
    throw new Error("Invalid trade count: must be between 2 and 100,000");
  }
  if (volume < 0 || volumeCurrency < 0) {
    throw new Error("Invalid volume: must be non-negative");
  }
  if (count === 0) {
    return [];
  }

  // Initialize trades array
  const trades: Trade[] = [];

  // Parameters for price movement
  const priceRange = highPrice - lowPrice;
  const volatility = priceRange * 0.1; // 10% of range for random noise
  const isBullish = closePrice > openPrice;
  const isBearish = closePrice < openPrice;
  const midPoint = Math.floor(count / 2); // Middle of the candle for high/low peak

  // Calculate volume per trade (with some randomness)
  const avgVolumePerTrade = volume / count;
  const volumeVariation = avgVolumePerTrade * 0.5; // Allow 50% variation

  // Generate Poisson-like timestamps
  const timestamps: number[] = [];
  const lambda = count / candleDurationMs; // Rate for Poisson process
  let currentTime = 0;
  for (let i = 0; i < count; i++) {
    // Exponential distribution for inter-trade intervals
    const interTradeTime = -Math.log(1 - Math.random()) / lambda;
    currentTime += interTradeTime;
    if (currentTime >= candleDurationMs) {
      break; // Stop if exceeding candle duration
    }
    timestamps.push(timestamp + currentTime);
  }
  // Fill remaining trades if needed
  while (timestamps.length < count) {
    timestamps.push(timestamp + Math.random() * candleDurationMs);
  }
  // Sort timestamps and ensure they fit within candle duration
  timestamps.sort((a, b) => a - b);
  timestamps[0] = timestamp; // First trade at candle start
  if (count > 1) {
    timestamps[count - 1] = timestamp + candleDurationMs; // Last trade at candle end
  }

  // Generate price path
  let currentPrice = openPrice;
  const highPriceIndex = Math.floor(count * 0.25 + Math.random() * count * 0.25); // Random point in first half
  const lowPriceIndex = Math.floor(count * 0.5 + Math.random() * count * 0.25); // Random point in second half

  for (let i = 0; i < count; i++) {
    const progress = i / (count - 1); // Progress through the candle (0 to 1)

    // Simulate price movement
    if (i === highPriceIndex) {
      // Explicitly hit highPrice
      currentPrice = highPrice;
    } else if (i === lowPriceIndex) {
      // Explicitly hit lowPrice
      currentPrice = lowPrice;
    } else if (i < midPoint && (isBullish || isBearish)) {
      // Move towards highPrice (bullish) or lowPrice (bearish) in the first half
      const target = isBullish ? highPrice : lowPrice;
      const trend = (target - currentPrice) / (midPoint - i + 1); // Gradual move to target
      currentPrice += trend;
    } else {
      // Move towards closePrice in the second half
      const trend = (closePrice - currentPrice) / (count - i + 1); // Gradual move to closePrice
      currentPrice += trend;
    }

    // Add random noise
    const noise = (Math.random() - 0.5) * volatility;
    currentPrice += noise;

    // Ensure price stays within [lowPrice, highPrice]
    currentPrice = Math.max(lowPrice, Math.min(highPrice, currentPrice));

    // For the first and last trade, set exact prices
    if (i === 0) {
      currentPrice = openPrice;
    } else if (i === count - 1) {
      currentPrice = closePrice;
    }

    // Generate volume for the trade
    const tradeVolume = Math.max(0, avgVolumePerTrade + (Math.random() - 0.5) * volumeVariation);

    trades.push({
      price: Number(currentPrice.toFixed(6)), // Round to 4 decimal places
      timestamp: Math.floor(timestamps[i]),
    });
  }

  return trades;
}
