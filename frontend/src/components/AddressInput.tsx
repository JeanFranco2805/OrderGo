import { useState, useEffect, useRef } from 'react';

const TIPOS_VIA = ['Calle', 'Carrera', 'Avenida', 'Transversal', 'Diagonal', 'Circular', 'Vía'];
const SUFIJOS = ['', 'Sur', 'Norte', 'Este', 'Oeste'];
const MUNICIPIOS = ['Barranquilla', 'Soledad', 'Malambo'];

interface AddressParts {
  tipoVia: string;
  numero: string;
  sufijo: string;
  numeral: string;
  complemento: string;
  municipio: string;
}

function parseAddress(value: string): AddressParts {
  const result: AddressParts = { tipoVia: '', numero: '', sufijo: '', numeral: '', complemento: '', municipio: 'Barranquilla' };
  if (!value) return result;

  // Pattern: "TipoVia Numero Sufijo #Numeral, Complemento, Municipio, Atlantico, Colombia"
  const regex = /^(Calle|Carrera|Avenida|Transversal|Diagonal|Circular|Vía)\s+([^\s#]+)(?:\s+(Sur|Norte|Este|Oeste))?\s+#\s*([^,]+)(?:,\s*([^,]+))?\s*,\s*([^,]+)\s*,\s*Atlántico\s*,\s*Colombia/i;
  const match = value.match(regex);
  if (match) {
    result.tipoVia = match[1];
    result.numero = match[2].trim();
    result.sufijo = match[3] ? match[3].trim() : '';
    result.numeral = match[4].trim();
    result.complemento = match[5] ? match[5].trim() : '';
    result.municipio = match[6].trim();
    return result;
  }

  // Soft fallback
  for (const t of TIPOS_VIA) {
    if (value.toLowerCase().startsWith(t.toLowerCase())) {
      result.tipoVia = t;
      break;
    }
  }
  result.municipio = 'Barranquilla';
  result.complemento = value;
  return result;
}

function buildAddress(parts: AddressParts): string {
  const { tipoVia, numero, sufijo, numeral, complemento, municipio } = parts;
  if (!tipoVia || !numero || !numeral) return '';
  let addr = `${tipoVia} ${numero}`;
  if (sufijo) addr += ` ${sufijo}`;
  addr += ` #${numeral}`;
  if (complemento) addr += `, ${complemento}`;
  if (municipio) addr += `, ${municipio}`;
  addr += ', Atlántico, Colombia';
  return addr;
}

interface AddressInputProps {
  value: string;
  onChange: (address: string) => void;
  label?: string;
}

export default function AddressInput({ value, onChange, label = 'Dirección' }: AddressInputProps) {
  const [parts, setParts] = useState<AddressParts>(parseAddress(value));
  const isInternal = useRef(false);

  // Only sync from parent prop if it did NOT come from our own onChange
  useEffect(() => {
    if (isInternal.current) {
      isInternal.current = false;
      return;
    }
    setParts(parseAddress(value));
  }, [value]);

  const update = (field: keyof AddressParts, val: string) => {
    const next = { ...parts, [field]: val };
    setParts(next);
    isInternal.current = true; // mark that this change came from inside
    onChange(buildAddress(next));
  };

  // Prevent select from capturing Ctrl+Number shortcuts
  const preventSelectHotkeys = (e: React.KeyboardEvent<HTMLSelectElement>) => {
    if (e.ctrlKey && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Tipo de vía */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Tipo de vía</label>
          <select
            className="form-control"
            value={parts.tipoVia}
            onChange={(e) => update('tipoVia', e.target.value)}
            onKeyDown={preventSelectHotkeys}
          >
            <option value="">Selecciona...</option>
            {TIPOS_VIA.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Número + Sufijo + Numeral */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Número</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: 43, 3A"
              value={parts.numero}
              onChange={(e) => update('numero', e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Sufijo (opcional)</label>
            <select
              className="form-control"
              value={parts.sufijo}
              onChange={(e) => update('sufijo', e.target.value)}
              onKeyDown={preventSelectHotkeys}
            >
              {SUFIJOS.map((s) => (
                <option key={s || '-'} value={s}>{s || '—'}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}># (Numeral)</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej: 46K-03"
              value={parts.numeral}
              onChange={(e) => update('numeral', e.target.value)}
            />
          </div>
        </div>

        {/* Complemento */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Complemento (opcional)</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: Apto 101, Local 2, Casa..."
            value={parts.complemento}
            onChange={(e) => update('complemento', e.target.value)}
          />
        </div>

        {/* Municipio */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Municipio</label>
          <select
            className="form-control"
            value={parts.municipio}
            onChange={(e) => update('municipio', e.target.value)}
            onKeyDown={preventSelectHotkeys}
          >
            {MUNICIPIOS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontFamily: 'ui-monospace, monospace' }}>
        {buildAddress(parts) || 'Completa los campos para generar la dirección'}
      </div>
    </div>
  );
}
