/**
 * Barcode Print Dialog
 * Allows user to print barcodes to thermal printers
 */

import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import { useToast } from '../contexts/ToastContext'
import { Printer, RefreshCw } from 'lucide-react'
import logger from '../../../shared/utils/logger'

interface Props {
  isOpen: boolean
  onClose: () => void
  barcode: string
  productName?: string
}

interface PrinterInfo {
  name: string
  path: string
}

export default function BarcodePrintDialog({ isOpen, onClose, barcode, productName }: Props) {
  const toast = useToast()
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState<string>('')
  const [copies, setCopies] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detecting, setDetecting] = useState(false)

  const detectPrinters = async () => {
    setDetecting(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('barcode:detect-printers')
      
      if (result.success && result.printers) {
        setPrinters(result.printers)
        
        if (result.printers.length > 0 && !selectedPrinter) {
          setSelectedPrinter(result.printers[0].path)
        } else if (result.printers.length === 0) {
          toast.error('No printers detected. Please connect a thermal printer and try again.')
        }
      } else {
        toast.error(result.message || 'Failed to detect printers')
      }
    } catch (error: any) {
      logger.error('Error detecting printers:', error)
      toast.error('Failed to detect printers')
    } finally {
      setDetecting(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      detectPrinters()
    }
  }, [isOpen])

  const handleTest = async () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first')
      return
    }

    setLoading(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('barcode:test-printer', {
        printerName: selectedPrinter
      })

      if (result.success) {
        toast.success('Test page sent to printer')
      } else {
        toast.error(result.message || 'Failed to send test page')
      }
    } catch (error: any) {
      logger.error('Error testing printer:', error)
      toast.error('Failed to test printer')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!selectedPrinter) {
      toast.error('Please select a printer first')
      return
    }

    if (!barcode || barcode.trim().length === 0) {
      toast.error('Barcode cannot be empty')
      return
    }

    if (copies < 1 || copies > 10) {
      toast.error('Copies must be between 1 and 10')
      return
    }

    setLoading(true)
    try {
      const result = await window.electron.ipcRenderer.invoke('barcode:print', {
        printerName: selectedPrinter,
        barcodeText: barcode,
        options: {
          productName,
          format: 'code128',
          copies,
          width: 2,
          height: 50
        }
      })

      if (result.success) {
        toast.success(`Barcode${copies > 1 ? 's' : ''} sent to printer`)
        onClose()
      } else {
        toast.error(result.message || 'Failed to print barcode', 8000)
      }
    } catch (error: any) {
      logger.error('Error printing barcode:', error)
      toast.error('Failed to print barcode')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Print Barcode">
      <div className="space-y-4">
        {/* Product Info */}
        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
          {productName && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{productName}</p>
          )}
          <p className="text-lg font-mono font-semibold text-slate-900 dark:text-white">{barcode}</p>
        </div>

        {/* Printer Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Printer
            </label>
            <button
              onClick={detectPrinters}
              disabled={detecting}
              className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
            >
              <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          
          {printers.length > 0 ? (
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                       bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                       focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {printers.map((printer) => (
                <option key={printer.path} value={printer.path}>
                  {printer.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400 italic">
              {detecting ? 'Detecting printers...' : 'No printers detected'}
            </div>
          )}
        </div>

        {/* Number of Copies */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Number of Copies
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                     bg-white dark:bg-slate-900 text-slate-900 dark:text-white
                     focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Setup Help */}
        {printers.length === 0 && !detecting && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2 font-medium">
              Printer Setup Guide:
            </p>
            <ol className="text-xs text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
              <li>Connect your thermal printer via USB</li>
              <li>Install printer drivers (usually auto-detected on Linux)</li>
              <li>Add printer using System Settings → Printers</li>
              <li>Click "Refresh" button above</li>
            </ol>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
              If issues persist, you may need to add your user to the lp group:
              <br />
              <code className="bg-blue-100 dark:bg-blue-900 px-1 py-0.5 rounded">
                sudo usermod -a -G lp $USER
              </code>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleTest}
            disabled={loading || !selectedPrinter}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                     hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-slate-700 dark:text-slate-300"
          >
            <Printer size={16} className="inline mr-2" />
            Test Print
          </button>
          
          <div className="flex-1" />
          
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg
                     hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                     text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          
          <button
            onClick={handlePrint}
            disabled={loading || !selectedPrinter}
            className="px-6 py-2 bg-primary text-white rounded-lg
                     hover:bg-primary-dark transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     font-medium"
          >
            {loading ? 'Printing...' : 'Print'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
