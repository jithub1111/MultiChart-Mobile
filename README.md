# Multichart Mobile

A thinkorswim-style multi-chart workspace that runs in a phone or desktop browser.

## What it does today

- **Layout** (pencil) button for edit mode: tap the + on any side of a panel to add a chart, Level II or Time & Sales there, or remove and change panels
- Resize panels by dragging the bars between them
- Panel types: **Chart**, **Level II**, **Time & Sales**, **Level II + T&S** (both side by side in one box), **Fundamentals** and **Watchlist**
- **Fundamentals** panel with four tabs: **News** (Yahoo Finance and Google News merged, repeats removed, newest first), **Key statistics** (from Schwab, plus float, short interest and ownership from Yahoo Finance and Finviz side by side), **Company profile** and **SEC filings** (from the SEC's EDGAR site, with filters for reports, 8-Ks, insider trades, big holders and offerings). Needs the Schwab helper
- **Watchlist** panel: named lists of tickers with last price, change, % change and volume. The panel menu's **Columns** adds or removes columns: bid, ask, spread, open, high, low, previous close, gap %, average and relative volume, 52-week high and low, name, market cap, float and P/E. When the columns don't fit, the list slides sideways and the symbol stays in view. Tap a ticker to open it on every panel with the same link color. Tap **+** to add tickers (several at once works), tap a column heading to sort, drag the line between two headings to change column widths (the panel menu can reset them), and use the panel menu's **Edit list** to drag rows into order or remove them. Tap the list name to switch lists or make a new one. In Layout mode, the left or right **+** also offers a watchlist **down the whole side**, which stays put when the phone turns. Any chart's menu can add its symbol to the watchlist. With Schwab, the prices stream live
- On a phone or tablet the layout turns with the screen: 2 across by 4 down in portrait becomes 4 across by 2 down in landscape, and Level II stays next to its Time & Sales. Each tab remembers its sizes for each orientation. Turn it off in Chart settings
- Chart settings also switch between **pinch to zoom** and **highlight to zoom** (drag across a chart to zoom into that stretch). With highlight to zoom, the scroll wheel moves the chart through time and Ctrl + wheel (or a trackpad pinch) zooms
- **Double-click** (or double-tap) a chart to zoom all the way out over everything that's loaded, as in thinkorswim: all 16 days of minute bars, or all 6 years of daily bars. The button on the chart (**Whole day**, **All N days** or **Back to 6M**) goes back. Double-clicking the price or time scale still just resets that scale
- Link groups (1–5) keep panels on the same symbol, like thinkorswim's colored link numbers
- **Full** / **Charts only** switch hides everything except the charts
- **Colors** panel: change every color (backgrounds, borders, headers, candles, VWAP, each Level II price level, Time & Sales), or start from the Dark, DAS classic or Light theme
- **TOS Theme Candles** (in Colors, next to Light) switches just the candles to thinkorswim's: hollow green up candles, solid salmon down candles, and white candles that close where they opened. The rest of your colors stay. **Hollow up candles** and **Flat candles** can also be set on their own in the Charts section
- **TOS Theme Full** makes the whole chart look like thinkorswim: those candles, near-black panels, dotted grid, dashed lines between days, plain sans-serif labels, solid volume bars in their own strip (it turns on **Separate volume chart**), magenta VWAP, gray pre-market and after-hours shading, and green bid / red ask in the panel headers
- DAS-style Level II: each price level has its own background color on both the bid and ask side. **Level II options** in the panel menu switches between the **Colored** (DAS) and **Basic** (plain, like thinkorswim) styles, and shows or hides the MMID, Size and **Cumulative size** (the running total of shares from the best price) columns, and **Group by price** puts all the orders at one price on a single row
- **Text size** in the menu of each Level II, Time & Sales and Level II + T&S panel, from 70% to 200%
- **Workspace tabs**: Tab 1, Tab 2 and so on, each with its own layout. Tap the open tab to rename, duplicate or close it
- **Pop out a tab** (on a computer): the tab's menu has **Pop out to a new window**, which opens that tab in a window of its own to drag onto another monitor. The main window marks it with a dashed outline and an arrow; tap it there to show its window or bring it back (closing the window brings it back too). Every open window shares one live Schwab connection: the first window holds it and passes prices to the others, and if it closes another one takes over. Alerts, drawings, watchlists, colors and zoom changed in one window show up in the others
- **Desktop app**: in Chrome or Edge, **Chart settings → Install desktop app** (or the install icon in the address bar) installs Multichart with its own window and Start menu, Dock or taskbar icon. In Safari on a Mac, use **File → Add to Dock**. It updates by itself like the web page
- **Saved layouts**: name and save the current layout from the Layout menu, then load it later
- **Drawing tools** (the line button on each chart): price levels and trendlines. Drawings belong to the symbol, so they show on every chart and timeframe for it
- **Price alerts**: set them by tapping a price on the chart or from the Alerts menu. When one hits, a pop-up appears and the app beeps. Email and text delivery will come with the live data server
- Faded ticker watermark behind each chart
- **Picture-in-picture** (in **Chart settings**): keeps Multichart floating over other apps. In Chrome or Edge on a computer, the whole app, with all its buttons, opens in a small window that stays on top; the main window waits until it closes, and any changes made in the small window carry over. Safari, iPhone and iPad only let video float, so there it shows a live, view-only picture of the current tab. Each panel's menu also has **Float this panel** to float just that one. iPhone may pause the picture while you are in another app
- **Zoom**: the − / + buttons next to Colors in the top bar scale the whole interface from 50% to 200%. Tap the percentage to go back to **Auto**, which picks a size for the screen (smaller on phones, larger on big monitors)
- Charts: timeframes 1m, 2m, 5m, 15m, 30m, 1h, daily and weekly, with candles, volume and a session VWAP. The box next to the timeframe picks how much the chart opens on: 1, 2, 3, 5 or 10 days for intraday charts, and 1M, 3M, 6M, YTD, 1Y, 2Y or 5Y for daily and weekly ones
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
- **Fundamentals**: key statistics come from Schwab. The helper also fetches news from Yahoo Finance and Google News, company details and filings from the SEC, float and short interest from Yahoo Finance and Finviz (remembered for 6 hours), and a short company description from Wikipedia, since a web page can't read those sites directly. The SEC turns away automated requests that don't include a contact email, so the first time the Profile or Filings tab needs one it asks for an email. The helper saves it (not the app's public code) and sends it only to the SEC
- Schwab asks you to sign in again every 7 days. The app reminds you a day ahead

### Setting up the Schwab helper

1. In Cloudflare, open **Workers & Pages** once, then create an API token from the **Edit Cloudflare Workers** template
2. In this repository's **Settings → Secrets and variables → Actions**, add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
   `SCHWAB_APP_KEY` (Schwab calls it Client ID), `SCHWAB_APP_SECRET` (Client Secret) and `APP_PASSWORD` (a password you choose)
3. The **Deploy Schwab helper** action runs whenever `worker/` changes on `main` (or run it by hand from the Actions tab).
   Its summary shows the helper address
4. In the app, open **Data source → Schwab**, enter the helper address and app password, then follow the sign-in steps
5. On other devices the app already knows the helper address and asks only for the app password. Or use
   **Copy setup link** under Data source → Schwab: opening that link on another device turns live data on there
   straight away (it carries the app password, so only send it to yourself)

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

**Full screen on iPhone:** open the site in Safari, tap Share, then **Add to Home Screen**. Opened from
the Home Screen icon, the app runs without Safari's bars. iPhone keeps a Home Screen app's settings
separate from Safari's. To bring everything over, tap the data badge in Safari, go to **Move your setup**, and
tap **Copy all my settings**. Then open the Home Screen app and paste them into the box at the top of the panel
that opens. The same works for moving to another computer or phone.

## Roadmap

1. Live data from Alpaca's free plan as a stand-in (done)
2. Schwab developer app approved (done)
3. Schwab helper and live Schwab data (built, first real test pending)
4. Email and text alerts sent from the helper
5. Save layouts across devices, install to the home screen, then package for the App Store and Google Play
