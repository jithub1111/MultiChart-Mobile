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

All prices are **simulated demo data** for now.

## Running it

Open `index.html` in any browser. There is no build step. Charts use
[Lightweight Charts](https://github.com/tradingview/lightweight-charts) 4.2.0, loaded from jsDelivr.

## Roadmap

1. Register a Schwab developer app (Market Data Production) and wait for approval
2. Add a small private server that signs in to Schwab and streams live quotes, candles, Level II and Time & Sales to the app
3. Save layouts across devices, install to the home screen, then package for the App Store and Google Play
