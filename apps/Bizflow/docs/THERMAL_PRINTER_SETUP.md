# Thermal Printer Setup Guide

> **Status:** Current. Fully implemented in `src/main/services/ThermalPrinterService.ts`.
> **AI INSTRUCTION:** Thermal printing is handled exclusively in the main process via `node-thermal-printer`. Never call thermal printer APIs directly from the renderer. Use the `receipts:print` IPC channel.

## Overview
This application supports Egyptian thermal receipt printers with full Arabic language support, ESC/POS commands, and Egyptian tax requirements (الرقم الضريبي).

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
1. Connect printer via USB cable
2. In Settings → Tax & Receipt Settings:
   - Select "USB Printer"
   - Click "Test Printer Connection" to verify

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

### Tax Settings
- **Tax Rate**: Default 14% (Egyptian VAT)
- Automatically calculates and displays on receipts

## Receipt Features

### Header
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
5. Receipt prints automatically

### Auto-Print After Sale (Coming Soon)
- Enable in Settings to print automatically after each sale
- Useful for POS workflows

## Troubleshooting

### USB Printer Not Detected
1. Check USB cable connection
2. Ensure printer is powered on
3. On Linux: Check permissions
   ```bash
   sudo chmod 666 /dev/usb/lp0
   ```
4. Try different USB port
5. Restart application

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
- **Cause**: Wrong character encoding
- **Solution**: Printer must support Windows-1256 encoding
- Most modern ESC/POS printers support this
- Check printer manual for character set configuration

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
- `ESC t 06` - Set Windows-1256 (Arabic) encoding
- `ESC a 01` - Center alignment
- `ESC E 01` - Bold on
- `GS ! 11` - Double width/height
- `GS V 41` - Partial cut
- `ESC p 00 19 FA` - Open cash drawer

### Encoding
- **Windows-1256** for Arabic text
- **RTL (Right-to-Left)** support
- Compatible with Egyptian Arabic keyboards

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
