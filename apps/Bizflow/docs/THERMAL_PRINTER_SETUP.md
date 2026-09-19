# Thermal Printer Setup Guide

> **Status:** Current. Fully implemented in `src/main/services/ThermalPrinterService.ts`.
> **AI INSTRUCTION:** Thermal printing is handled exclusively in the main process via `node-thermal-printer`. Never call thermal printer APIs directly from the renderer. Use the `receipt:print` IPC channel, plus `receipt:autoConnect`, `receipt:createQueue` and `receipt:renderPreview` for detection and the live preview. The handlers live in `src/main/ipc/handlers/receipt.handlers.ts` and are registered by `registerAllHandlers()` in `src/main/ipc/handlers/index.ts` next to the other kernel handlers - never from inside a plugin - so every module build (coffee, pharmacy, restaurant, …) can print. The renderer reaches them through `window.api.thermalReceipts`, exposed unconditionally by `src/preload/index.ts`.
> **Renderer entry point:** call `printReceipt()`, `autoConnect()` and `renderPreview()` from `src/renderer/src/lib/thermalPrint.ts`. They read the saved receipt settings, fill in the logo and talk to the IPC channel, so plugins never assemble settings themselves.

## Overview
This application supports Egyptian thermal receipt printers with full Arabic language support, ESC/POS commands, and Egyptian tax requirements (الرقم الضريبي).

Arabic is printed as a **graphics (bitmap) receipt** by default. Most 58mm printers - including the XP-58C - ship a Latin/Chinese font ROM, ignore `ESC t` requests for the Arabic code pages and would otherwise print `?`. The receipt is laid out as HTML, rasterised offscreen and streamed with `GS v 0`, so Arabic comes out correctly whatever the printer's ROM contains. See [Arabic Receipts](#arabic-receipts).

## Supported Printers
- **XPrinter** (XP-58, XP-80 series)
- **HOIN** (HOP-E58, HOP-E801)
- **Rongta** (RP80, RP58)
- **Sunmi** (V2, D2)
- **Custom VKP80II**
- Any ESC/POS compatible thermal printer

## Paper Sizes
- **58mm** (Small shops, compact receipts)
- **80mm** (Most common in Egypt, recommended)

## Connection Types

### 1. USB Printers (Most Common)
1. Connect the printer with its USB cable and switch it on
2. In Settings → Tax & Receipt Settings → **Printer**:
   - Select "USB Printer"
   - Click **Connect my printer automatically**. This scans every printer Windows knows about, ranks them (a live USB port on a real 58mm/80mm receipt printer wins; virtual queues such as *Microsoft Print to PDF*, *OneNote* and *Fax* are pushed to the bottom) and stores the best match in **Printer Name**. If the scan is unsure, it says so instead of picking a printer that cannot print paper
   - If a USB print device exists but Windows has no queue on its port, the panel offers **Add printer to Windows**, which creates a raw pass-through queue (Windows may ask for administrator approval)
   - **Refresh list** re-scans without touching the saved printer; **Check printer** and **Fix printer** explain and repair a queue that looks ready but cannot print (see Troubleshooting)
   - Pick a different printer from **Detected Printers** any time - each entry shows its port and any problem (offline, nothing plugged into the port, stuck jobs), and the click stores it in **Printer Name**
   - Click "Print Test Receipt" to print the sample receipt through the exact pipeline a sale uses (design, logo, language and Arabic routing included), so the paper proves what a customer will get
3. The live preview in the same screen stays visible while you work: it is rendered by the same rasteriser the print job uses, so what is on screen is what the head prints
4. If nothing comes out, click **Check printer** and then **Fix printer**:
   - **Check printer** reports whether the queue is switched to "Use Printer Offline", whether the port it points at has a live USB device behind it (Windows keeps one `USB00x` port per socket, so a queue can point at an empty socket and still look ready), and whether failed jobs are blocking it
   - **Fix printer** clears the offline flag, points the queue at the live USB port and clears the stuck jobs

### 2. Network Printers (Ethernet/WiFi)
1. Configure printer's network settings (usually via printer's control panel)
2. Note the printer's IP address (example: 192.168.1.100)
3. In Settings → Tax & Receipt Settings:
   - Select "Network Printer"
   - Enter printer IP address
   - Default port is 9100 (standard for ESC/POS)
   - Click "Test Printer Connection" to verify

#### Finding Network Printer IP:
- **Windows**: `arp -a` (after printing once)
- **Linux**: `nmap -p 9100 192.168.1.0/24`
- **Check printer's LCD display** (if available)
- **Print configuration page** from printer settings

### 3. HTML/Browser Print
For standard desktop printers or PDF generation:
- Select "HTML/Browser Print"
- Uses standard browser print dialog

## Settings Configuration

Everything below lives in **Settings → Tax & Receipt**, which is split into five tabs - *Store*, *Printer*, *Receipt design*, *Arabic* and *Tax & rules* - with the live preview pinned beside them so a change is visible before it is saved.

The **Tax & Receipt** tab is always listed, whatever plugin the app currently has open (and even with no plugin context at all): printer and receipt settings are app-wide, and every sale-capable plugin prints through the same pipeline.

### Saving Your Changes

The screen edits a draft copy. Nothing reaches the printer, the plugins or the paper until **Save Changes** is pressed, because that button is what writes the configuration to storage and every plugin reads it back from there at print time. While edits are pending the page rings the Save button in amber and shows a notice saying so - useful when you have just changed the printer, paper width or receipt language and are wondering why the next sale still prints the old way.

### Store Information (Required)
1. **Store Name**: Your business name (displayed at top of receipt)
2. **Store Address**: Full address
3. **Phone Number**: Contact number with ت: prefix
4. **Email**: Optional store email
5. **Tax Number (الرقم الضريبي)**: **REQUIRED** by Egyptian law
6. **Commercial Register (س.ت)**: Optional registration number

### Printer Settings
1. **Printer Type**: USB / Network / HTML / None
2. **Printer IP**: Only for network printers (example: 192.168.1.100)
3. **Paper Width**: 58mm or 80mm (80mm recommended)
4. **Print Logo**: Enable/disable store logo printing
5. **Print QR Code**: Add QR code with receipt number
6. **Print Barcode**: Add barcode to receipt
7. **Open Cash Drawer**: Automatically open drawer after print
8. **Printer Name**: The Windows print queue to send to (filled in by *Connect my printer automatically*)
9. **Receipt Language**: English or العربية - sets the receipt labels and the text direction
10. **Arabic Render Mode**: *Graphics* (default, works everywhere) or *Printer font* with an Arabic code page
11. **Receipt style / Separator line / Text size**: the design controls described under [Receipt Branding](#receipt-branding)
12. **Print receipt automatically after each sale**: prints without asking first. **On by default**; turn it off if you would rather confirm every print. The checkbox on the pharmacy POS screen and the *Auto* badge in the coffee POS read the same switch.

### Receipt Branding

Set once in Settings → Tax & Receipt → **Receipt design** and **Store**; every receipt picks it up, including the on-screen preview.

1. **Store Logo**: upload a PNG or JPG. It is converted to black and white (receipt printers have one ink colour), resized to **Logo size** (20-100% of the paper width) and printed centred above everything else. *Force black and white logo* is the recommended default for pale or coloured artwork. Remove it to print without a logo.
2. **Header**: free text printed above the store name - branch name, opening hours, a running offer. Each line is printed on its own centred line.
3. **Footer**: free text printed below the thank-you lines - return policy, VAT note, social handles.
4. **Store name / address / phone / tax number**: printed under the logo and the header. *Print store details on the receipt* hides the address, phone and email for shops that only need the name and tax number.
5. **Receipt style** - `Classic` (centred header, dashed separators, roomy spacing), `Compact` (smaller type and tighter spacing to save paper), `Modern` (bold totals, left-aligned header, framed sections).
6. **Separator line** - `Dashed`, `Solid`, `Double` or `None`, drawn between the receipt sections.
7. **Text size** - one control that scales every printed line (0.8x-1.2x) so a long receipt still fits the paper.

**Live preview**: the panel beside the settings renders the sample sale through `receipt:renderPreview`, i.e. through the same HTML → rasteriser → `GS v 0` path as a real print, at the true paper width. The badges above it name the path the receipt will take (**Graphics** or **Printer font**), the code page when one is really used, and the paper size in printer dots. *Print this preview* sends that exact image to the configured printer.

### Arabic Receipts

1. Set **Receipt Language** to العربية. The labels and the money column flip to RTL and numbers stay LTR.
2. Leave **Arabic Render Mode** on *Graphics (works on every printer - recommended)*. The receipt is laid out in HTML, rasterised offscreen and sent as `GS v 0` graphics, so Arabic, English and mixed lines all print correctly.
3. Choose *Printer font* only if the printer really does have an Arabic font; that keeps the fast text path but you must then pick an **Arabic Code Page**:
   - **Detect automatically** - picks the page that can write the whole receipt and falls back to graphics when neither page can.
   - **CP864** - joined letter forms (the classic ESC/POS Arabic page).
   - **WPC1256** - plain Arabic letters.
   The **Arabic** tab has a **Print code pages** button that sends the main-process diagnostic sheet: the same Arabic sentence on both pages, in both visual and logical order, with the page `auto` would have chosen marked. Read the paper - if one attempt shows correct letters, pin that page; if none do, the printer's ROM has no Arabic font and *Graphics* mode is the answer.
4. If the selected code page has no glyph for a character in the receipt (common with CP864, whose table is incomplete), the receipt is rasterised automatically instead of printing `?` or dropping letters. The receipt always prints; only the speed differs. The preview says so in plain words - it switches to **Graphics** and lists the characters that forced the fallback.
5. The **Arabic** tab always previews the sample in Arabic and sends it as Arabic, whatever **Receipt Language** is saved to, so you can prove the Arabic path on paper without changing what the shop prints. The panel says so above the preview.
6. Arabic is detected from the receipt **content**, so an English receipt that happens to contain an Arabic product name rasterises exactly like an Arabic one. Verified on an XP-58C: a sale of `ice coffee` + `شاي بلنب` sent 47,114 bytes in *Graphics* mode and 19,310 bytes in *Printer font* mode (the logo travels as a raster either way), and the Settings test print produced the same output as the sale because both go through `printReceipt`.

### Tax Settings
- **Tax Rate**: Default 14% (Egyptian VAT)
- Automatically calculates and displays on receipts

## Receipt Features

### Header
- Store logo (if enabled)
- Free-text header (Settings → Header)
- Store name (bold, large)
- Store address
- Phone number (ت: prefix)
- Email (if configured)
- Tax number (الرقم الضريبي) - **REQUIRED**
- Commercial register (if configured)

### Transaction Details
- Receipt number (8-character code)
- Date and time (Arabic format)
- Customer name (if applicable)
- Payment method (نقدي/بطاقة/تقسيط)

### Items Table
- Product name (Arabic RTL support)
- Quantity (الكمية)
- Unit price (السعر)
- Total per item (المجموع)

### Totals
- Subtotal (الإجمالي الفرعي)
- Tax 14% (ضريبة القيمة المضافة)
- **Grand Total** (bold, large)
- Currency: ج.م (Egyptian Pounds)

### Footer
- Thank you message (Arabic)
- Free-text footer (Settings → Footer)
- Optional QR code
- Cut command
- Cash drawer opener (if enabled)

## Usage

### Printing from Sales Page
1. Go to **Sales** page
2. Find the transaction you want to print
3. Click **Receipt** button (green)
4. Receipt preview modal opens:
   - **Print (Browser)**: Uses standard browser print
   - **Print (Thermal)**: Sends to configured thermal printer
5. **Print (Thermal)** sends the job to the configured printer. With *Print receipt automatically after each sale* on, a POS checkout prints straight away without opening the modal.

### Auto-Print After Sale
- **Print receipt automatically after each sale** in Settings → Tax & Receipt → *Tax & rules* is on by default; switch it off to confirm every print by hand
- Useful for POS workflows; the receipt is sent to the configured printer without a dialog
- The pharmacy POS checkbox and the coffee POS *Auto* badge read and write this same setting, so the two screens can never disagree

### Which Plugins Print Through This Pipeline
Every plugin shares one printer, one set of store details and one receipt design; the sale flows below are wired to it.

| Plugin | Where the receipt is printed | Uses this pipeline |
|---|---|---|
| Commerce | Sales → *Receipt*, POS after checkout | Yes |
| Coffee | POS after checkout, *Reprint last* | Yes |
| Pharmacy | POS after checkout, sale receipt modal | Yes |
| Restaurant | Guest receipt from POS (auto-print) and from Sales → *Print receipt* | Yes |
| Bakery | none (only recipe cards) | No |
| Personal | Invoices (*A4* HTML document, by design) | n/a |

Restaurant checks print the full guest receipt: the check number, the order type, the
table and the guest count, the server, cover notes, and - unlike the other plugins -
the sale-level discount, the service charge and the gratuity:

| Row | Printed as | Notes |
|---|---|---|
| Discount | `Discount 10%` → `-20.00 EGP` | The plugin stores a percentage discount as the rate itself, so the amount is derived from the subtotal at receipt time |
| Service | `Service` → `19.20 EGP` | Charged on the *discounted* subtotal, exactly as the plugin's own totals engine does |
| Gratuity | `Gratuity` → `25.00 EGP` | Printed **below** the total, because a tip is charged on top of the check total |

Voided lines are dropped from the receipt, and line totals use the stored figure
(which already includes modifiers) rather than quantity × price. When the receipt
language is Arabic, the order type and every row label switch to Arabic too, so an
Arabic ticket never mixes in English words.

Kitchen tickets (*KOT*) and the *Z report* are **not** part of this pipeline: cooking
tickets live on the Kitchen Display (KDS), and the Z report still opens the browser
print dialog from the shift screen. Kitchen tickets are the obvious next candidate for
the shared renderer if station printers are added later.

### Which Plugins Have an Auto-Print After Sale Switch
The **Auto-print receipt after sale** switch lives in Settings → *Tax & rules* and is
shared by every plugin that can print on checkout (commerce, coffee, pharmacy,
restaurant). When it is off - or when no thermal printer is configured - the sale still
offers a *Print* button, so nothing is ever printed by surprise.

## Troubleshooting

### USB Printer Not Detected
1. Check the USB cable and that the printer is powered on
2. Click **Connect my printer automatically**. If the printer is missing from the list entirely, Windows has no queue for it yet - install the driver that came with the printer, or use **Add printer to Windows** when the panel offers it
3. Click **Check printer**. Three failures look identical on paper and are each reported here:
   - **Offline** - Windows has the queue switched to "Use Printer Offline". *Fix printer* clears it (the same switch is in Windows → Printers as *Use Printer Offline*).
   - **Not plugged in** - the queue points at a USB port with no device behind it. Windows creates one `USB00x` port per socket, so a queue can point at an empty socket and still report "Ready". *Fix printer* repoints it at the port the printer is really on.
   - **Failed job(s)** - one stuck job silently blocks every later job. *Fix printer* clears the queue.
4. On Linux, check permissions:
   ```bash
   sudo chmod 666 /dev/usb/lp0
   ```
5. Try a different USB port, then restart the application

### Auto-Connect Chose the Wrong Printer
- **Cause**: a save-to-file queue can look healthier than the real printer if it is the Windows default and has no problems to report.
- **Solution**: the ranking only picks a printer when it can reach paper - virtual queues (*Microsoft Print to PDF*, *OneNote*, *Fax*) are flagged as virtual and are never auto-selected over a live USB receipt printer. If two real printers are present, the one already saved in **Printer Name** wins; otherwise pick from **Detected Printers** and the choice is remembered.

### Network Printer Connection Failed
1. Verify printer IP address:
   ```bash
   ping 192.168.1.100
   ```
2. Check port 9100 is open:
   ```bash
   nc -zv 192.168.1.100 9100
   ```
3. Ensure printer and computer are on same network
4. Check firewall settings
5. Restart printer and try again

### Arabic Text Not Printing Correctly
- **Symptom**: `?` characters, or Arabic words with letters missing.
- **Cause**: the printer's font ROM has no Arabic code page, so `ESC t 37` (CP864) and `ESC t 50` (WPC1256) are ignored. Most 58mm units - the XP-58C included - behave this way.
- **Solution**: keep **Arabic Render Mode** on *Graphics* (the default). Arabic is rasterised by Chromium and sent as graphics, which needs nothing from the printer's font ROM. Verified on an XP-58C with Arabic and English on the same receipt.
- If the printer *does* render Arabic from its own font, switch to *Printer font* and pick the **Arabic Code Page** it understands, or leave it on *Detect automatically*. The test receipt prints the sample on both pages so the paper itself tells you which one works.
- A receipt that falls back to graphics even in *Printer font* mode means the chosen code page has no glyph for one of the characters. That is expected - see [Arabic Receipts](#arabic-receipts) - and the preview lists the characters that caused it.

### Receipt Cuts in Wrong Place
- **Cause**: Wrong paper width setting
- **Solution**: Match paper width in settings (58mm vs 80mm)

### Cash Drawer Not Opening
- **Cause**: Drawer not compatible or wrong cable
- **Solution**:
  1. Check drawer is connected to printer (not computer)
  2. Use RJ11/RJ12 cash drawer cable
  3. Verify printer supports cash drawer kick (ESC p command)
  4. Test with printer's own cash drawer test function

### Partial Print or Garbled Output
1. Check paper is loaded correctly
2. Clean printer head
3. Replace thermal paper if old
4. Update printer firmware (if available)
5. Reduce print density in printer settings

## Egyptian Tax Compliance

### Legal Requirements
- ✅ Tax number (الرقم الضريبي) must be displayed
- ✅ Receipt number for tracking
- ✅ Date and time
- ✅ Itemized list with quantities
- ✅ Subtotal, tax, and total clearly separated
- ✅ VAT rate displayed (14%)

### Best Practices
- Keep receipt backups (database stored automatically)
- Print duplicate receipts from Sales page if needed
- Configure tax number before first use
- Test printer daily before opening

## Technical Details

### ESC/POS Commands Used
- `ESC @` - Initialize printer
- `ESC a 01` - Center alignment
- `ESC E 01` - Bold on
- `GS ! 11` - Double width/height
- `ESC t 37` - Select CP864 (Arabic; text mode only)
- `ESC t 50` - Select WPC1256 (Arabic; text mode only)
- `ESC t 0` - Back to the ASCII page
- `GS v 0` - Raster bit image (bitmap receipts: logo and Arabic)
- `GS V 41` - Partial cut
- `ESC p 00 19 FA` - Open cash drawer

### Encoding
- **Bitmap** (default): the receipt is laid out as HTML at 1 CSS pixel per printer dot, rasterised offscreen in scroll slices and sent with `GS v 0`. One long-lived offscreen window per paper width is re-loaded for each receipt; the first render after a load only warms the font cache, so it is discarded.
- **Text path** (*Printer font* mode): built in `src/main/services/thermal/arabic.ts`, which shapes the Arabic letters, flips each line into visual order and switches code page around the Latin and Arabic runs. The bytes are appended as a buffer so `node-thermal-printer` cannot re-encode an Arabic word character by character.
- **Renderer entry point**: `src/renderer/src/lib/thermalPrint.ts` reads the saved receipt settings, fills in the logo and calls the `thermalReceipts.print` IPC channel.
- **Which path a receipt takes**: `shouldRasterise` looks at the receipt **content**, not at `receiptLanguage` — a shop that prints English receipts still sells products whose names are Arabic. Anything Arabic anywhere on the receipt (item, store name, header, footer, or the labels themselves) needs the graphics path; a fully Latin receipt stays on the text path.
- **One code page per receipt**: with `receiptArabicEncoding: 'auto'`, `withResolvedArabicEncoding` freezes the page before the first line prints, so `emit`, the preview's reported `encoding` and the glyph check in `missingGlyphs` always agree. Resolving per line used to let a line go out through CP864 while the next needed WPC1256, and the printer kept whichever page it saw first.
- **Graphics fallback**: `missingGlyphs` lists the letters the chosen page cannot write; when it is non-empty, `printReceipt` sends the receipt as graphics instead and logs why. A pinned page is never overridden silently - it is only announced.
- Arabic receipts are **RTL (Right-to-Left)**; money and quantity columns stay LTR.
- Compatible with Egyptian Arabic keyboards.

### Printer Detection and Auto-Connect
- **What it scans**: Windows print queues (`Get-Printer`), the port each queue uses (`Get-PrinterPort`) and the USB print devices that are actually present (`Get-PnpDevice`), so a queue can be told apart from a device with no queue. Network printers are probed on port 9100 when a host is configured.
- **Ranking** (`scorePrinter`, lower is better, 0-120): virtual queues +80 and a virtual port kind +60, offline +40, a port with no device behind it +35, a driver-reported problem +30, stuck jobs +10, the Windows default -6, a confidence bonus, and -30 for the queue already saved in **Printer Name**. `pickBestPrinter` then returns the first candidate that `isUsablePrinter` accepts, which is what stops *Microsoft Print to PDF* from being chosen on a machine that also has a real printer.
- **Queue creation** (`createQueue`): when a USB print device exists but no queue points at its port, BizFlow adds an inbox `Generic / Text Only` raw queue on that port. It needs a driver and may need administrator rights; both failures are reported instead of guessed at.

### Live Preview
- `receipt:renderPreview` returns `{ width, totalHeight, encoding, raster, missingGlyphs, slices[] }`, where each slice is a PNG data URL of one `GS v 0` band at the real paper width.
- `raster` mirrors what `printReceipt` will do for this receipt (including the code-page fallback), `encoding` is the code page when the text path really uses one and `null` otherwise, and `missingGlyphs` lists the letters that forced the graphics fallback.

### Network Protocol
- **Port**: 9100 (standard ESC/POS over IP)
- **Protocol**: Raw TCP socket
- **Timeout**: 5 seconds

## Support

### Common Printer Models in Egypt

#### XPrinter (Most Common)
- **XP-80**: 80mm, USB/Network, ~700 EGP
- **XP-58**: 58mm, USB, ~400 EGP
- Setup: Plug and play, no drivers needed

#### HOIN
- **HOP-E801**: 80mm, USB/Network/Bluetooth, ~850 EGP
- **HOP-E58**: 58mm, USB, ~500 EGP
- Setup: Same as XPrinter

#### Rongta
- **RP80**: 80mm, USB/Network, ~900 EGP
- **RP58**: 58mm, USB, ~550 EGP
- Setup: May require manual IP configuration

### Getting Help
1. Check printer manual for default IP
2. Test with "Test Printer Connection" button
3. Verify all settings are correct
4. Check printer paper and power
5. Restart application if needed

## Notes
- Thermal paper fades over time - store important receipts digitally
- Keep backup thermal paper rolls
- Clean printer head monthly for best quality
- 80mm width recommended for better readability
- Network printers allow printing from multiple devices
