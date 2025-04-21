import { OkxService } from './services/okxService';
import { getMinutesFromTimeframe } from './utils/timeframe';

/**
 * Debug script to investigate trade mapping to candles
 */
async function debugTrades() {
  try {
    // Configuration
    const symbol = 'PIPPIN-USDT-SWAP';
    const timeframe = '15m';
    const daysToFetch = 5;
    
    console.log(`===== Debugging OKX API =====`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Timeframe: ${timeframe}`);
    console.log(`Days to fetch: ${daysToFetch}`);
    
    // Fetch historical candle data first
    console.log('\nFetching historical candle data...');
    const okxService = new OkxService();
    const historicalData = await okxService.fetchHistoricalData(
      symbol, 
      timeframe,
      Math.ceil((daysToFetch * 24 * 60) / getMinutesFromTimeframe(timeframe))
    );
    
    console.log(`Fetched ${historicalData.length} candles from ${new Date(historicalData[0].timestamp).toLocaleDateString()} to ${new Date(historicalData[historicalData.length - 1].timestamp).toLocaleDateString()}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the debug function
debugTrades().catch(console.error); 