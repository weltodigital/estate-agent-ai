// Renders a recommendation's evidence_json readably. Arrays of objects become
// small tables; nested objects become definition lists.

function label(key: string) {
  const spaced = key.replace(/_/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function scalar(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(1);
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.map(scalar).join(", ") : "—";
  return String(v);
}

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value) && value.length && value.every(isPlainObject)) {
    const cols = [...new Set(value.flatMap((o) => Object.keys(o)))];
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-small">
          <thead className="text-left text-ink-muted">
            <tr>
              {cols.map((c) => (
                <th key={c} className="py-1 pr-3 font-medium">
                  {label(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {value.map((row, i) => (
              <tr key={i} className="border-t border-hairline">
                {cols.map((c) => (
                  <td key={c} className="py-1 pr-3 text-ink">
                    {isPlainObject(row[c]) ? JSON.stringify(row[c]) : scalar(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (isPlainObject(value)) return <Evidence data={value} nested />;
  return <span className="font-mono text-ink">{scalar(value)}</span>;
}

export function Evidence({ data, nested = false }: { data: Record<string, unknown>; nested?: boolean }) {
  return (
    <dl className={nested ? "space-y-1 border-l border-hairline pl-3" : "space-y-2"}>
      {Object.entries(data).map(([k, v]) => (
        <div key={k} className="text-sm">
          <dt className="text-small text-ink-muted">{label(k)}</dt>
          <dd className="break-words">
            {typeof v === "string" && /^https?:\/\//.test(v) ? (
              <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="text-ink underline-offset-2 hover:underline">
                {v}
              </a>
            ) : (
              <Value value={v} />
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
