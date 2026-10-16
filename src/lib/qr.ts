import QRCode from 'qrcode'

export async function makeQrDataUrl(value: string): Promise<string> {
  return QRCode.toDataURL(value, {
    width: 280,
    margin: 1,
    color: { dark: '#1B1916', light: '#FFFFFF' },
    errorCorrectionLevel: 'M',
  })
}
