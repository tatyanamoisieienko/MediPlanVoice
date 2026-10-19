import { useState } from 'react'

export type Sortierrichtung = 'aufsteigend' | 'absteigend'

/** Ein Sortierwert ist Text, eine Zahl (z. B. Kapazität, Zeitstempel) oder eine Folge davon (z. B. Beginn, dann Ende). */
export type Sortierwert = string | number | readonly (string | number)[]

export type Sortierung<S extends string> = { spalte: S; richtung: Sortierrichtung }

type Optionen<T, S extends string> = {
  /** Liefert den durchsuchbaren Text eines Eintrags (alle relevanten, angezeigten Felder). */
  suchtext: (eintrag: T) => string
  /** Liefert je sortierbarer Spalte den Wert, nach dem sortiert wird. */
  sortierwerte: Record<S, (eintrag: T) => Sortierwert>
}

const sprachvergleich = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })

function vergleicheEinzeln(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return sprachvergleich.compare(String(a), String(b))
}

function vergleiche(a: Sortierwert, b: Sortierwert): number {
  const links = Array.isArray(a) ? a : [a]
  const rechts = Array.isArray(b) ? b : [b]
  for (let index = 0; index < Math.min(links.length, rechts.length); index++) {
    const ergebnis = vergleicheEinzeln(links[index], rechts[index])
    if (ergebnis !== 0) return ergebnis
  }
  return links.length - rechts.length
}

function normalisiere(text: string): string {
  return text.toLocaleLowerCase('de-DE')
}

/**
 * Suche und Sortierung für Tabellen auf bereits geladenen Daten.
 * Zuerst wird gefiltert, danach sortiert; ohne gewählte Spalte bleibt die ursprüngliche Reihenfolge erhalten.
 */
export function useTabellenansicht<T, S extends string>(eintraege: readonly T[], { suchtext, sortierwerte }: Optionen<T, S>) {
  const [suche, setSuche] = useState('')
  const [sortierung, setSortierung] = useState<Sortierung<S> | null>(null)

  const begriffe = normalisiere(suche).split(/\s+/).filter(Boolean)
  const gefiltert = begriffe.length === 0
    ? [...eintraege]
    : eintraege.filter((eintrag) => {
      const text = normalisiere(suchtext(eintrag))
      return begriffe.every((begriff) => text.includes(begriff))
    })

  const sichtbar = sortierung
    ? gefiltert
      .map((eintrag, index) => ({ eintrag, index, wert: sortierwerte[sortierung.spalte](eintrag) }))
      .sort((a, b) => {
        const ergebnis = vergleiche(a.wert, b.wert)
        // Bei gleichen Werten bleibt die bisherige Reihenfolge stabil.
        if (ergebnis === 0) return a.index - b.index
        return sortierung.richtung === 'aufsteigend' ? ergebnis : -ergebnis
      })
      .map(({ eintrag }) => eintrag)
    : gefiltert

  function sortiereNach(spalte: S) {
    setSortierung((aktuell) =>
      aktuell?.spalte === spalte && aktuell.richtung === 'aufsteigend'
        ? { spalte, richtung: 'absteigend' }
        : { spalte, richtung: 'aufsteigend' })
  }

  return {
    suche,
    setSuche,
    sortierung,
    sortiereNach,
    eintraege: sichtbar,
    anzahlGesamt: eintraege.length,
  }
}
