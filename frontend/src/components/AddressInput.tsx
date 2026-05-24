import { useState, useEffect, useRef } from 'react';

const TIPOS_VIA = ['Calle', 'Carrera'];

const LETRAS = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

const MUNICIPIOS = ['Barranquilla', 'Soledad', 'Malambo'];

export interface AddressParts {
  tipoVia: string;
  numeroVia: string;
  letraVia: string;
  bis: boolean;
  numeral: string;
  letraNumeral: string;
  numCasa: string;
  barrio: string;
  municipio: string;
}

/** Returns the opposite street type for geocoding */
function getOppositeVia(tipoVia: string): string {
  return tipoVia === 'Calle' ? 'Carrera' : 'Calle';
}

export function parseAddress(value: string): AddressParts {
  const result: AddressParts = {
    tipoVia: '', numeroVia: '', letraVia: '', bis: false,
    numeral: '', letraNumeral: '', numCasa: '',
    barrio: '', municipio: 'Barranquilla'
  };
  if (!value) return result;

  // Try to parse: "Carrera 43A Bis # 72B - 15, Barrio, Barranquilla, Atlántico, Colombia"
  // Also works if the pattern appears anywhere in the string (e.g., after "Urbanización X, ...")
  const regex = /(Calle|Carrera)\s+(\d+)([A-Z])?\s*(Bis)?\s+#\s*(\d+)([A-Z])?\s*-\s*([^,\s]+)(?:,\s*([^,]+))?\s*,\s*(Barranquilla|Soledad|Malambo)\s*,\s*Atlántico\s*,\s*Colombia/i;
  const match = value.match(regex);
  if (match) {
    result.tipoVia = match[1];
    result.numeroVia = match[2];
    result.letraVia = match[3] || '';
    result.bis = !!match[4];
    result.numeral = match[5];
    result.letraNumeral = match[6] || '';
    result.numCasa = match[7];
    result.barrio = match[8] ? match[8].trim() : '';
    result.municipio = match[9] ? match[9].trim() : 'Barranquilla';
    return result;
  }

  // Soft fallback
  for (const t of TIPOS_VIA) {
    if (value.toLowerCase().startsWith(t.toLowerCase())) {
      result.tipoVia = t;
      break;
    }
  }
  result.barrio = value;
  return result;
}

/** Build full address for display / storage */
export function buildFullAddress(parts: AddressParts): string {
  const { tipoVia, numeroVia, letraVia, bis, numeral, letraNumeral, numCasa, barrio, municipio } = parts;
  if (!tipoVia || !numeroVia || !numeral) return '';
  let addr = `${tipoVia} ${numeroVia}`;
  if (letraVia) addr += letraVia;
  if (bis) addr += ' Bis';
  addr += ` # ${numeral}`;
  if (letraNumeral) addr += letraNumeral;
  addr += ` - ${numCasa}`;
  if (barrio) addr += `, ${barrio}`;
  if (municipio) addr += `, ${municipio}`;
  addr += ', Atlántico, Colombia';
  return addr;
}

/** Build address for geocoding (without house number and barrio, with opposite street type) */
export function buildGeocodeAddress(parts: AddressParts): string {
  const { tipoVia, numeroVia, letraVia, bis, numeral, letraNumeral, municipio } = parts;
  if (!tipoVia || !numeroVia || !numeral) return '';
  const tipoSecundaria = getOppositeVia(tipoVia);
  let addr = `${tipoVia} ${numeroVia}`;
  if (letraVia) addr += letraVia;
  if (bis) addr += ' Bis';
  addr += ` # ${tipoSecundaria} ${numeral}`;
  if (letraNumeral) addr += letraNumeral;
  if (municipio) addr += `, ${municipio}`;
  addr += ', Atlántico, Colombia';
  return addr;
}

/** Build address WITH house number for more precise geocoding */
export function buildGeocodeAddressWithHouse(parts: AddressParts): string {
  const { tipoVia, numeroVia, letraVia, bis, numeral, letraNumeral, numCasa, municipio } = parts;
  if (!tipoVia || !numeroVia || !numeral) return '';
  const tipoSecundaria = getOppositeVia(tipoVia);
  let addr = `${tipoVia} ${numeroVia}`;
  if (letraVia) addr += letraVia;
  if (bis) addr += ' Bis';
  addr += ` # ${tipoSecundaria} ${numeral}`;
  if (letraNumeral) addr += letraNumeral;
  if (numCasa) addr += ` - ${numCasa}`;
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

  useEffect(() => {
    if (isInternal.current) {
      isInternal.current = false;
      return;
    }
    setParts(parseAddress(value));
  }, [value]);

  const update = (field: keyof AddressParts, val: string | boolean) => {
    const next = { ...parts, [field]: val };
    setParts(next);
    isInternal.current = true;
    onChange(buildFullAddress(next));
  };

  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Municipio */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Municipio</label>
          <select
            className="form-control"
            value={parts.municipio}
            onChange={(e) => update('municipio', e.target.value)}
          >
            {MUNICIPIOS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Tipo vía + Número + Letra + Bis */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px 60px', gap: 8, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Vía</label>
            <select
              className="form-control"
              value={parts.tipoVia}
              onChange={(e) => update('tipoVia', e.target.value)}
            >
              <option value="">...</option>
              {TIPOS_VIA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Número</label>
            <input
              type="text"
              className="form-control"
              placeholder="43"
              value={parts.numeroVia}
              onChange={(e) => update('numeroVia', e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Letra</label>
            <select
              className="form-control"
              value={parts.letraVia}
              onChange={(e) => update('letraVia', e.target.value)}
              style={{ paddingLeft: 4, paddingRight: 4 }}
            >
              {LETRAS.map((l) => (
                <option key={l || '-'} value={l}>{l || '—'}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingBottom: 8 }}>
            <input
              type="checkbox"
              id="bis-check"
              checked={parts.bis}
              onChange={(e) => update('bis', e.target.checked)}
              style={{ width: 18, height: 18, cursor: 'pointer' }}
            />
            <label htmlFor="bis-check" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer' }}>Bis</label>
          </div>
        </div>

        {/* # + Número secundario + Letra secundaria */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px', gap: 8, alignItems: 'end' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingBottom: 8 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)' }}>#</span>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Número secundario</label>
            <input
              type="text"
              className="form-control"
              placeholder="72"
              value={parts.numeral}
              onChange={(e) => update('numeral', e.target.value.replace(/\D/g, ''))}
              style={{ textAlign: 'center' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Letra</label>
            <select
              className="form-control"
              value={parts.letraNumeral}
              onChange={(e) => update('letraNumeral', e.target.value)}
              style={{ paddingLeft: 4, paddingRight: 4 }}
            >
              {LETRAS.map((l) => (
                <option key={l || '-'} value={l}>{l || '—'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* - + Número de casa / placa */}
        <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: 8, alignItems: 'end' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', paddingBottom: 8 }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-text)' }}>-</span>
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Número de casa / Placa <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(solo para el domiciliario)</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="15"
              value={parts.numCasa}
              onChange={(e) => update('numCasa', e.target.value.replace(/[^\d]/g, ''))}
              style={{ textAlign: 'center' }}
            />
          </div>
        </div>

        {/* Barrio (libre) */}
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4, display: 'block' }}>Barrio / Urbanización (opcional)</label>
          <input
            type="text"
            className="form-control"
            placeholder="Ej: Riomar, Villa del Este, Ciudadela 20 de Julio..."
            value={parts.barrio}
            onChange={(e) => update('barrio', e.target.value)}
          />
        </div>

      </div>

      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg)', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontFamily: 'ui-monospace, monospace', border: '1px solid var(--color-border)' }}>
        {buildFullAddress(parts) || 'Completa los campos para generar la dirección'}
      </div>
    </div>
  );
}
