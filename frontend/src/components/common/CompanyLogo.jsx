import { useState } from 'react'

const LOGODEV_PUB_KEY = 'pk_H-lf1z_7R36u6_YQr-7nnA'

const KNOWN_DOMAINS = {
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  AMZN: 'amazon.com',
  NVDA: 'nvidia.com',
  GOOGL: 'google.com',
  META: 'meta.com',
  'BRK.B': 'berkshirehathaway.com',
  LLY: 'lilly.com',
  AVGO: 'broadcom.com',
  JPM: 'jpmorganchase.com',
  TSLA: 'tesla.com',
  WMT: 'walmart.com',
  XOM: 'exxonmobil.com',
  V: 'visa.com',
  MA: 'mastercard.com',
  UNH: 'unitedhealthgroup.com',
  ORCL: 'oracle.com',
  COST: 'costco.com',
  PG: 'pg.com',
  JNJ: 'jnj.com',
  HD: 'homedepot.com',
  NFLX: 'netflix.com',
  ABBV: 'abbvie.com',
  BAC: 'bankofamerica.com',
  WFC: 'wellsfargo.com',
  BA: 'boeing.com',
  CVX: 'chevron.com',
  KO: 'coca-cola.com',
  PEP: 'pepsico.com',
  TMO: 'thermofisher.com',
  ADBE: 'adobe.com',
  CSCO: 'cisco.com',
  INTC: 'intel.com',
  AMD: 'amd.com',
  QCOM: 'qualcomm.com',
  IBM: 'ibm.com',
  TXN: 'ti.com',
  CRM: 'salesforce.com',
  CAT: 'caterpillar.com',
  GE: 'ge.com',
  DIS: 'disney.com',
  MCD: 'mcdonalds.com',
  NKE: 'nike.com',
  SBUX: 'starbucks.com',
  PFE: 'pfizer.com',
  MRK: 'merck.com',
  ABT: 'abbott.com',
  BMY: 'bms.com',
  AMGN: 'amgen.com',
  GILD: 'gilead.com',
  C: 'citigroup.com',
  MS: 'morganstanley.com',
  GS: 'goldmansachs.com',
  AXP: 'americanexpress.com',
  BLK: 'blackrock.com',
  SCHW: 'schwab.com',
  USB: 'usbank.com',
  PNC: 'pnc.com',
  T: 'att.com',
  VZ: 'verizon.com',
  TMUS: 't-mobile.com',
  CMCSA: 'comcastcorporation.com',
  UPS: 'ups.com',
  FDX: 'fedex.com',
  RTX: 'rtx.com',
  LMT: 'lockheedmartin.com',
  HON: 'honeywell.com',
  UNP: 'up.com',
  DE: 'deere.com',
  COP: 'conocophillips.com',
  SLB: 'slb.com',
  EOG: 'eogresources.com',
  NEE: 'nexteraenergy.com',
  DUK: 'duke-energy.com',
  SO: 'southerncompany.com',
  LIN: 'linde.com',
  APD: 'airproducts.com',
  SHW: 'sherwin-williams.com',
  PLD: 'prologis.com',
  AMT: 'americantower.com',
  EQIX: 'equinix.com',
  SPG: 'simon.com',
  O: 'realtyincome.com',
}

export default function CompanyLogo({ company, size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false)

  if (!company) return null

  const ticker = company.ticker || ''
  const name = company.name || ''
  const color = company.color || '#a98aff'

  const domain =
    KNOWN_DOMAINS[ticker] ||
    (company.domain ? company.domain : `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)

  const logoUrl =
    company.logoUrl || `https://img.logo.dev/${domain}?token=${LOGODEV_PUB_KEY}`

  const sizePx = size === 'sm' ? 24 : size === 'lg' ? 44 : size === 'xl' ? 60 : 34
  const fontSize = size === 'sm' ? '11px' : size === 'lg' ? '18px' : size === 'xl' ? '24px' : '14px'

  if (imgError) {
    return (
      <span
        className={`company-monogram ${size === 'xl' ? 'large' : ''} ${className}`}
        style={{
          '--company-color': color,
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          minWidth: `${sizePx}px`,
          minHeight: `${sizePx}px`,
          fontSize,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          fontWeight: 700,
        }}
      >
        {ticker.slice(0, 1) || 'C'}
      </span>
    )
  }

  return (
    <div
      className={`company-logo-wrap ${className}`}
      style={{
        width: `${sizePx}px`,
        height: `${sizePx}px`,
        minWidth: `${sizePx}px`,
        minHeight: `${sizePx}px`,
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#ffffff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: size === 'sm' ? '2px' : '4px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
      }}
    >
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
        loading="lazy"
      />
    </div>
  )
}
