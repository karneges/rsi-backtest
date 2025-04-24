import { CandlestickWithSubCandlesticksAndRsi, CandlestickWithTrades } from "../types/okx.types";

/**
 * Calculate RSI (Relative Strength Index) matching TradingView's implementation
 * @param prices Array of price values
 * @param period RSI period (default: 14)
 * @returns Array of RSI values with the same length as input prices
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (prices.length < period + 1) {
    throw new Error(`Not enough data to calculate RSI with period ${period}`);
  }

  // Calculate price changes
  const priceChanges: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    priceChanges.push(prices[i] - prices[i - 1]);
  }

  // Calculate gains and losses
  const gains: number[] = priceChanges.map((change) => (change > 0 ? change : 0));
  const losses: number[] = priceChanges.map((change) => (change < 0 ? Math.abs(change) : 0));

  const rsiValues: number[] = [];

  // Initial averages for the first RSI value
  let avgGain = gains.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  // Calculate first RSI
  let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
  let rsi = 100 - 100 / (1 + rs);
  rsiValues.push(rsi);

  // Calculate remaining RSI values using Wilder's smoothing method
  for (let i = period; i < priceChanges.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
    rsi = 100 - 100 / (1 + rs);
    rsiValues.push(rsi);
  }

  return [...Array(period).fill(50), ...rsiValues];
}

const calculateRsi = (candles: number[], period: number = 14) => {
  if (candles.length < period + 1) {
    // throw new Error(`Not enough data to calculate RSI with period ${period}`);
    return Array(candles.length).fill(50);
  }

  // Calculate RSI for candles
  const priceChanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    priceChanges.push(candles[i] - candles[i - 1]);
  }

  const gains: number[] = priceChanges.map((change) => (change > 0 ? change : 0));
  const losses: number[] = priceChanges.map((change) => (change < 0 ? Math.abs(change) : 0));

  const candleRSI: number[] = [];
  let avgGain = gains.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
  let rsi = 100 - 100 / (1 + rs);
  candleRSI.push(rsi);

  for (let i = period; i < priceChanges.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
    rsi = 100 - 100 / (1 + rs);
    candleRSI.push(rsi);
  }

  return [...Array(period).fill(50), ...candleRSI];
};
const calculateATR = (candles: CandlestickWithTrades[], period: number = 14): number[] => {
  if (candles.length < 2) {
    throw new Error("Not enough data to calculate ATR");
  }

  // Calculate True Range (TR) for each candle
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    const highLow = current.highPrice - current.lowPrice;
    const highPrevClose = Math.abs(current.highPrice - previous.closePrice);
    const lowPrevClose = Math.abs(previous.closePrice - current.lowPrice);
    const trueRange = Math.max(highLow, highPrevClose, lowPrevClose);
    trueRanges.push(trueRange);
  }

  // Calculate ATR using Wilder's smoothing method
  const atrValues: number[] = [];
  let avgTR = trueRanges.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  atrValues.push(avgTR);

  for (let i = period; i < trueRanges.length; i++) {
    avgTR = (avgTR * (period - 1) + trueRanges[i]) / period;
    atrValues.push(avgTR);
  }

  // Fill initial values with 0
  return [...Array(period).fill(0), ...atrValues];
};
interface RSIAntATRResult {
  candleRsi: number;
  candleAtr: number;
  trades: { rsi: number; atr: number }[];
}
// export function calculateRSIWithTrades(candles: CandlestickWithTrades[], period: number = 14): RSIResult[] {
//   const finalCandleRSI = calculateRsi(
//     candles.map((c) => c.closePrice),
//     period,
//   );

//   // Initialize result array
//   const result: RSIResult[] = candles.map((_, i) => ({
//     candleRsi: finalCandleRSI[i],
//     trades: [],
//   }));

//   for (let i = period; i < candles.length; i++) {
//     if (candles[i].trades.length > 0) {
//       // Get prices up to the previous candle
//       const prevPrices = candles.slice(0, i).map((c) => c.closePrice);

//       // Calculate RSI for each trade
//       for (const trade of candles[i].trades) {
//         // Create temporary price array with trade price as the last close
//         const tempPrices = [...prevPrices, trade.price];
//         const tempRsi = calculateRsi(tempPrices, period);
//         result[i].trades.push(tempRsi[tempRsi.length - 1]);
//       }
//     }
//   }
function calculateAverageATR(atrValues: number[], period: number): number[] {
  const avgATR: number[] = [];
  for (let i = 0; i < atrValues.length; i++) {
    if (i < period - 1) {
      avgATR.push(0);
    } else {
      const slice = atrValues.slice(i - period + 1, i + 1);
      const mean = slice.reduce((sum, value) => sum + value, 0) / period;
      avgATR.push(mean);
    }
  }
  return avgATR;
}

export type RsiAtrPeriodConfig = {
  rsiPeriod: number;
  atrPeriod: number;
  avgAtrPeriod: number;
};
interface RSIResult {
  candleRsi: number;
  candleAtr: number;
  avgCandleAtr: number;
  trades: { rsi: number; atr: number; avgAtr?: number }[];
}

export function calculateRSIWithTrades(
  candles: CandlestickWithTrades[],
  periodConfig: RsiAtrPeriodConfig,
): RSIResult[] {
  if (candles.length < periodConfig.rsiPeriod + 1) {
    throw new Error(`Not enough data to calculate RSI and ATR with period ${periodConfig.rsiPeriod}`);
  }

  // Calculate RSI for candles
  const finalCandleRSI = calculateRsi(
    candles.map((c) => c.closePrice),
    periodConfig.rsiPeriod,
  );

  // Calculate ATR for candles
  const finalCandleATR = calculateATR(candles, periodConfig.atrPeriod);

  // Calculate average ATR
  const avgCandleATR = calculateAverageATR(finalCandleATR, periodConfig.avgAtrPeriod);

  // Initialize result array
  const result: RSIResult[] = candles.map((_, i) => ({
    candleRsi: finalCandleRSI[i],
    candleAtr: finalCandleATR[i],
    avgCandleAtr: avgCandleATR[i],
    trades: [],
  }));

  // Calculate RSI and ATR for trades
  for (let i = periodConfig.rsiPeriod; i < candles.length; i++) {
    if (candles[i].trades.length > 0) {
      const prevCandles = candles.slice(0, i);
      for (const trade of candles[i].trades) {
        const tempCandle: CandlestickWithTrades = {
          ...candles[i],
          closePrice: trade.price,
          highPrice: trade.price,
          lowPrice: trade.price,
          trades: [],
        };
        const tempCandles = [...prevCandles, tempCandle];
        const tempRsi = calculateRsi(
          tempCandles.map((c) => c.closePrice),
          periodConfig.rsiPeriod,
        );
        const tempAtr = calculateATR(tempCandles, periodConfig.atrPeriod);
        debugger;
        result[i].trades.push({
          rsi: tempRsi[tempRsi.length - 1],
          atr: tempAtr[tempAtr.length - 1],
          avgAtr: avgCandleATR[i],
        });
      }
    }
  }

  return result;
}

// Calculate RSI for trades
// for (let i = period; i < candles.length; i++) {
//   if (candles[i].trades.length > 0) {
//     // Get prices up to the previous candle
//     const prevPrices = candles.slice(0, i).map((c) => c.closePrice);

//     // Calculate RSI for each trade
//     for (const trade of candles[i].trades) {
//       // Create temporary price array with trade price as the last close
//       const tempPrices = [...prevPrices, trade.price];

//       // Calculate price changes for tempPrices
//       const tempPriceChanges: number[] = [];
//       for (let j = 1; j < tempPrices.length; j++) {
//         tempPriceChanges.push(tempPrices[j] - tempPrices[j - 1]);
//       }

//       // Calculate gains and losses
//       const tempGains = tempPriceChanges.map((change) => (change > 0 ? change : 0));
//       const tempLosses = tempPriceChanges.map((change) => (change < 0 ? Math.abs(change) : 0));

//       // Calculate RSI using Wilder's method
//       let tempAvgGain =
//         tempGains.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
//       let tempAvgLoss =
//         tempLosses.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

//       // Use the latest available RSI value
//       if (tempPriceChanges.length >= period) {
//         const lastIndex = Math.min(period, tempPriceChanges.length - 1);
//         tempAvgGain =
//           tempGains
//             .slice(tempPriceChanges.length - period, tempPriceChanges.length)
//             .reduce((sum, value) => sum + value, 0) / period;
//         tempAvgLoss =
//           tempLosses
//             .slice(tempPriceChanges.length - period, tempPriceChanges.length)
//             .reduce((sum, value) => sum + value, 0) / period;
//         const tradeRS = tempAvgLoss === 0 ? tempAvgGain / 0.001 : tempAvgGain / tempAvgLoss;
//         const tradeRSIValue = 100 - 100 / (1 + tradeRS);
//         result[i].trades.push(tradeRSIValue);
//       } else {
//         // If not enough data, push placeholder (e.g., 50)
//         result[i].trades.push(50);
//       }
//     }
//   }
// }

// return result;}
