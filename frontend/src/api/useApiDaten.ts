import { useEffect, useState } from 'react'

type ApiStatus = 'laedt' | 'bereit' | 'fehler'

export function useApiDaten<T>(ladeDaten: (signal: AbortSignal) => Promise<T>) {
  const [ladeVersuch, setLadeVersuch] = useState(0)
  const [zustand, setZustand] = useState<{
    versuch: number
    status: ApiStatus
    daten: T | null
    fehlermeldung: string
  }>({ versuch: -1, status: 'laedt', daten: null, fehlermeldung: '' })

  useEffect(() => {
    const controller = new AbortController()

    ladeDaten(controller.signal)
      .then((ergebnis) => {
        setZustand({ versuch: ladeVersuch, status: 'bereit', daten: ergebnis, fehlermeldung: '' })
      })
      .catch((fehler: unknown) => {
        if (controller.signal.aborted) return
        setZustand({
          versuch: ladeVersuch,
          status: 'fehler',
          daten: null,
          fehlermeldung: fehler instanceof Error ? fehler.message : 'Unbekannter Fehler.',
        })
      })

    return () => controller.abort()
  }, [ladeDaten, ladeVersuch])

  const aktuellerVersuch = zustand.versuch === ladeVersuch
  return {
    daten: aktuellerVersuch ? zustand.daten : null,
    status: aktuellerVersuch ? zustand.status : 'laedt',
    fehlermeldung: aktuellerVersuch ? zustand.fehlermeldung : '',
    erneutLaden: () => setLadeVersuch((versuch) => versuch + 1),
  }
}