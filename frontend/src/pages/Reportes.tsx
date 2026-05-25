import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Receipt, Package, CreditCard, Download, PieChart as PieIcon, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { formatCOP } from '../utils/currency';
import { getLocalDateString } from '../utils/date';
import { dashboardApi, type DashboardStats, type MonthlyTotal, type PaymentMethodTotal } from '../services/dashboardService';
import '../styles/pages.css';

function monthLabel(m: string) {
  const [year, month] = m.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString('es-CO', { month: 'short', year: 'numeric' });
}

/* ─── Palette ─── */
const C = {
  indigo: '#4f46e5',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#ef4444',
  sky: '#0ea5e9',
  violet: '#8b5cf6',
  pink: '#ec4899',
  slate: '#64748b',
};
const COLORS = [C.indigo, C.emerald, C.amber, C.rose, C.sky, C.violet, C.pink, C.slate];

/* ═══════════════════════════════════════════════
   Donut Chart (único tipo de gráfico)
   ═══════════════════════════════════════════════ */
function DonutChart({ data, centerLabel, centerValue }: { data: { label: string; value: number; color?: string }[]; centerLabel: string; centerValue: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 40, fontSize: '0.92rem' }}>Sin datos</div>;
  }

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const rInner = 50;

  let startAngle = -90;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360;
    const endAngle = startAngle + angle;
    const rad = (a: number) => (Math.PI * a) / 180;
    const x1 = cx + r * Math.cos(rad(startAngle));
    const y1 = cy + r * Math.sin(rad(startAngle));
    const x2 = cx + r * Math.cos(rad(endAngle));
    const y2 = cy + r * Math.sin(rad(endAngle));
    const x1i = cx + rInner * Math.cos(rad(startAngle));
    const y1i = cy + rInner * Math.sin(rad(startAngle));
    const x2i = cx + rInner * Math.cos(rad(endAngle));
    const y2i = cy + rInner * Math.sin(rad(endAngle));
    const largeArc = angle > 180 ? 1 : 0;
    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x2i} ${y2i} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x1i} ${y1i} Z`;
    const midAngle = startAngle + angle / 2;
    const labelR = (r + rInner) / 2;
    const lx = cx + labelR * Math.cos(rad(midAngle));
    const ly = cy + labelR * Math.sin(rad(midAngle));
    const color = d.color || COLORS[i % COLORS.length];
    startAngle = endAngle;
    return { path, color, label: d.label, pct: ((d.value / total) * 100).toFixed(1), lx, ly };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
          {slices.map((s, i) => (
            <g key={i}>
              <path d={s.path} fill={s.color} stroke="#fff" strokeWidth={2} style={{ transition: 'opacity 200ms' }} />
              {parseFloat(s.pct) > 6 && (
                <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize="10" fontWeight={700} fontFamily="ui-sans-serif, system-ui, sans-serif" style={{ pointerEvents: 'none' }}>
                  {s.pct}%
                </text>
              )}
            </g>
          ))}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{centerLabel}</span>
          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)', marginTop: 2 }}>{centerValue}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: s.color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'ui-monospace, monospace', color: 'var(--color-text)', fontWeight: 700 }}>{formatCOP(data[i].value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Excel export ─── */
function exportExcel(
  stats: DashboardStats | null,
  sales: MonthlyTotal[],
  expenses: MonthlyTotal[],
  payments: PaymentMethodTotal[]
) {
  const wb = XLSX.utils.book_new();

  const THEME = {
    indigo: '4F46E5',
    indigoLight: 'EEF2FF',
    white: 'FFFFFF',
    slate50: 'F8FAFC',
    slate100: 'F1F5F9',
    slate200: 'E2E8F0',
    slate600: '475569',
    slate700: '334155',
    green: '10B981',
    greenLight: 'ECFDF5',
    amber: 'F59E0B',
    amberLight: 'FFFBEB',
    rose: 'F43F5E',
    roseLight: 'FFF1F2',
  };

  function cellStyle(
    opts: {
      bold?: boolean;
      color?: string;
      bg?: string;
      sz?: number;
      h?: 'left' | 'center' | 'right';
      v?: 'top' | 'center' | 'bottom';
      numFmt?: string;
    } = {}
  ) {
    const s: any = { font: {}, fill: {}, alignment: {}, border: {} };
    if (opts.bold) s.font.bold = true;
    s.font.color = { rgb: opts.color || THEME.slate700 };
    if (opts.sz) s.font.sz = opts.sz;
    if (opts.bg) {
      s.fill.patternType = 'solid';
      s.fill.fgColor = { rgb: opts.bg };
      s.fill.bgColor = { rgb: opts.bg };
    } else {
      s.fill.patternType = 'solid';
      s.fill.fgColor = { rgb: THEME.white };
      s.fill.bgColor = { rgb: THEME.white };
    }
    s.alignment.horizontal = opts.h || 'left';
    s.alignment.vertical = opts.v || 'center';
    if (opts.numFmt) s.numFmt = opts.numFmt;

    const borderColor = { rgb: THEME.slate200 };
    s.border.top = { style: 'thin', color: borderColor };
    s.border.bottom = { style: 'thin', color: borderColor };
    s.border.left = { style: 'thin', color: borderColor };
    s.border.right = { style: 'thin', color: borderColor };
    return s;
  }

  function makeSheet(rows: any[][], _sheetName: string, colWidths: number[]) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
    return ws;
  }

  function applyCellStyles(ws: XLSX.WorkSheet, styles: (any[] | null)[]) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const rowStyles = styles[R];
      if (!rowStyles) continue;
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        const st = rowStyles[C];
        if (st) ws[ref].s = st;
      }
    }
  }

  // ════════ Sheet 1: Resumen ════════
  {
    const rows: any[][] = [];
    const st: (any[] | null)[] = [];

    // Title row
    rows.push(['OrderGo — Reporte de Negocio']);
    st.push([cellStyle({ bold: true, color: THEME.indigo, sz: 16, h: 'center' }), cellStyle({ bold: true, color: THEME.indigo, sz: 16, h: 'center' })]);

    rows.push(['Fecha:', new Date().toLocaleString('es-CO')]);
    st.push([cellStyle({ color: THEME.slate600 }), cellStyle({ color: THEME.slate600 })]);
    rows.push([]);
    st.push(null);

    // Headers
    rows.push(['Métrica', 'Valor']);
    st.push([cellStyle({ bold: true, color: THEME.white, bg: THEME.indigo, h: 'center' }), cellStyle({ bold: true, color: THEME.white, bg: THEME.indigo, h: 'center' })]);

    if (stats) {
      const data = [
        ['Ventas totales (mes)', stats.totalSales],
        ['Pedidos totales (mes)', stats.totalOrders],
        ['Promedio por pedido', stats.averageTicket],
        ['Clientes activos', stats.totalCustomers],
        ['Ventas históricas (total)', stats.totalSalesAllTime],
        ['Pedidos históricos (total)', stats.totalOrdersAllTime],
        ['Total por cobrar', stats.totalReceivable],
        ['Facturas pendientes', stats.pendingInvoices],
      ];
      data.forEach(([label, val], i) => {
        rows.push([label, val]);
        const bg = i % 2 === 0 ? THEME.white : THEME.slate50;
        st.push([cellStyle({ bg, h: 'left', numFmt: '#,##0' }), cellStyle({ bg, h: 'right', numFmt: '#,##0' })]);
      });
    } else {
      rows.push(['No hay datos de resumen disponibles', '']);
      st.push([cellStyle({ color: THEME.slate600 }), cellStyle({ color: THEME.slate600 })]);
    }

    const ws = makeSheet(rows, 'Resumen', [35, 22]);
    applyCellStyles(ws, st);
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen');
  }

  // ════════ Sheet 2: Ventas mensuales ════════
  {
    const rows: any[][] = [];
    const st: (any[] | null)[] = [];

    rows.push(['Ventas Mensuales']);
    st.push([cellStyle({ bold: true, color: THEME.indigo, sz: 14, h: 'center' }), cellStyle({ bold: true, color: THEME.indigo, sz: 14, h: 'center' })]);
    rows.push([]);
    st.push(null);

    rows.push(['Mes', 'Monto (COP)']);
    st.push([cellStyle({ bold: true, color: THEME.white, bg: THEME.indigo, h: 'center' }), cellStyle({ bold: true, color: THEME.white, bg: THEME.indigo, h: 'center' })]);

    let total = 0;
    if (sales.length > 0) {
      sales.forEach((s, i) => {
        rows.push([monthLabel(s.month), s.amount]);
        const bg = i % 2 === 0 ? THEME.white : THEME.slate50;
        st.push([cellStyle({ bg, h: 'left' }), cellStyle({ bg, h: 'right', numFmt: '#,##0' })]);
        total += s.amount;
      });
      rows.push(['Total', total]);
      st.push([cellStyle({ bold: true, color: THEME.indigo, bg: THEME.indigoLight, h: 'left' }), cellStyle({ bold: true, color: THEME.indigo, bg: THEME.indigoLight, h: 'right', numFmt: '#,##0' })]);
    } else {
      rows.push(['Sin datos', 0]);
      st.push([cellStyle({ color: THEME.slate600 }), cellStyle({ color: THEME.slate600, h: 'right' })]);
    }

    const ws = makeSheet(rows, 'Ventas mensuales', [22, 22]);
    applyCellStyles(ws, st);
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas mensuales');
  }

  // ════════ Sheet 3: Gastos mensuales ════════
  {
    const rows: any[][] = [];
    const st: (any[] | null)[] = [];

    rows.push(['Gastos / Compras Mensuales']);
    st.push([cellStyle({ bold: true, color: THEME.amber, sz: 14, h: 'center' }), cellStyle({ bold: true, color: THEME.amber, sz: 14, h: 'center' })]);
    rows.push([]);
    st.push(null);

    rows.push(['Mes', 'Monto (COP)']);
    st.push([cellStyle({ bold: true, color: THEME.white, bg: THEME.amber, h: 'center' }), cellStyle({ bold: true, color: THEME.white, bg: THEME.amber, h: 'center' })]);

    let total = 0;
    if (expenses.length > 0) {
      expenses.forEach((e, i) => {
        rows.push([monthLabel(e.month), e.amount]);
        const bg = i % 2 === 0 ? THEME.white : THEME.slate50;
        st.push([cellStyle({ bg, h: 'left' }), cellStyle({ bg, h: 'right', numFmt: '#,##0' })]);
        total += e.amount;
      });
      rows.push(['Total', total]);
      st.push([cellStyle({ bold: true, color: THEME.amber, bg: THEME.amberLight, h: 'left' }), cellStyle({ bold: true, color: THEME.amber, bg: THEME.amberLight, h: 'right', numFmt: '#,##0' })]);
    } else {
      rows.push(['Sin datos', 0]);
      st.push([cellStyle({ color: THEME.slate600 }), cellStyle({ color: THEME.slate600, h: 'right' })]);
    }

    const ws = makeSheet(rows, 'Gastos mensuales', [22, 22]);
    applyCellStyles(ws, st);
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos mensuales');
  }

  // ════════ Sheet 4: Recaudo por método ════════
  {
    const rows: any[][] = [];
    const st: (any[] | null)[] = [];

    rows.push(['Recaudo por Método de Pago']);
    st.push([cellStyle({ bold: true, color: THEME.green, sz: 14, h: 'center' }), cellStyle({ bold: true, color: THEME.green, sz: 14, h: 'center' })]);
    rows.push([]);
    st.push(null);

    rows.push(['Método de pago', 'Total (COP)']);
    st.push([cellStyle({ bold: true, color: THEME.white, bg: THEME.green, h: 'center' }), cellStyle({ bold: true, color: THEME.white, bg: THEME.green, h: 'center' })]);

    let total = 0;
    if (payments.length > 0) {
      payments.forEach((p, i) => {
        rows.push([p.paymentMethod, p.total]);
        const bg = i % 2 === 0 ? THEME.white : THEME.slate50;
        st.push([cellStyle({ bg, h: 'left' }), cellStyle({ bg, h: 'right', numFmt: '#,##0' })]);
        total += p.total;
      });
      rows.push(['Total', total]);
      st.push([cellStyle({ bold: true, color: THEME.green, bg: THEME.greenLight, h: 'left' }), cellStyle({ bold: true, color: THEME.green, bg: THEME.greenLight, h: 'right', numFmt: '#,##0' })]);
    } else {
      rows.push(['Sin datos', 0]);
      st.push([cellStyle({ color: THEME.slate600 }), cellStyle({ color: THEME.slate600, h: 'right' })]);
    }

    const ws = makeSheet(rows, 'Recaudo por método', [25, 22]);
    applyCellStyles(ws, st);
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } });
    XLSX.utils.book_append_sheet(wb, ws, 'Recaudo por método');
  }

  const fileName = `reporte_ordergo_${getLocalDateString()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/* ═══════════════════════════════════════════════
   Page
   ═══════════════════════════════════════════════ */
export default function Reportes() {
  const [statsData, setStatsData] = useState<DashboardStats | null>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlyTotal[]>([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyTotal[]>([]);
  const [paymentsByMethod, setPaymentsByMethod] = useState<PaymentMethodTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Period filter
  const [periodType, setPeriodType] = useState<'general' | 'day' | 'month' | 'year'>('general');
  const [dayValue, setDayValue] = useState(getLocalDateString());
  const [monthValue, setMonthValue] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [yearValue, setYearValue] = useState(() => String(new Date().getFullYear()));

  useEffect(() => {
    Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getMonthlySales().catch(() => [] as MonthlyTotal[]),
      dashboardApi.getMonthlyExpenses().catch(() => [] as MonthlyTotal[]),
      dashboardApi.getPaymentsByMethod().catch(() => [] as PaymentMethodTotal[]),
    ])
      .then(([stats, sales, expenses, payments]) => {
        setStatsData(stats);
        setMonthlySales(sales);
        setMonthlyExpenses(expenses);
        setPaymentsByMethod(payments);
        setLoading(false);
      })
      .catch(() => {
        setError('No se pudo conectar al backend. Los reportes detallados requieren datos reales.');
        setLoading(false);
      });
  }, []);

  // Filter data by selected period
  const filteredMonthlySales = (() => {
    if (periodType === 'month' && monthValue) {
      return monthlySales.filter((s) => s.month === monthValue);
    }
    if (periodType === 'year' && yearValue) {
      const yearPrefix = yearValue + '-';
      const agg = new Map<string, number>();
      monthlySales.filter((s) => s.month.startsWith(yearPrefix)).forEach((s) => {
        agg.set(s.month, (agg.get(s.month) || 0) + s.amount);
      });
      return Array.from(agg.entries()).map(([month, amount]) => ({ month, amount }));
    }
    return monthlySales;
  })();

  const filteredMonthlyExpenses = (() => {
    if (periodType === 'month' && monthValue) {
      return monthlyExpenses.filter((e) => e.month === monthValue);
    }
    if (periodType === 'year' && yearValue) {
      const yearPrefix = yearValue + '-';
      const agg = new Map<string, number>();
      monthlyExpenses.filter((e) => e.month.startsWith(yearPrefix)).forEach((e) => {
        agg.set(e.month, (agg.get(e.month) || 0) + e.amount);
      });
      return Array.from(agg.entries()).map(([month, amount]) => ({ month, amount }));
    }
    return monthlyExpenses;
  })();

  const [dayOrders, setDayOrders] = useState<{ totalAmount: number; totalOrders: number }>({ totalAmount: 0, totalOrders: 0 });

  useEffect(() => {
    if (periodType === 'day' && dayValue) {
      dashboardApi.getDailySales(dayValue)
        .then((res) => {
          setDayOrders({
            totalAmount: res.totalSales || 0,
            totalOrders: res.totalInvoices || 0,
          });
        })
        .catch(() => setDayOrders({ totalAmount: 0, totalOrders: 0 }));
    }
  }, [periodType, dayValue]);

  const stats = (() => {
    if (periodType === 'day') {
      return [
        { label: 'Ventas del día', value: formatCOP(dayOrders.totalAmount), icon: DollarSign, change: '', up: true, color: '#4f46e5', bg: '#eef2ff' },
        { label: 'Pedidos del día', value: String(dayOrders.totalOrders), icon: ShoppingCart, change: '', up: true, color: '#10b981', bg: '#ecfdf5' },
      ];
    }
    const totalSales = filteredMonthlySales.reduce((s, x) => s + x.amount, 0);
    const totalOrders = filteredMonthlySales.length > 0 ? Math.round(totalSales / (statsData?.averageTicket || 1)) : 0;
    if (periodType === 'general' && statsData) {
      return [
        { label: 'Ventas totales', value: formatCOP(statsData.totalSales), icon: DollarSign, change: '+18%', up: true, color: '#4f46e5', bg: '#eef2ff' },
        { label: 'Pedidos totales', value: String(statsData.totalOrders), icon: ShoppingCart, change: '+12%', up: true, color: '#10b981', bg: '#ecfdf5' },
        { label: 'Clientes activos', value: String(statsData.totalCustomers), icon: Users, change: '+24%', up: true, color: '#0ea5e9', bg: '#f0f9ff' },
        { label: 'Promedio por pedido', value: formatCOP(statsData.averageTicket), icon: Receipt, change: '-3%', up: false, color: '#f59e0b', bg: '#fffbeb' },
      ];
    }
    return [
      { label: 'Ventas del período', value: formatCOP(totalSales), icon: DollarSign, change: '', up: true, color: '#4f46e5', bg: '#eef2ff' },
      { label: 'Pedidos del período', value: String(totalOrders), icon: ShoppingCart, change: '', up: true, color: '#10b981', bg: '#ecfdf5' },
    ];
  })();

  const maxSales = Math.max(...filteredMonthlySales.map((s) => s.amount), 1);
  const maxExpenses = Math.max(...filteredMonthlyExpenses.map((e) => e.amount), 1);

  const totalSalesAcc = filteredMonthlySales.reduce((s, x) => s + x.amount, 0);
  const totalExpensesAcc = filteredMonthlyExpenses.reduce((s, x) => s + x.amount, 0);

  /* Distribución mensual de ventas para donut */
  const salesByMonthForDonut = filteredMonthlySales.map((s) => ({ label: monthLabel(s.month).split(' ')[0], value: s.amount }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reportes y estadísticas</h1>
          <p>Análisis del rendimiento del negocio</p>
        </div>
        <button className="btn btn-outline" onClick={() => exportExcel(statsData, monthlySales, monthlyExpenses, paymentsByMethod)}>
          <Download size={18} strokeWidth={1.5} /> Exportar Excel
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 20 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Calendar size={16} strokeWidth={1.5} color="var(--color-text-muted)" />
          <select className="form-control" value={periodType} onChange={(e) => setPeriodType(e.target.value as any)} style={{ width: 130 }}>
            <option value="general">General</option>
            <option value="day">Día</option>
            <option value="month">Mes</option>
            <option value="year">Año</option>
          </select>
          {periodType === 'day' && (
            <input type="date" className="form-control" value={dayValue} onChange={(e) => setDayValue(e.target.value)} style={{ width: 160 }} />
          )}
          {periodType === 'month' && (
            <input type="month" className="form-control" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} style={{ width: 160 }} />
          )}
          {periodType === 'year' && (
            <input type="number" className="form-control" value={yearValue} onChange={(e) => setYearValue(e.target.value)} style={{ width: 100 }} min={2020} max={2100} />
          )}
        </div>
      </div>

      {loading ? (
        <div className="page-placeholder">
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Cargando reportes...</p>
        </div>
      ) : (
        <>
          {stats.length > 0 && (
            <div className="stats-grid" style={{ marginBottom: 28 }}>
              {stats.map((s) => (
                <div className="stat-card" key={s.label}>
                  <div className="stat-info">
                    <span className="stat-label">{s.label}</span>
                    <span className="stat-value">{s.value}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', fontWeight: 600, color: s.up ? '#047857' : '#b91c1c' }}>
                      {s.up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {s.change} vs periodo anterior
                    </div>
                  </div>
                  <div className="stat-icon" style={{ backgroundColor: s.bg, color: s.color }}>
                    <s.icon size={20} strokeWidth={1.5} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ═══ CHARTS ROW — 3 donuts, same type, same height ═══ */}
          <div className="report-grid">
            <div className="card" style={{ minHeight: 380, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 10, borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <PieIcon size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Recaudo por método</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Distribución de pagos</p>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DonutChart
                  data={paymentsByMethod.map((p) => ({ label: p.paymentMethod, value: p.total }))}
                  centerLabel="Total"
                  centerValue={formatCOP(paymentsByMethod.reduce((s, p) => s + p.total, 0))}
                />
              </div>
            </div>

            <div className="card" style={{ minHeight: 380, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 10, borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', color: '#f59e0b' }}>
                  <PieIcon size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Ventas vs Gastos</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Proporción acumulada</p>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DonutChart
                  data={[
                    { label: 'Ventas', value: totalSalesAcc, color: C.indigo },
                    { label: 'Gastos', value: totalExpensesAcc, color: C.amber },
                  ]}
                  centerLabel="Utilidad"
                  centerValue={formatCOP(totalSalesAcc - totalExpensesAcc)}
                />
              </div>
            </div>

            <div className="card" style={{ minHeight: 380, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 10, borderRadius: 'var(--radius-md)', backgroundColor: '#eef2ff', color: '#4f46e5' }}>
                  <PieIcon size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Ventas por mes</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Distribución mensual</p>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <DonutChart
                  data={salesByMonthForDonut}
                  centerLabel="Total"
                  centerValue={formatCOP(totalSalesAcc)}
                />
              </div>
            </div>
          </div>

          {/* ═══ DETAIL ROW — aligned progress bars ═══ */}
          <div className="report-grid">
            {/* Ventas mensuales */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 10, borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <DollarSign size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Ventas mensuales</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Últimos 12 meses</p>
                </div>
              </div>
              {monthlySales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No hay datos de ventas</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {monthlySales.map((s) => {
                    const pct = (s.amount / maxSales) * 100;
                    return (
                      <div key={s.month}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{monthLabel(s.month)}</span>
                          <span style={{ color: 'var(--color-text)', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{formatCOP(s.amount)}</span>
                        </div>
                        <div style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: C.indigo, transition: 'width 600ms ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Gastos mensuales */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 10, borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', color: '#f59e0b' }}>
                  <Package size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Compras / gastos mensuales</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Últimos 12 meses</p>
                </div>
              </div>
              {monthlyExpenses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No hay datos de gastos</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {monthlyExpenses.map((e) => {
                    const pct = (e.amount / maxExpenses) * 100;
                    return (
                      <div key={e.month}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{monthLabel(e.month)}</span>
                          <span style={{ color: 'var(--color-text)', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{formatCOP(e.amount)}</span>
                        </div>
                        <div style={{ width: '100%', height: 8, borderRadius: 4, backgroundColor: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: C.amber, transition: 'width 600ms ease' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pagos por método lista */}
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 10, borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', color: '#10b981' }}>
                  <CreditCard size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Recaudo por método</h2>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Últimos 12 meses</p>
                </div>
              </div>
              {paymentsByMethod.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No hay datos de pagos</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {paymentsByMethod.map((p) => (
                    <div key={p.paymentMethod} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.88rem' }}>
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>{p.paymentMethod}</span>
                      <span style={{ color: 'var(--color-text)', fontWeight: 700, fontFamily: 'ui-monospace, monospace' }}>{formatCOP(p.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
