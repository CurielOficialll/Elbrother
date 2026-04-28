window.Format = {
  // Primary currency: Bolívares
  bs: (n) => `Bs. ${(Number(n)||0).toFixed(2)}`,
  // USD conversion (divide by BCV rate)
  usd: (n) => `$${(Number(n)||0).toFixed(2)}`,
  // Convert USD amount to Bs
  toBs: (usdAmount, rate) => (Number(usdAmount)||0) * (rate || Store.get('bcvRate') || 483.87),
  // Convert Bs amount to USD
  toUsd: (bsAmount, rate) => (Number(bsAmount)||0) / (rate || Store.get('bcvRate') || 483.87),
  // Format a product price (stored in USD) showing Bs primary + USD ref
  price: (usdPrice, rate) => {
    const r = rate || Store.get('bcvRate') || 483.87;
    const bsVal = (Number(usdPrice)||0) * r;
    return `Bs. ${bsVal.toFixed(2)}`;
  },
  priceWithRef: (usdPrice, rate) => {
    const r = rate || Store.get('bcvRate') || 483.87;
    const bsVal = (Number(usdPrice)||0) * r;
    return `Bs. ${bsVal.toFixed(2)} <span style="color:var(--outline);font-size:0.8em">($${(Number(usdPrice)||0).toFixed(2)})</span>`;
  },
  // Format BCV rate
  bcvRate: (rate) => `${(Number(rate)||0).toFixed(2)}`,
  number: (n) => (Number(n)||0).toLocaleString('es-VE'),
  date: (d) => d ? new Date(d).toLocaleDateString('es-VE') : '—',
  time: (d) => d ? new Date(d).toLocaleTimeString('es-VE', {hour:'2-digit',minute:'2-digit'}) : '—',
  datetime: (d) => d ? `${window.Format.date(d)} ${window.Format.time(d)}` : '—',
  timeAgo(d) {
    if (!d) return '—';
    const s = Math.floor((Date.now() - new Date(d+'Z').getTime()) / 1000);
    if (s < 60) return 'Hace un momento';
    if (s < 3600) return `Hace ${Math.floor(s/60)} min`;
    if (s < 86400) return `Hace ${Math.floor(s/3600)}h`;
    return window.Format.date(d);
  },
  paymentMethod(m) {
    const methods = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'mobile': 'P. Móvil',
      'biopago': 'Biopago',
      'credit': 'Fiado',
      'transfer': 'Transferencia'
    };
    return methods[m] || (m ? m.toUpperCase() : '—');
  },
  // Format weight value with unit
  weight(value, unit) {
    const v = Number(value) || 0;
    if (unit === 'g') return `${Math.round(v)} g`;
    return `${v.toFixed(3)} ${unit || 'kg'}`;
  },
  // Format quantity: decimal for weight, integer for units
  qty(value, sellsByWeight, unit) {
    if (sellsByWeight) return this.weight(value, unit);
    return `${Math.round(Number(value) || 0)}`;
  },
  // Unit label for display
  unitLabel(unit) {
    const labels = { 'und': 'Unidad', 'kg': 'Kilogramo', 'g': 'Gramo' };
    return labels[unit] || unit || 'Unidad';
  }
};
