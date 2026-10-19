import { useCallback, useEffect, useRef, useState } from 'react'

export type AufnahmeStatus = 'bereit' | 'startet' | 'nimmtAuf'

export const maximaleAufnahmedauerSekunden = 60

const bevorzugteFormate = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']

function waehleFormat(): string | undefined {
  return bevorzugteFormate.find((format) => MediaRecorder.isTypeSupported(format))
}

function mikrofonFehlermeldung(fehler: unknown): string {
  const name = fehler instanceof DOMException ? fehler.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Der Zugriff auf das Mikrofon wurde verweigert. Bitte erlauben Sie den Mikrofonzugriff im Browser und versuchen Sie es erneut.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Es wurde kein Mikrofon gefunden.'
    case 'NotReadableError':
    case 'AbortError':
      return 'Das Mikrofon kann nicht verwendet werden. Möglicherweise wird es von einer anderen Anwendung genutzt.'
    default:
      return 'Die Aufnahme konnte nicht gestartet werden.'
  }
}

/**
 * Nimmt Audio über das Browser-Mikrofon auf. Erkennt selbst keine Sprache,
 * sondern übergibt die fertige Aufnahme an `beimFertig`.
 */
export function useSprachaufnahme(beimFertig: (audio: Blob) => void) {
  const [status, setStatus] = useState<AufnahmeStatus>('bereit')
  const [dauer, setDauer] = useState(0)
  const [fehler, setFehler] = useState('')
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const zeitlimit = useRef<number | undefined>(undefined)
  const eingebunden = useRef(true)
  const beimFertigAktuell = useRef(beimFertig)

  useEffect(() => {
    beimFertigAktuell.current = beimFertig
  })

  const gibMikrofonFrei = useCallback(() => {
    window.clearTimeout(zeitlimit.current)
    stream.current?.getTracks().forEach((spur) => spur.stop())
    stream.current = null
    recorder.current = null
  }, [])

  useEffect(() => {
    eingebunden.current = true
    return () => {
      eingebunden.current = false
      const aktiv = recorder.current
      if (aktiv) {
        aktiv.onstop = null
        if (aktiv.state !== 'inactive') aktiv.stop()
      }
      gibMikrofonFrei()
    }
  }, [gibMikrofonFrei])

  useEffect(() => {
    if (status !== 'nimmtAuf') return
    const zaehler = window.setInterval(() => setDauer((bisher) => bisher + 1), 1000)
    return () => window.clearInterval(zaehler)
  }, [status])

  async function starte() {
    setFehler('')
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setFehler('Dieser Browser unterstützt keine Audioaufnahme.')
      return
    }

    setStatus('startet')
    let mikrofon: MediaStream
    try {
      mikrofon = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (fehlerBeimStarten) {
      if (!eingebunden.current) return
      setStatus('bereit')
      setFehler(mikrofonFehlermeldung(fehlerBeimStarten))
      return
    }
    if (!eingebunden.current) {
      mikrofon.getTracks().forEach((spur) => spur.stop())
      return
    }

    let neueAufnahme: MediaRecorder
    try {
      const format = waehleFormat()
      neueAufnahme = new MediaRecorder(mikrofon, format ? { mimeType: format } : undefined)
    } catch {
      mikrofon.getTracks().forEach((spur) => spur.stop())
      setStatus('bereit')
      setFehler('Die Aufnahme konnte nicht gestartet werden.')
      return
    }

    const teile: Blob[] = []
    neueAufnahme.ondataavailable = (event) => {
      if (event.data.size > 0) teile.push(event.data)
    }
    neueAufnahme.onerror = () => {
      neueAufnahme.onstop = null
      if (neueAufnahme.state !== 'inactive') neueAufnahme.stop()
      gibMikrofonFrei()
      setStatus('bereit')
      setFehler('Bei der Aufnahme ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.')
    }
    neueAufnahme.onstop = () => {
      gibMikrofonFrei()
      setStatus('bereit')
      const audio = new Blob(teile, { type: neueAufnahme.mimeType || teile[0]?.type || 'audio/webm' })
      if (audio.size === 0) {
        setFehler('Die Aufnahme enthält keine Audiodaten. Bitte versuchen Sie es erneut.')
        return
      }
      beimFertigAktuell.current(audio)
    }

    stream.current = mikrofon
    recorder.current = neueAufnahme
    neueAufnahme.start()
    zeitlimit.current = window.setTimeout(() => stoppe(), maximaleAufnahmedauerSekunden * 1000)
    setDauer(0)
    setStatus('nimmtAuf')
  }

  function stoppe() {
    window.clearTimeout(zeitlimit.current)
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  return { status, dauer, fehler, starte, stoppe }
}
