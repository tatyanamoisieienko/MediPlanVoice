import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle, Mic, Sparkles, Square } from 'lucide-react'
import { ApiFehler, interpretiereBuchungstext, transkribiereAudio } from '../../api/client'
import type { BuchungsEntwurf } from '../../types/api'
import { maximaleAufnahmedauerSekunden, useSprachaufnahme } from './useSprachaufnahme'

type Props = {
  beimUebernehmen: (entwurf: BuchungsEntwurf) => void
  deaktiviert?: boolean
  /** Meldet, ob im Anfragefeld Text steht (für die Rückfrage beim Verlassen). */
  beimTextAendern?: (hatText: boolean) => void
}

const maximaleTextlaenge = 1000
/** Ab dieser Höhe (in Pixeln) wächst das Anfragefeld nicht weiter, sondern scrollt. */
const maximaleFeldhoehe = 400

const angabenBezeichnungen: Record<string, string> = {
  Medizingeraet: 'Medizingerät',
}

export function TextBuchungsanfrage({ beimUebernehmen, deaktiviert = false, beimTextAendern }: Props) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'bereit' | 'laedt'>('bereit')
  const [entwurf, setEntwurf] = useState<BuchungsEntwurf | null>(null)
  const [fehler, setFehler] = useState('')
  const [transkribiert, setTranskribiert] = useState(false)
  const [sprachhinweis, setSprachhinweis] = useState('')
  const anfrageVersion = useRef(0)
  const textfeld = useRef<HTMLTextAreaElement>(null)

  // Passt die Höhe des Anfragefelds an den Inhalt an (Mindesthöhe per CSS, Obergrenze maximaleFeldhoehe).
  const passeFeldhoeheAn = useCallback(() => {
    const feld = textfeld.current
    if (!feld) return
    feld.style.height = 'auto'
    const rahmen = feld.offsetHeight - feld.clientHeight
    const benoetigt = feld.scrollHeight + rahmen
    feld.style.height = `${Math.min(benoetigt, maximaleFeldhoehe)}px`
    feld.style.overflowY = benoetigt > maximaleFeldhoehe ? 'auto' : 'hidden'
  }, [])

  // Bei jeder Textänderung – getippt, gelöscht oder per Spracheingabe eingefügt.
  useLayoutEffect(() => {
    passeFeldhoeheAn()
  }, [text, passeFeldhoeheAn])

  // Eine andere Breite ändert den Zeilenumbruch und damit die benötigte Höhe.
  useEffect(() => {
    window.addEventListener('resize', passeFeldhoeheAn)
    return () => window.removeEventListener('resize', passeFeldhoeheAn)
  }, [passeFeldhoeheAn])
  const aufnahme = useSprachaufnahme(verarbeiteAufnahme)
  const sprachbereichBeschaeftigt = aufnahme.status !== 'bereit' || transkribiert

  function aendereText(neuerText: string) {
    setText(neuerText)
    beimTextAendern?.(neuerText.trim() !== '')
    // Eine Vorschau gilt nur für den Text, aus dem sie interpretiert wurde.
    setEntwurf(null)
    setFehler('')
    setSprachhinweis('')
    setStatus('bereit')
    anfrageVersion.current += 1
  }

  async function starteAufnahme() {
    setFehler('')
    setSprachhinweis('')
    await aufnahme.starte()
  }

  // Setzt nur den erkannten Text ein. Interpretation, Übernahme und Prüfung bleiben bewusste Benutzeraktionen.
  async function verarbeiteAufnahme(audio: Blob) {
    setTranskribiert(true)
    setFehler('')
    try {
      const { text: erkannterText } = await transkribiereAudio(audio)
      aendereText(erkannterText.slice(0, maximaleTextlaenge))
      setSprachhinweis('Erkannter Text wurde eingefügt. Bitte prüfen, bei Bedarf korrigieren und dann „Text interpretieren“ wählen.')
    } catch (fehlerBeimTranskribieren) {
      setFehler(transkriptionsFehlermeldung(fehlerBeimTranskribieren))
    } finally {
      setTranskribiert(false)
    }
  }

  async function interpretiere(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const eingabe = text.trim()
    setEntwurf(null)
    setFehler('')
    if (!eingabe) {
      setFehler('Bitte eine Buchungsanfrage eingeben.')
      return
    }

    const version = ++anfrageVersion.current
    setStatus('laedt')
    try {
      const ergebnis = await interpretiereBuchungstext({ text: eingabe })
      if (version !== anfrageVersion.current) return
      setEntwurf(ergebnis)
    } catch (fehlerBeimInterpretieren) {
      if (version !== anfrageVersion.current) return
      setFehler(fehlerBeimInterpretieren instanceof Error
        ? fehlerBeimInterpretieren.message
        : 'Die Anfrage konnte nicht interpretiert werden.')
    } finally {
      if (version === anfrageVersion.current) setStatus('bereit')
    }
  }

  return (
    <section className="textanfrage" aria-labelledby="textanfrage-titel">
      <h3 id="textanfrage-titel">Buchungsanfrage</h3>

      <form onSubmit={interpretiere} noValidate>
        <div className="textanfrage-eingabe">
          <div className="formularfeld textanfrage-feld">
            <textarea
              ref={textfeld}
              rows={2}
              maxLength={maximaleTextlaenge}
              value={text}
              readOnly={sprachbereichBeschaeftigt}
              onChange={(event) => aendereText(event.target.value)}
              aria-labelledby="textanfrage-titel"
              placeholder="z. B. Buche morgen von 10 bis 11 Uhr den Untersuchungsraum mit Ultraschall zur Routinekontrolle."
            />
          </div>

          <div className="textanfrage-knoepfe">
            {aufnahme.status === 'nimmtAuf' ? (
              <button
                className="icon-knopf icon-knopf-aufnahme ist-aktiv"
                type="button"
                title="Sprachaufnahme stoppen"
                aria-label="Sprachaufnahme stoppen"
                onClick={aufnahme.stoppe}
              >
                <Square aria-hidden="true" fill="currentColor" />
              </button>
            ) : (
              <button
                className="icon-knopf icon-knopf-aufnahme"
                type="button"
                title="Sprachaufnahme starten"
                aria-label="Sprachaufnahme starten"
                disabled={aufnahme.status === 'startet' || transkribiert || status === 'laedt' || deaktiviert}
                onClick={() => void starteAufnahme()}
              >
                {aufnahme.status === 'startet' || transkribiert
                  ? <LoaderCircle aria-hidden="true" className="ist-drehend" />
                  : <Mic aria-hidden="true" />}
              </button>
            )}
            <button
              className="icon-knopf icon-knopf-interpretieren"
              type="submit"
              title="Text interpretieren"
              aria-label="Text interpretieren"
              disabled={status === 'laedt' || sprachbereichBeschaeftigt}
            >
              {status === 'laedt'
                ? <LoaderCircle aria-hidden="true" className="ist-drehend" />
                : <Sparkles aria-hidden="true" />}
            </button>
          </div>
        </div>

        {(aufnahme.status !== 'bereit' || transkribiert || status === 'laedt') && (
          <div className="textanfrage-status">
            {aufnahme.status === 'startet' && <span className="aufnahmehinweis" role="status">Mikrofon wird gestartet …</span>}
            {aufnahme.status === 'nimmtAuf' && (
              <span className="aufnahmeanzeige" role="status">
                Aufnahme läuft · {formatiereDauer(aufnahme.dauer)} / {formatiereDauer(maximaleAufnahmedauerSekunden)}
              </span>
            )}
            {transkribiert && <span className="aufnahmehinweis" role="status">Sprache wird erkannt …</span>}
            {status === 'laedt' && <span className="aufnahmehinweis" role="status">Text wird interpretiert …</span>}
          </div>
        )}
      </form>

      {sprachhinweis && <p className="alternativen-hinweis" role="status">{sprachhinweis}</p>}
      {(fehler || aufnahme.fehler) && (
        <p className="formularmeldung formularmeldung-fehler" role="alert">{fehler || aufnahme.fehler}</p>
      )}

      {entwurf && (
        <div className="entwurfsvorschau" role="status" aria-label="Vorschau der interpretierten Anfrage">
          <strong>Vorschau – noch nicht übernommen</strong>
          <dl className="entwurfsfelder">
            <Entwurfsfeld bezeichnung="Titel / Zweck" wert={entwurf.titelOderZweck} />
            <Entwurfsfeld bezeichnung="Datum" wert={entwurf.datum && formatiereDatum(entwurf.datum)} />
            <Entwurfsfeld bezeichnung="Beginn" wert={entwurf.beginn && formatiereUhrzeit(entwurf.beginn)} />
            <Entwurfsfeld
              bezeichnung="Ende / Dauer"
              wert={formatiereEndeUndDauer(entwurf)}
            />
            <Entwurfsfeld bezeichnung="Raum" wert={entwurf.raum?.name} />
            <Entwurfsfeld
              bezeichnung="Medizingeräte"
              wert={entwurf.medizingeraete.length > 0 ? entwurf.medizingeraete.map((geraet) => geraet.name).join(', ') : null}
              leertext="Keine erkannt"
            />
          </dl>

          {entwurf.fehlendeAngaben.length > 0 && (
            <div className="entwurfsliste entwurfsliste-fehlend">
              <strong>Fehlende Angaben</strong>
              <ul>
                {entwurf.fehlendeAngaben.map((angabe) => <li key={angabe}>{angabenBezeichnungen[angabe] ?? angabe}</li>)}
              </ul>
            </div>
          )}

          {entwurf.unsichereAngaben.length > 0 && (
            <div className="entwurfsliste entwurfsliste-unsicher">
              <strong>Unsichere Angaben</strong>
              <ul>
                {entwurf.unsichereAngaben.map((angabe) => <li key={angabe}>{angabe}</li>)}
              </ul>
            </div>
          )}

          <div className="formularaktionen">
            <button className="sekundaerknopf" type="button" disabled={deaktiviert} onClick={() => beimUebernehmen(entwurf)}>
              In Buchungsformular übernehmen
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function Entwurfsfeld({ bezeichnung, wert, leertext = 'Nicht erkannt' }: {
  bezeichnung: string
  wert: string | null | undefined
  leertext?: string
}) {
  return (
    <div>
      <dt>{bezeichnung}</dt>
      <dd className={wert ? undefined : 'entwurfswert-leer'}>{wert || leertext}</dd>
    </div>
  )
}

function transkriptionsFehlermeldung(fehler: unknown): string {
  if (fehler instanceof ApiFehler) {
    const detail = typeof fehler.daten === 'object' && fehler.daten !== null && 'detail' in fehler.daten
      ? fehler.daten.detail
      : null
    if (typeof detail === 'string' && detail) return detail
    if (fehler.status === 503) return 'Die Spracherkennung ist zurzeit nicht verfügbar. Bitte tippen Sie die Anfrage ein oder versuchen Sie es später erneut.'
    return 'Die Sprachaufnahme konnte nicht in Text umgewandelt werden.'
  }
  return 'Der Server ist nicht erreichbar. Die Sprachaufnahme konnte nicht verarbeitet werden.'
}

function formatiereDauer(sekunden: number): string {
  return `${Math.floor(sekunden / 60)}:${String(sekunden % 60).padStart(2, '0')}`
}

function formatiereDatum(datum: string): string {
  const [jahr, monat, tag] = datum.split('-').map(Number)
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'full' }).format(new Date(jahr, monat - 1, tag))
}

function formatiereUhrzeit(uhrzeit: string): string {
  return `${uhrzeit.slice(0, 5)} Uhr`
}

function formatiereEndeUndDauer(entwurf: BuchungsEntwurf): string | null {
  const teile = [
    entwurf.ende && formatiereUhrzeit(entwurf.ende),
    entwurf.dauerMinuten && `${entwurf.dauerMinuten} Min.`,
  ].filter(Boolean)
  if (teile.length === 0) return null
  return teile.length === 2 ? `${teile[0]} (${teile[1]})` : String(teile[0])
}
