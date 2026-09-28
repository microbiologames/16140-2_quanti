import type { AnalysisResult } from '@/core/analysis'

function Figure({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="numeric text-base !text-left">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-slate-500">{unit}</span>}
      </dd>
    </div>
  )
}

const format = (value: number) => (Number.isFinite(value) ? value.toFixed(3) : '—')

export function Summary({ result }: { result: AnalysisResult }) {
  const { overall, dataset } = result
  const excluded = dataset.samples.length - overall.n

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <Figure label="Échantillons" value={String(dataset.samples.length)} />
      <Figure label="Interprétables" value={`${overall.n}`} unit={`dont ${excluded} écartés`} />
      <Figure label="Biais moyen" value={format(overall.meanDifference)} unit="log" />
      <Figure label="Écart-type" value={format(overall.standardDeviation)} unit="log" />
      <Figure
        label="Limites à 95 %"
        value={`${format(overall.lowerLimit)} … ${format(overall.upperLimit)}`}
      />
    </dl>
  )
}
