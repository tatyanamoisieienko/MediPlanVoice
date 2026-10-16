import type { ReactNode } from 'react'

type Props = {
  laedt: boolean
  fehler: string
  leer: boolean
  leertext: string
  erneutLaden: () => void
  children: ReactNode
}

export function Datenzustand({ laedt, fehler, leer, leertext, erneutLaden, children }: Props) {
  if (laedt) {
    return (
      <div className="datenzustand" role="status">
        <span className="ladeanzeige" aria-hidden="true" />
        <p>Daten werden geladen …</p>
      </div>
    )
  }

  if (fehler) {
    return (
      <div className="datenzustand fehlerzustand" role="alert">
        <strong>Daten konnten nicht geladen werden</strong>
        <p>{fehler}</p>
        <button className="sekundaerknopf" type="button" onClick={erneutLaden}>
          Erneut versuchen
        </button>
      </div>
    )
  }

  if (leer) {
    return (
      <div className="datenzustand" role="status">
        <p>{leertext}</p>
      </div>
    )
  }

  return children
}