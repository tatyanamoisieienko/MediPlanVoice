import { useRef, useState, type FormEvent } from 'react'
import { interpretiereBuchungstext } from '../../api/client'
import type { BuchungsEntwurf } from '../../types/api'

type Props = {
  beimUebernehmen: (entwurf: BuchungsEntwurf) => void
  deaktiviert?: boolean
}

const maximaleTextlaenge = 1000

const angabenBezeichnungen: Record<string, string> = {
  Medizingeraet: 'Medizingerät',
}

export function TextBuchungsanfrage({ beimUebernehmen, deaktiviert = false }: Props) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'bereit' | 'laedt'>('bereit')
  const [entwurf, setEntwurf] = useState<BuchungsEntwurf | null>(null)
  const [fehler, setFehler] = useState('')
  const anfrageVersion = useRef(0)

  function aendereText(neuerText: string) {
    setText(neuerText)
    // Eine Vorschau gilt nur für den Text, aus dem sie interpretiert wurde.
    setEntwurf(null)
    setFehler('')
    anfrageVersion.current += 1
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
      <h3 id="textanfrage-titel">Buchungsanfrage als Text</h3>
      <p className="textanfrage-hinweis">
        Der Text wird nur interpretiert, nicht gebucht. Erkannte Werte können anschließend bewusst in das Buchungsformular übernommen werden.
      </p>

      <form onSubmit={interpretiere} noValidate>
        <label className="formularfeld">
          <span>Anfrage</span>
          <textarea
            rows={2}
            maxLength={maximaleTextlaenge}
            value={text}
            onChange={(event) => aendereText(event.target.value)}
            placeholder="z. B. Buche morgen von 10 bis 11 Uhr den Untersuchungsraum mit Ultraschall zur Routinekontrolle."
          />
        </label>
        <div className="formularaktionen">
          <button className="sekundaerknopf" type="submit" disabled={status === 'laedt'}>
            {status === 'laedt' ? 'Interpretiert …' : 'Text interpretieren'}
          </button>
        </div>
      </form>

      {fehler && <p className="formularmeldung formularmeldung-fehler" role="alert">{fehler}</p>}

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
