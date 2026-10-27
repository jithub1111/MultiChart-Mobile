# Multichart Mobile

A thinkorswim-style multi-chart workspace that runs in a phone or desktop browser.

## What it does today

- **Edit layout** mode: tap the + on any side of a panel to add a chart, Level II or Time & Sales there, or remove and change panels
- Resize panels by dragging the bars between them
- Panel types: **Chart**, **Level II** and **Time & Sales**
- Link groups (1–5) keep panels on the same symbol, like thinkorswim's colored link numbers
- **Full** / **Charts only** switch hides the Level II and Time & Sales panels
- **Colors** panel: change every color (backgrounds, borders, headers, candles, VWAP, each Level II price level, Time & Sales), or start from the Dark, DAS classic or Light theme
- DAS-style Level II: each price level has its own background color on both the bid and ask side
- **Workspace tabs**: Tab 1, Tab 2 and so on, each with its own layout. Tap the open tab to rename, duplicate or close it
- **Saved layouts**: name and save the current layout from the Layout menu, then load it later
- **Drawing tools** (the line button on each chart): price levels and trendlines. Drawings belong to the symbol, so they show on every chart and timeframe for it
- **Price alerts**: set them by tapping a price on the chart or from the Alerts menu. When one hits, a pop-up appears and the app beeps. Email and text delivery will come with the live data server
- Faded ticker watermark behind each chart
- **Zoom**: the − / + buttons next to Colors in the top bar scale the whole interface from 50% to 200%. Tap the percentage to go back to **Auto**, which picks a size for the screen (smaller on phones, larger on big monitors)
- Charts: timeframes 1m, 2m, 5m, 15m, 30m, 1h, daily and weekly, with candles, volume and a session VWAP
- Your layout is saved in the browser on each device

## Data

Prices are **simulated demo data** until you switch on live data. Tap the **Demo data** badge next to
the app name to open the Data source panel.

**Schwab** uses your own Schwab account through a small helper (the `worker/` folder) that runs free on
Cloudflare Workers. The helper keeps your Schwab app keys and your sign-in, so they never sit in the web page.

- **Charts**: full-market candles, including pre-market and after-hours
- **Last price and bid/ask**: real time
- **Level II**: real Nasdaq and NYSE order books
- **Time & Sales**: built from Schwab's last-trade updates (Schwab offers no full tape feed, so busy stocks show fewer prints than thinkorswim)
- Schwab asks you to sign in again every 7 days. The app reminds you a day ahead

### Setting up the Schwab helper

1. In Cloudflare, open **Workers & Pages** once, then create an API token from the **Edit Cloudflare Workers** template
2. In this repository's **Settings → Secrets and variables → Actions**, add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
   `SCHWAB_APP_KEY` (Schwab calls it Client ID), `SCHWAB_APP_SECRET` (Client Secret) and `APP_PASSWORD` (a password you choose)
3. The **Deploy Schwab helper** action runs whenever `worker/` changes on `main` (or run it by hand from the Actions tab).
   Its summary shows the helper address
4. In the app, open **Data source → Schwab**, enter the helper address and app password, then follow the sign-in steps

**Alpaca** uses a free [Alpaca](https://alpaca.markets) paper account until the Schwab connection is ready:

- **Charts**: full-market candles. The free plan holds back the most recent 15 minutes, so that
  stretch is built from IEX trades and is swapped for full-market candles each minute as it catches up
  (volume in that stretch looks small, because IEX carries only a few percent of trading)
- **Last price, bid/ask and Time & Sales**: real time from the IEX exchange
- **Level II**: still simulated, since no free source offers market depth
- Up to 30 symbols streaming at once; US-listed stocks and ETFs only (no OTC symbols)
- The free plan allows one live connection, so keep the app open in one tab or device at a time

Your Alpaca keys are entered in the app and saved only in that browser. They are never stored in this repository.
The live connection does not work inside the Claude preview, which blocks outside connections, so live data
needs the app hosted somewhere else (for example GitHub Pages).

## Running it

Open `index.html` in any browser. There is no build step. Charts use
[Lightweight Charts](https://github.com/tradingview/lightweight-charts) 4.2.0, loaded from jsDelivr.

## Roadmap

1. Live data from Alpaca's free plan as a stand-in (done)
2. Schwab developer app approved (done)
3. Schwab helper and live Schwab data (built, first real test pending)
4. Email and text alerts sent from the helper
5. Save layouts across devices, install to the home screen, then package for the App Store and Google Play
