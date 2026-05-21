import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const hasMultiple = totalPages > 1;

  const pages: (number | string)[] = [];
  const maxVisible = 5;
  let start = Math.max(0, page - 2);
  let end = Math.min(totalPages - 1, start + maxVisible - 1);
  if (end - start < maxVisible - 1) {
    start = Math.max(0, end - maxVisible + 1);
  }

  if (start > 0) {
    pages.push(0);
    if (start > 1) pages.push('...');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) {
    if (end < totalPages - 2) pages.push('...');
    pages.push(totalPages - 1);
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 28, flexWrap: 'wrap' }}>
      <button
        className="btn btn-outline"
        style={{ padding: '8px 12px', minWidth: 40, opacity: hasMultiple ? 1 : 0.5 }}
        onClick={() => onChange(Math.max(0, page - 1))}
        disabled={page === 0 || !hasMultiple}
        title="Anterior"
      >
        <ChevronLeft size={16} strokeWidth={1.5} />
      </button>

      {hasMultiple ? (
        pages.map((p, idx) =>
          typeof p === 'string' ? (
            <span key={`ellipsis-${idx}`} style={{ padding: '8px 10px', color: 'var(--color-text-muted)', fontSize: '0.85rem', userSelect: 'none' }}>
              {p}
            </span>
          ) : (
            <button
              key={p}
              className={p === page ? 'btn btn-primary' : 'btn btn-outline'}
              style={{ padding: '8px 14px', minWidth: 40, fontSize: '0.85rem', fontWeight: 700 }}
              onClick={() => onChange(p)}
            >
              {p + 1}
            </button>
          )
        )
      ) : (
        <span style={{ padding: '8px 14px', fontSize: '0.85rem', color: 'var(--color-text-muted)', userSelect: 'none' }}>1</span>
      )}

      <button
        className="btn btn-outline"
        style={{ padding: '8px 12px', minWidth: 40, opacity: hasMultiple ? 1 : 0.5 }}
        onClick={() => onChange(Math.min(totalPages - 1, page + 1))}
        disabled={page >= totalPages - 1 || !hasMultiple}
        title="Siguiente"
      >
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>

      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
        Página {page + 1} de {Math.max(1, totalPages)}
      </span>
    </div>
  );
}
