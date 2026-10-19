import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react'
import type { Sortierung } from './useTabellenansicht'

type SuchleisteProps = {
  wert: string
  beimAendern: (wert: string) => void
  beschriftung: string
  platzhalter: string
  anzahlSichtbar: number
  anzahlGesamt: number
}

/** Kompaktes Suchfeld oberhalb einer Tabelle; filtert bei jeder Eingabe. */
export function Suchleiste({ wert, beimAendern, beschriftung, platzhalter, anzahlSichtbar, anzahlGesamt }: SuchleisteProps) {
  return (
    <div className="tabellenwerkzeuge">
      <div className="suchfeld">
        <Search className="suchfeld-symbol" aria-hidden="true" />
        <input
          type="search"
          value={wert}
          onChange={(event) => beimAendern(event.target.value)}
          aria-label={beschriftung}
          placeholder={platzhalter}
          autoComplete="off"
        />
        {wert && (
          <button type="button" className="suchfeld-leeren" aria-label="Suche leeren" title="Suche leeren" onClick={() => beimAendern('')}>
            <X aria-hidden="true" />
          </button>
        )}
      </div>
      {wert.trim() && (
        <span className="suchtreffer" role="status">
          {anzahlSichtbar} von {anzahlGesamt} {anzahlGesamt === 1 ? 'Eintrag' : 'Einträgen'}
        </span>
      )}
    </div>
  )
}

type SortierkopfProps<S extends string> = {
  spalte: S
  sortierung: Sortierung<S> | null
  beimSortieren: (spalte: S) => void
  children: ReactNode
}

/** Spaltenüberschrift, die per Klick oder Tastatur (Enter/Leertaste) sortiert. */
export function Sortierkopf<S extends string>({ spalte, sortierung, beimSortieren, children }: SortierkopfProps<S>) {
  const aktiv = sortierung?.spalte === spalte
  const richtung = aktiv ? sortierung.richtung : null
  const Symbol = richtung === 'aufsteigend' ? ArrowUp : richtung === 'absteigend' ? ArrowDown : ArrowUpDown

  return (
    <th
      scope="col"
      aria-sort={richtung === 'aufsteigend' ? 'ascending' : richtung === 'absteigend' ? 'descending' : 'none'}
    >
      <button
        type="button"
        className={`sortierknopf${aktiv ? ' ist-sortiert' : ''}`}
        onClick={() => beimSortieren(spalte)}
      >
        <span>{children}</span>
        <Symbol className="sortiersymbol" aria-hidden="true" />
      </button>
    </th>
  )
}

/** Hinweis, wenn die Suche keine Einträge findet. */
export function KeineTreffer({ beimZuruecksetzen }: { beimZuruecksetzen: () => void }) {
  return (
    <div className="datenzustand keine-treffer" role="status">
      <p>Keine passenden Einträge gefunden.</p>
      <button className="sekundaerknopf" type="button" onClick={beimZuruecksetzen}>
        Suche zurücksetzen
      </button>
    </div>
  )
}
