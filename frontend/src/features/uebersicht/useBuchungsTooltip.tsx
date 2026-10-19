import { useEffect, useState, type FocusEvent, type MouseEvent } from 'react'
import type { Buchung } from '../../types/api'
import { BuchungsTooltip, type TooltipZiel } from './BuchungsTooltip'

type Anzeige = TooltipZiel & { element: HTMLElement }

/** Sichtbarer Teil eines Elements (z. B. unter einem fixierten Kopf oder außerhalb des Scrollbereichs); null, wenn nichts sichtbar ist. */
function sichtbarerBereich(element: HTMLElement): TooltipZiel['rechteck'] | null {
  const block = element.getBoundingClientRect()
  const grenzElement = element.closest<HTMLElement>('[data-tooltip-grenze]')
  const grenze = grenzElement?.getBoundingClientRect()
  const kopfHoehe = grenzElement?.querySelector<HTMLElement>('[data-tooltip-kopf]')?.offsetHeight ?? 0
  const top = Math.max(block.top, grenze ? grenze.top + kopfHoehe : 0, 0)
  const bottom = Math.min(block.bottom, grenze?.bottom ?? Infinity, window.innerHeight)
  const left = Math.max(block.left, grenze?.left ?? 0, 0)
  const right = Math.min(block.right, grenze?.right ?? Infinity, document.documentElement.clientWidth)
  return bottom > top && right > left ? { left, right, top, bottom } : null
}

/**
 * Tooltip-Zustand für Buchungseinträge: erscheint bei Hover und Tastaturfokus, folgt dem Block beim Scrollen
 * und schließt beim Verlassen, wenn der Block nicht mehr sichtbar ist, bei Größenänderung und mit Escape.
 */
export function useBuchungsTooltip(geraetenamen: Map<number, string>) {
  const [anzeige, setAnzeige] = useState<Anzeige | null>(null)

  function zeigen(buchung: Buchung, element: HTMLElement) {
    const rechteck = sichtbarerBereich(element)
    setAnzeige(rechteck ? { buchung, rechteck, element } : null)
  }

  useEffect(() => {
    if (!anzeige) return
    const { buchung, element } = anzeige
    const nachfuehren = () => (element.isConnected ? zeigen(buchung, element) : setAnzeige(null))
    const schliessen = () => setAnzeige(null)
    const beiTaste = (ereignis: KeyboardEvent) => { if (ereignis.key === 'Escape') schliessen() }
    window.addEventListener('scroll', nachfuehren, true)
    window.addEventListener('resize', schliessen)
    window.addEventListener('keydown', beiTaste)
    return () => {
      window.removeEventListener('scroll', nachfuehren, true)
      window.removeEventListener('resize', schliessen)
      window.removeEventListener('keydown', beiTaste)
    }
  }, [anzeige])

  const verbergen = () => setAnzeige(null)

  /** Ereignisse für ein Element, das den Tooltip zu einer Buchung auslöst. */
  const ausloeser = (buchung: Buchung) => ({
    onMouseEnter: (ereignis: MouseEvent<HTMLElement>) => zeigen(buchung, ereignis.currentTarget),
    // Nach Scrollen oder Escape erscheint der Tooltip wieder, sobald die Maus auf dem Block bewegt wird.
    onMouseMove: (ereignis: MouseEvent<HTMLElement>) => { if (anzeige?.element !== ereignis.currentTarget) zeigen(buchung, ereignis.currentTarget) },
    onMouseLeave: verbergen,
    onFocus: (ereignis: FocusEvent<HTMLElement>) => zeigen(buchung, ereignis.currentTarget),
    onBlur: verbergen,
  })

  const tooltip = anzeige ? <BuchungsTooltip buchung={anzeige.buchung} rechteck={anzeige.rechteck} geraetenamen={geraetenamen} /> : null
  return { ausloeser, tooltip }
}
