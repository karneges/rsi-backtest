import axios, { AxiosInstance } from "axios";
import {
  OKXResponse,
  Instrument,
  Candlestick,
  GetInstrumentsParams,
  GetCandlesticksParams,
  RawCandlestick,
  CandlestickWithSubCandlesticksAndRsi,
  OkxCandlesticksData,
} from "../types/okx.types";

import { generateSyntheticTrades } from "../utils/trade-generator";
import { calculateRSIWithTrades, RsiAtrPeriodConfig } from "../indicators/rsi";

export class OKXService {
  private readonly api: AxiosInstance;
  private readonly baseUrl = "https://www.okx.com";

  constructor() {
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Get instrument information
   * @param params Parameters for getting instruments
   * @returns Promise with instrument data
   */
  async getInstruments(params: GetInstrumentsParams): Promise<Instrument[]> {
    try {
      const response = await this.api.get<OKXResponse<Instrument[]>>("/api/v5/public/instruments", {
        params,
      });
      return response.data.data;
    } catch (error) {
      console.error("Error fetching instruments:", error);
      throw error;
    }
  }

  /**
   * Convert raw candlestick data to structured format
   * @param rawCandle Raw candlestick data from OKX API
   * @returns Structured candlestick data
   */
  private convertCandlestick = (rawCandle: RawCandlestick): Candlestick => {
    const [ts, o, h, l, c, vol, volCcy, confirm] = rawCandle;
    return {
      timestamp: parseInt(ts, 10),
      openPrice: parseFloat(o),
      highPrice: parseFloat(h),
      lowPrice: parseFloat(l),
      closePrice: parseFloat(c),
      volume: parseFloat(vol),
      volumeCurrency: parseFloat(volCcy),
      confirmationFlag: parseInt(confirm, 10),
    };
  };

  /**
   * Get candlestick data
   * @param params Parameters for getting candlesticks
   * @returns Promise with candlestick data
   */
  async getCandlesticks(params: GetCandlesticksParams): Promise<Candlestick[]> {
    try {
      const response = await this.api.get<OKXResponse<RawCandlestick[]>>("/api/v5/market/history-mark-price-candles", {
        params: {
          ...params,
          bar: params.bar || "1m",
          limit: params.limit || 100,
        },
      });
      return response.data.data.map(this.convertCandlestick);
    } catch (error) {
      console.error("Error fetching candlesticks:", error);
      throw error;
    }
  }

  async getCandlesticksWithSubCandlesticks(
    params: GetCandlesticksParams & { subCandlesticksTimeFrame: string },
    // periodConfig: RsiAtrPeriodConfig,
    callBacks: {
      onMainCandlestickStart?: (amountOfFetched: number) => void;
      onMainCandlestickProgress?: (amountOfFetched: number, totalAmount: number) => void;
      onMainCandlestickEnd?: (amountOfFetched: number) => void;
      onSubCandlestickStart?: (amountOfFetched: number) => void;
      onSubCandlestickProgress?: (amountOfFetched: number, totalAmount: number) => void;
      onSubCandlestickEnd?: (amountOfFetched: number) => void;
      onTradesGenerationStart?: (amountOfTrades: number) => void;
      onTradesGenerationProgress?: (amountOfTrades: number, totalAmount: number) => void;
    },
  ): Promise<OkxCandlesticksData[]> {
    const mainCandlesticks: Candlestick[] = [];
    callBacks.onMainCandlestickStart?.(params.limit);
    if (params.limit > 100) {
      let initialAfter = Date.now();
      for (let i = 0; i < params.limit; i += 100) {
        const response = await this.getCandlesticks({
          instId: params.instId,
          bar: params.bar,
          limit: 100,
          after: initialAfter.toString(),
        });
        mainCandlesticks.push(...response);
        initialAfter = response[response.length - 1]?.timestamp!;
        callBacks.onMainCandlestickProgress?.(mainCandlesticks.length, params.limit);
      }
    } else {
      mainCandlesticks.push(...(await this.getCandlesticks(params)));
    }
    callBacks.onMainCandlestickEnd?.(mainCandlesticks.length);
    const lastCandlestick = mainCandlesticks[mainCandlesticks.length - 1];
    const lastCandlestickTimestamp = lastCandlestick?.timestamp;

    let initialAfter = Date.now();
    let subCandlesticks: Candlestick[] = [];
    mainCandlesticks.reverse();
    console.log(initialAfter);
    callBacks.onSubCandlestickStart?.(params.limit * 15);
    while (true) {
      if (!initialAfter) {
        break;
      }
      const response = await this.getCandlesticks({
        instId: params.instId,
        bar: params.subCandlesticksTimeFrame,
        after: initialAfter.toString(),
        limit: 100,
      });

      if (response.length < 100) {
      }
      let lastCandlestick = response[response.length - 1];
      subCandlesticks.push(...response);
      callBacks.onSubCandlestickProgress?.(subCandlesticks.length, params.limit * 15);
      if (lastCandlestick?.timestamp! < lastCandlestickTimestamp!) {
        break;
      }
      initialAfter = lastCandlestick?.timestamp!;
      console.log(initialAfter);
    }
    callBacks.onSubCandlestickEnd?.(subCandlesticks.length);

    const mappedCandlesticks = mainCandlesticks.reduce((acc, next, i, arr) => {
      const currentCandleTimestamp = next.timestamp;
      const nextCandleTimestamp = arr[i + 1]?.timestamp;
      if (!nextCandleTimestamp) {
        acc[currentCandleTimestamp] = { matchedSubCandlesticks: [], mainCandlestick: next };
        return acc;
      }
      const matchedSubCandlesticks = subCandlesticks.filter(
        (subCandle) => subCandle.timestamp >= currentCandleTimestamp && subCandle.timestamp < nextCandleTimestamp,
      );
      matchedSubCandlesticks.reverse();
      acc[currentCandleTimestamp] = { matchedSubCandlesticks, mainCandlestick: next };
      return acc;
    }, {} as Record<number, { matchedSubCandlesticks: Candlestick[]; mainCandlestick: Candlestick }>);

    const candlesticksWithSubCandlesticks = Object.values(mappedCandlesticks).map(
      ({ matchedSubCandlesticks, mainCandlestick }) => ({
        ...mainCandlestick,
        subCandlesticks: matchedSubCandlesticks,
      }),
    );

    // callBacks.onTradesGenerationStart?.(candlesticksWithSubCandlesticks.length * 15 * 60);
    // const generatedTrades = candlesticksWithSubCandlesticks.map((candlestick) => {
    //   const generatedTradesWithSubCandlesticks = candlestick.subCandlesticks.map((subCandlestick) => {
    //     const trades = generateSyntheticTrades({ ...subCandlestick }, 60);
    //     return trades;
    //   });
    //   callBacks.onTradesGenerationProgress?.(
    //     generatedTradesWithSubCandlesticks.flat().length,
    //     candlesticksWithSubCandlesticks.length * 15 * 60,
    //   );
    //   return {
    //     ...candlestick,
    //     trades: generatedTradesWithSubCandlesticks.flat(),
    //   };
    // });
    // const rsiResult = calculateRSIWithTrades(generatedTrades, periodConfig);
    // generatedTrades.forEach((candle, index) => {
    //   //@ts-ignore
    //   candle.rsi = rsiResult[index].candleRsi;
    //   //@ts-ignore
    //   candle.atr = rsiResult[index].candleAtr;
    //   candle.trades.forEach((trade, tradeIndex) => {
    //     trade.rsi = rsiResult[index].trades[tradeIndex]?.rsi || 50;
    //     trade.atr = rsiResult[index].trades[tradeIndex]?.atr || 0;
    //     trade.avgAtr = rsiResult[index].trades[tradeIndex]?.avgAtr || 0;
    //   });
    // });
    // debugger;
    // //@ts-ignore
    // return generatedTrades;
    return candlesticksWithSubCandlesticks;
  }

  generateData = (
    candlesticksWithSubCandlesticks: OkxCandlesticksData[],
    periodConfig: RsiAtrPeriodConfig,
  ): CandlestickWithSubCandlesticksAndRsi[] => {
    const generatedTrades = candlesticksWithSubCandlesticks.map((candlestick) => {
      const generatedTradesWithSubCandlesticks = candlestick.subCandlesticks.map((subCandlestick) => {
        const trades = generateSyntheticTrades({ ...subCandlestick }, 60);
        return trades;
      });
      // callBacks.onTradesGenerationProgress?.(
      //   generatedTradesWithSubCandlesticks.flat().length,
      //   candlesticksWithSubCandlesticks.length * 15 * 60,
      // );
      return {
        ...candlestick,
        trades: generatedTradesWithSubCandlesticks.flat(),
      };
    });
    const rsiResult = calculateRSIWithTrades(generatedTrades, periodConfig);
    generatedTrades.forEach((candle, index) => {
      //@ts-ignore
      candle.rsi = rsiResult[index].candleRsi;
      //@ts-ignore
      candle.atr = rsiResult[index].candleAtr;
      candle.trades.forEach((trade, tradeIndex) => {
        trade.rsi = rsiResult[index].trades[tradeIndex]?.rsi || 50;
        trade.atr = rsiResult[index].trades[tradeIndex]?.atr || 0;
        trade.avgAtr = rsiResult[index].trades[tradeIndex]?.avgAtr || 0;
      });
    });
    //@ts-ignore
    return generatedTrades;
  };
}

export const generateData = (
  candlesticksWithSubCandlesticks: OkxCandlesticksData[],
  periodConfig: RsiAtrPeriodConfig,
  callBacks: {
    onTradesGenerationProgress?: (amountOfTrades: number, totalAmount: number) => void;
    onTradesGenerationStart?: (amountOfTrades: number) => void;
  },
): CandlestickWithSubCandlesticksAndRsi[] => {
  callBacks.onTradesGenerationStart?.(candlesticksWithSubCandlesticks.length * 15 * 60);
  const generatedTrades = candlesticksWithSubCandlesticks.map((candlestick) => {
    const generatedTradesWithSubCandlesticks = candlestick.subCandlesticks.map((subCandlestick) => {
      const trades = generateSyntheticTrades({ ...subCandlestick }, 60);
      return trades;
    });
    callBacks.onTradesGenerationProgress?.(
      generatedTradesWithSubCandlesticks.flat().length,
      candlesticksWithSubCandlesticks.length * 15 * 60,
    );
    return {
      ...candlestick,
      trades: generatedTradesWithSubCandlesticks.flat(),
    };
  });
  const rsiResult = calculateRSIWithTrades(generatedTrades, periodConfig);
  generatedTrades.forEach((candle, index) => {
    //@ts-ignore
    candle.rsi = rsiResult[index].candleRsi;
    //@ts-ignore
    candle.atr = rsiResult[index].candleAtr;
    candle.trades.forEach((trade, tradeIndex) => {
      trade.rsi = rsiResult[index].trades[tradeIndex]?.rsi || 50;
      trade.atr = rsiResult[index].trades[tradeIndex]?.atr || 0;
      trade.avgAtr = rsiResult[index].trades[tradeIndex]?.avgAtr || 0;
    });
  });
  //@ts-ignore
  return generatedTrades;
};
