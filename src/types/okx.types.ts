import { Trade } from "../utils/trade-generator";

export interface OKXResponse<T> {
  code: string;
  msg: string;
  data: T;
}

export interface GetInstrumentsParams {
  instType: string;
}

export interface GetCandlesticksParams {
  instId: string;
  bar?: string;
  limit: number;
  before?: string; // Unix timestamp in milliseconds
  after?: string; // Unix timestamp in milliseconds
}

export interface Instrument {
  instType: string;
  instId: string;
  uly: string;
  category: string;
  baseCcy: string;
  quoteCcy: string;
  settleCcy: string;
  ctVal: string;
  ctMult: string;
  ctValCcy: string;
  optType: string;
  stk: string;
  listTime: string;
  expTime: string;
  lever: string;
  tickSz: string;
  lotSz: string;
  minSz: string;
  ctType: string;
  alias: string;
  state: string;
}

export interface Candlestick {
  timestamp: number; // Unix timestamp (ms)
  openPrice: number; // Open price
  highPrice: number; // Highest price
  lowPrice: number; // Lowest price
  closePrice: number; // Close price
  volume: number; // Trading volume (base currency)
  volumeCurrency: number; // Trading volume (quote currency)
  confirmationFlag: number; // Whether this candle is confirmed
}

export interface CandlestickWithTrades extends Candlestick {
  trades: Trade[];
}

export interface CandlestickWithSubCandlesticksAndRsi extends Candlestick {
  subCandlesticks: CandlestickWithTrades[];
  trades: Trade[];

  rsi: number;
}

// Raw candlestick data as returned by OKX API
export type RawCandlestick = [
  string, // ts
  string, // o
  string, // h
  string, // l
  string, // c
  string, // vol
  string, // volCcy
  string, // confirm
];
