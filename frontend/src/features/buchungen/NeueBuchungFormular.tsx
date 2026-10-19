import { useEffect, useRef, useState, type FormEvent } from 'react'
import { aendereBuchung, ApiFehler, holeMedizingeraete, holeRaeume, legeBuchungAn, pruefeBuchungsverfuegbarkeit, sucheAlternativen } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import type { AlternativenAnfrage, AlternativenErgebnis, Buchung, BuchungsEntwurf, Buchungskonflikt, VerfuegbarkeitsErgebnis } from '../../types/api'
import { Datenzustand } from '../../components/Datenzustand'
import { DatumZeitFeld } from '../../components/DatumZeitFeld'
import { EinzelAuswahl, MehrfachAuswahl } from '../../components/Auswahlfelder'
import { TextBuchungsanfrage } from './TextBuchungsanfrage'

type Props = {
  beimSpeichern: (buchung: Buchung) => void
  beimSchliessen: () => void
  buchungZumBearbeiten?: Buchung
  /** false, wenn die umgebende Ansicht Überschrift und Zurück-Aktion selbst darstellt. */
  eigenerKopf?: boolean
  /** Meldet, ob seit dem Öffnen etwas eingegeben wurde (Formular oder Anfragetext). */
  beimEingabestatus?: (hatEingaben: boolean) => void
}

type FormularWerte = {
  titel: string
  beginn: string
  ende: string
  raumId: string
  medizingeraetIds: number[]
}

type AlternativenLadezustand =
  | { status: 'laedt' }
  | { status: 'geladen'; ergebnis: AlternativenErgebnis }
  | { status: 'fehler'; meldung: string }

const leereWerte: FormularWerte = {
  titel: '',
  beginn: '',
  ende: '',
  raumId: '',
  medizingeraetIds: [],
}

function formularWerteAusBuchung(buchung?: Buchung): FormularWerte {
  if (!buchung) return leereWerte

  return {
    titel: buchung.titel,
    beginn: lokaleZeitFuerEingabe(buchung.beginn),
    ende: lokaleZeitFuerEingabe(buchung.ende),
    raumId: String(buchung.raumId),
    medizingeraetIds: [...buchung.medizingeraetIds],
  }
}

/**
 * Überträgt ausschließlich sicher erkannte Werte. Als fehlend markierte Angaben,
 * Uhrzeiten ohne Datum und nicht (mehr) aktive Ressourcen bleiben leer.
 */
function formularWerteAusEntwurf(
  entwurf: BuchungsEntwurf,
  aktiveRaumIds: Set<number>,
  aktiveGeraetIds: Set<number>,
): { werte: FormularWerte; hinweise: string[] } {
  const fehlend = new Set(entwurf.fehlendeAngaben)
  const hinweise: string[] = []
  const datum = !fehlend.has('Datum') ? entwurf.datum : null
  const beginn = datum && !fehlend.has('Beginn') && entwurf.beginn ? `${datum}T${entwurf.beginn.slice(0, 5)}` : ''
  const ende = datum && !fehlend.has('Ende') && entwurf.ende ? `${datum}T${entwurf.ende.slice(0, 5)}` : ''
  if (!datum && (entwurf.beginn || entwurf.ende)) {
    hinweise.push('Erkannte Uhrzeiten wurden ohne Datum nicht übernommen.')
  }

  const raum = !fehlend.has('Raum') ? entwurf.raum : null
  const raumId = raum && aktiveRaumIds.has(raum.id) ? String(raum.id) : ''
  if (raum && !raumId) hinweise.push(`Der Raum „${raum.name}“ ist nicht mehr aktiv und wurde nicht übernommen.`)

  const geraete = fehlend.has('Medizingeraet') ? [] : entwurf.medizingeraete
  const medizingeraetIds = geraete.filter((geraet) => aktiveGeraetIds.has(geraet.id)).map((geraet) => geraet.id)
  if (medizingeraetIds.length < geraete.length) hinweise.push('Nicht mehr aktive Medizingeräte wurden nicht übernommen.')

  return {
    werte: {
      titel: !fehlend.has('Titel oder Zweck') ? entwurf.titelOderZweck?.trim() ?? '' : '',
      beginn,
      ende,
      raumId,
      medizingeraetIds,
    },
    hinweise,
  }
}

function istVerfuegbarkeitsergebnis(daten: unknown): daten is VerfuegbarkeitsErgebnis {
  return typeof daten === 'object' && daten !== null && 'konflikte' in daten && 'verfuegbar' in daten
}

function validiere(wert: FormularWerte): string[] {
  const fehler: string[] = []
  if (!wert.titel.trim()) fehler.push('Titel oder Zweck darf nicht leer sein.')
  if (!wert.beginn || !wert.ende) {
    fehler.push('Beginn und Ende müssen angegeben werden.')
  } else if (new Date(wert.beginn).getTime() >= new Date(wert.ende).getTime()) {
    fehler.push('Der Beginn muss vor dem Ende liegen.')
  }
  if (!wert.raumId) fehler.push('Bitte einen Raum auswählen.')
  return fehler
}

function inIsoZeit(zeit: string): string {
  return new Date(zeit).toISOString()
}

function lokaleZeitFuerEingabe(zeitpunkt: string): string {
  const zeit = new Date(zeitpunkt)
  const lokaleZeit = new Date(zeit.getTime() - zeit.getTimezoneOffset() * 60_000)
  return lokaleZeit.toISOString().slice(0, 16)
}

export function NeueBuchungFormular({
  beimSpeichern,
  beimSchliessen,
  buchungZumBearbeiten,
  eigenerKopf = true,
  beimEingabestatus,
}: Props) {
  const { daten: raeume, status: raumStatus, fehlermeldung: raumFehler, erneutLaden: raeumeErneutLaden } = useApiDaten(holeRaeume)
  const { daten: geraete, status: geraeteStatus, fehlermeldung: geraeteFehler, erneutLaden: geraeteErneutLaden } = useApiDaten(holeMedizingeraete)
  const [startWerte] = useState(() => formularWerteAusBuchung(buchungZumBearbeiten))
  const [werte, setWerte] = useState(startWerte)
  const [textEingegeben, setTextEingegeben] = useState(false)
  const hatEingaben = textEingegeben || JSON.stringify(werte) !== JSON.stringify(startWerte)
  const [validierungsfehler, setValidierungsfehler] = useState<string[]>([])
  const [pruefergebnis, setPruefergebnis] = useState<VerfuegbarkeitsErgebnis | null>(null)
  const [pruefStatus, setPruefStatus] = useState<'bereit' | 'prueft'>('bereit')
  const [speichert, setSpeichert] = useState(false)
  const [serverFehler, setServerFehler] = useState('')
  const [alternativen, setAlternativen] = useState<Record<string, AlternativenLadezustand>>({})
  // Sichtbarkeit pro Konflikt, getrennt vom Lade-Cache: Schließen behält geladene Alternativen.
  const [geoeffneteAlternativen, setGeoeffneteAlternativen] = useState<ReadonlySet<string>>(() => new Set())
  const [uebernahmeHinweis, setUebernahmeHinweis] = useState('')
  const alternativenAnfrageVersion = useRef(0)

  useEffect(() => {
    beimEingabestatus?.(hatEingaben)
  }, [hatEingaben, beimEingabestatus])

  function setFeld<K extends keyof FormularWerte>(feld: K, wert: FormularWerte[K]) {
    setWerte((bisher) => ({ ...bisher, [feld]: wert }))
    verwerfePruefung()
  }

  function verwerfePruefung() {
    setPruefergebnis(null)
    setServerFehler('')
    setAlternativen({})
    setGeoeffneteAlternativen(new Set())
    setUebernahmeHinweis('')
    alternativenAnfrageVersion.current += 1
  }

  function schalteAlternativen(konflikt: Buchungskonflikt) {
    const schluessel = konfliktSchluessel(konflikt)
    const istGeoeffnet = geoeffneteAlternativen.has(schluessel)
    setGeoeffneteAlternativen((aktuell) => {
      const neu = new Set(aktuell)
      if (istGeoeffnet) neu.delete(schluessel)
      else neu.add(schluessel)
      return neu
    })

    // Nur beim ersten Öffnen oder nach einem Ladefehler laden; sonst geladene Alternativen wiederverwenden.
    const ladezustand = alternativen[schluessel]
    if (!istGeoeffnet && (!ladezustand || ladezustand.status === 'fehler')) {
      void ladeAlternativen(konflikt)
    }
  }

  function uebernehmeEntwurf(entwurf: BuchungsEntwurf) {
    const { werte: entwurfswerte, hinweise } = formularWerteAusEntwurf(
      entwurf,
      new Set(aktiveRaeume.map((raum) => raum.id)),
      new Set(aktiveGeraete.map((geraet) => geraet.id)),
    )
    setWerte(entwurfswerte)
    verwerfePruefung()
    setValidierungsfehler([])
    setUebernahmeHinweis([
      'Erkannte Angaben wurden in das Formular übernommen. Bitte fehlende Angaben ergänzen, alles kontrollieren und die Verfügbarkeit prüfen.',
      ...hinweise,
    ].join(' '))
  }

  async function ladeAlternativen(konflikt: Buchungskonflikt) {
    const schluessel = konfliktSchluessel(konflikt)
    const version = alternativenAnfrageVersion.current
    const anfrage: AlternativenAnfrage = {
      beginn: inIsoZeit(werte.beginn),
      ende: inIsoZeit(werte.ende),
      ...(konflikt.ressourceTyp === 'Raum'
        ? { raumId: konflikt.ressourceId }
        : { medizingeraetId: konflikt.ressourceId }),
    }

    setAlternativen((aktuell) => ({ ...aktuell, [schluessel]: { status: 'laedt' } }))
    try {
      const ergebnis = await sucheAlternativen(anfrage)
      if (version !== alternativenAnfrageVersion.current) return
      setAlternativen((aktuell) => ({ ...aktuell, [schluessel]: { status: 'geladen', ergebnis } }))
    } catch (fehler) {
      if (version !== alternativenAnfrageVersion.current) return
      setAlternativen((aktuell) => ({
        ...aktuell,
        [schluessel]: {
          status: 'fehler',
          meldung: fehler instanceof Error ? fehler.message : 'Alternativen konnten nicht geladen werden.',
        },
      }))
    }
  }

  function uebernehmeAlternative(konflikt: Buchungskonflikt, alternativId: number) {
    if (konflikt.ressourceTyp === 'Raum') {
      setFeld('raumId', String(alternativId))
    } else {
      if (!werte.medizingeraetIds.includes(konflikt.ressourceId)) return
      const bereitsAusgewaehlt = werte.medizingeraetIds.some(
        (id) => id === alternativId && id !== konflikt.ressourceId,
      )
      if (bereitsAusgewaehlt) {
        setUebernahmeHinweis('Dieses Medizingerät ist bereits ausgewählt. Bitte wählen Sie eine andere Alternative.')
        return
      }

      setFeld(
        'medizingeraetIds',
        werte.medizingeraetIds.map((id) => id === konflikt.ressourceId ? alternativId : id),
      )
    }

    // Das Prüfergebnis vor der Übernahme ist hier noch verfügbar; setFeld verwirft es erst für den nächsten Render.
    setUebernahmeHinweis(uebernahmeMeldung(konflikt, pruefergebnis?.konflikte ?? []))
  }

  async function pruefeVerfuegbarkeit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fehler = validiere(werte)
    setValidierungsfehler(fehler)
    setServerFehler('')
    setPruefergebnis(null)
    if (fehler.length > 0) return

    // Ändert sich das Formular während der Prüfung, gilt deren Ergebnis nicht mehr.
    const version = alternativenAnfrageVersion.current
    setPruefStatus('prueft')
    try {
      const ergebnis = await pruefeBuchungsverfuegbarkeit({
        beginn: inIsoZeit(werte.beginn),
        ende: inIsoZeit(werte.ende),
        raumId: Number(werte.raumId),
        medizingeraetIds: werte.medizingeraetIds,
        ...(buchungZumBearbeiten ? { auszuschliessendeBuchungId: buchungZumBearbeiten.id } : {}),
      })
      if (version !== alternativenAnfrageVersion.current) return
      setPruefergebnis(ergebnis)
      if (!ergebnis.anfrageGueltig) setValidierungsfehler(ergebnis.fehler)
    } catch (fehlerBeimPruefen) {
      if (version !== alternativenAnfrageVersion.current) return
      if (fehlerBeimPruefen instanceof ApiFehler && istVerfuegbarkeitsergebnis(fehlerBeimPruefen.daten)) {
        setPruefergebnis(fehlerBeimPruefen.daten)
        setValidierungsfehler(fehlerBeimPruefen.daten.fehler)
      } else {
        setServerFehler(fehlerBeimPruefen instanceof Error ? fehlerBeimPruefen.message : 'Verfügbarkeit konnte nicht geprüft werden.')
      }
    } finally {
      setPruefStatus('bereit')
    }
  }

  async function speichereBuchung() {
    const fehler = validiere(werte)
    setValidierungsfehler(fehler)
    if (fehler.length > 0 || !pruefergebnis?.anfrageGueltig || !pruefergebnis.verfuegbar) return

    setSpeichert(true)
    setServerFehler('')
    try {
      const anfrage = {
        titel: werte.titel.trim(),
        beginn: inIsoZeit(werte.beginn),
        ende: inIsoZeit(werte.ende),
        raumId: Number(werte.raumId),
        medizingeraetIds: werte.medizingeraetIds,
      }
      const buchung = buchungZumBearbeiten
        ? await aendereBuchung(buchungZumBearbeiten.id, anfrage)
        : await legeBuchungAn(anfrage)
      beimSpeichern(buchung)
    } catch (fehlerBeimSpeichern) {
      if (fehlerBeimSpeichern instanceof ApiFehler && fehlerBeimSpeichern.status === 409 && istVerfuegbarkeitsergebnis(fehlerBeimSpeichern.daten)) {
        setPruefergebnis(fehlerBeimSpeichern.daten)
        setServerFehler('Die Ressource wurde inzwischen anderweitig gebucht. Bitte prüfen Sie die Verfügbarkeit erneut.')
      } else {
        setServerFehler(fehlerBeimSpeichern instanceof Error ? fehlerBeimSpeichern.message : 'Buchung konnte nicht gespeichert werden.')
      }
    } finally {
      setSpeichert(false)
    }
  }

  const aktiveRaeume = (raeume ?? []).filter((raum) => raum.aktiv)
  const aktiveGeraete = (geraete ?? []).filter((geraet) => geraet.aktiv)
  const ressourcenLaden = raumStatus === 'laedt' || geraeteStatus === 'laedt'
  const ressourcenFehler = [raumFehler, geraeteFehler].filter(Boolean).join(' ')

  return (
    <section
      className="buchungsformular"
      {...(eigenerKopf ? { 'aria-labelledby': 'neue-buchung-titel' } : { 'aria-label': 'Buchungsformular' })}
    >
      {eigenerKopf && (
        <header className="formular-kopf">
          <h2 id="neue-buchung-titel">{buchungZumBearbeiten ? 'Buchung bearbeiten' : 'Neue Buchung'}</h2>
          <button className="sekundaerknopf knopf-formular-abbrechen" type="button" onClick={beimSchliessen}>
            Schließen
          </button>
        </header>
      )}

      {ressourcenLaden || ressourcenFehler ? (
        <Datenzustand
          laedt={ressourcenLaden}
          fehler={ressourcenFehler}
          leer={false}
          leertext=""
          erneutLaden={() => {
            raeumeErneutLaden()
            geraeteErneutLaden()
          }}
        >
          <></>
        </Datenzustand>
      ) : (
        <>
        {!buchungZumBearbeiten && (
          <TextBuchungsanfrage beimUebernehmen={uebernehmeEntwurf} deaktiviert={speichert} beimTextAendern={setTextEingegeben} />
        )}

        <form onSubmit={pruefeVerfuegbarkeit} noValidate>
          <div className="formularraster">
            <label className="formularfeld formularfeld-breit">
              <span>Titel oder Zweck</span>
              <input
                autoFocus
                maxLength={200}
                value={werte.titel}
                onChange={(event) => setFeld('titel', event.target.value)}
                placeholder="z. B. Ultraschalluntersuchung"
              />
            </label>

            <DatumZeitFeld
              bezeichnung="Beginn"
              wert={werte.beginn}
              beimAendern={(wert) => setFeld('beginn', wert)}
            />

            <DatumZeitFeld
              bezeichnung="Ende"
              wert={werte.ende}
              bezugsWert={werte.beginn}
              beimAendern={(wert) => setFeld('ende', wert)}
            />

            <EinzelAuswahl
              bezeichnung="Raum"
              platzhalter="Raum suchen oder auswählen"
              optionen={aktiveRaeume.map((raum) => ({
                wert: String(raum.id),
                titel: raum.name,
                beschreibung: raum.standort,
              }))}
              wert={werte.raumId}
              beimAendern={(wert) => setFeld('raumId', wert)}
            />

            <MehrfachAuswahl
              bezeichnung="Medizingeräte"
              zusatz="(optional)"
              platzhalter="Geräte suchen oder auswählen"
              optionen={aktiveGeraete.map((geraet) => ({
                wert: String(geraet.id),
                titel: geraet.name,
                beschreibung: `${geraet.geraetetyp} · ${geraet.standort}`,
              }))}
              werte={werte.medizingeraetIds.map(String)}
              beimAendern={(ids) => setFeld('medizingeraetIds', ids.map(Number))}
            />
          </div>

          {validierungsfehler.length > 0 && (
            <div className="formularmeldung formularmeldung-fehler" role="alert">
              {validierungsfehler.map((fehler) => <p key={fehler}>{fehler}</p>)}
            </div>
          )}

          {serverFehler && <p className="formularmeldung formularmeldung-fehler" role="alert">{serverFehler}</p>}

          {pruefergebnis && (
            <div className={`pruefergebnis ${pruefergebnis.verfuegbar ? 'pruefergebnis-frei' : 'pruefergebnis-konflikt'}`} role="status">
              <strong>{pruefergebnis.verfuegbar ? 'Verfügbar' : 'Konflikt'}</strong>
              {pruefergebnis.fehler.map((fehler) => <p key={fehler}>{fehler}</p>)}
              {pruefergebnis.konflikte.length > 0 && (
                <ul>
                  {Array.from(new Map(
                    pruefergebnis.konflikte.map((konflikt) => [konfliktSchluessel(konflikt), konflikt]),
                  ).values()).map((konflikt) => {
                    const schluessel = konfliktSchluessel(konflikt)
                    const geoeffnet = geoeffneteAlternativen.has(schluessel)
                    const ladezustand = geoeffnet ? alternativen[schluessel] : undefined

                    return (
                      <li className="buchungskonflikt" key={schluessel}>
                        <div className="konfliktkopf">
                          <span>
                            <strong>{konflikt.ressourceTyp}: {konflikt.ressourcenName}</strong>
                            {' · '}{konflikt.buchungstitel} ({formatiereZeitpunkt(konflikt.beginn)}–{formatiereZeitpunkt(konflikt.ende)})
                          </span>
                          <button
                            className="alternativen-knopf"
                            type="button"
                            aria-expanded={geoeffnet}
                            onClick={() => schalteAlternativen(konflikt)}
                          >
                            {geoeffnet ? 'Alternativen ausblenden' : 'Alternativen anzeigen'}
                          </button>
                        </div>

                        {ladezustand?.status === 'laedt' && <p className="alternativen-ladezustand">Alternativen werden gesucht …</p>}
                        {ladezustand?.status === 'fehler' && <p className="alternativen-fehler" role="alert">{ladezustand.meldung}</p>}
                        {ladezustand?.status === 'geladen' && (
                          ladezustand.ergebnis.alternativenGefunden ? (
                            <ul className="alternativenliste">
                              {ladezustand.ergebnis.vorschlaege.map((vorschlag) => {
                                const bereitsAusgewaehlt = konflikt.ressourceTyp === 'Medizingeraet'
                                  && werte.medizingeraetIds.includes(vorschlag.id)
                                  && vorschlag.id !== konflikt.ressourceId

                                return (
                                  <li className="alternativenvorschlag" key={`${vorschlag.ressourceTyp}-${vorschlag.id}`}>
                                    <div>
                                      <strong>{vorschlag.name}</strong>
                                      <span className="alternativen-metadaten">
                                        {vorschlag.ressourceTyp} · {vorschlag.standort}
                                        {vorschlag.ressourceTyp === 'Medizingeraet' && vorschlag.geraetetyp ? ` · ${vorschlag.geraetetyp}` : ''}
                                      </span>
                                      <ul className="alternativengruende">
                                        {vorschlag.gruende.map((grund, index) => <li key={`${index}-${grund}`}>{grund}</li>)}
                                      </ul>
                                      {bereitsAusgewaehlt && <span className="unterwert">Dieses Gerät ist bereits ausgewählt.</span>}
                                    </div>
                                    <button
                                      className="sekundaerknopf"
                                      type="button"
                                      disabled={bereitsAusgewaehlt}
                                      onClick={() => uebernehmeAlternative(konflikt, vorschlag.id)}
                                    >
                                      Übernehmen
                                    </button>
                                  </li>
                                )
                              })}
                            </ul>
                          ) : (
                            <p className="alternativen-leer">
                              {ladezustand.ergebnis.hinweis ?? 'Keine passende Alternative verfügbar.'}
                            </p>
                          )
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {uebernahmeHinweis && <p className="alternativen-hinweis" role="status">{uebernahmeHinweis}</p>}

          <div className="formularaktionen">
            <button className="sekundaerknopf knopf-verfuegbarkeit" type="submit" disabled={pruefStatus === 'prueft' || speichert}>
              {pruefStatus === 'prueft' ? 'Prüft …' : 'Verfügbarkeit prüfen'}
            </button>
            <button
              className="primaerknopf knopf-buchung-speichern"
              type="button"
              disabled={!pruefergebnis?.anfrageGueltig || !pruefergebnis.verfuegbar || speichert || pruefStatus === 'prueft'}
              onClick={speichereBuchung}
            >
              {speichert ? 'Speichert …' : buchungZumBearbeiten ? 'Änderungen speichern' : 'Buchung speichern'}
            </button>
          </div>
        </form>
        </>
      )}
    </section>
  )
}

function konfliktSchluessel(konflikt: Buchungskonflikt): string {
  return `${konflikt.ressourceTyp}:${konflikt.ressourceId}`
}

/** Beschreibt anhand des bisherigen Prüfergebnisses, welcher Konflikt gelöst wurde und welche noch offen sind. */
function uebernahmeMeldung(geloest: Buchungskonflikt, bisherigeKonflikte: Buchungskonflikt[]): string {
  // Wie in der Anzeige zählt jede Ressource einmal, auch wenn sie mehrfach belegt ist.
  const verbleibend = new Set(bisherigeKonflikte.map(konfliktSchluessel))
  verbleibend.delete(konfliktSchluessel(geloest))
  const raeume = [...verbleibend].filter((schluessel) => schluessel.startsWith('Raum:')).length
  const geraete = verbleibend.size - raeume

  if (verbleibend.size === 0) return 'Alle Konflikte wurden gelöst. Bitte prüfen Sie die Verfügbarkeit erneut.'

  const geloesteArt = geloest.ressourceTyp === 'Raum' ? 'Raumkonflikt' : 'Gerätekonflikt'
  const offen = [
    raeume > 0 ? `${raeume} ${raeume === 1 ? 'Raumkonflikt' : 'Raumkonflikte'}` : '',
    geraete > 0 ? `${geraete} ${geraete === 1 ? 'Gerätekonflikt' : 'Gerätekonflikte'}` : '',
  ].filter(Boolean).join(' und ')
  return `${geloesteArt} gelöst. Es ${verbleibend.size === 1 ? 'besteht' : 'bestehen'} noch ${offen}.`
}

function formatiereZeitpunkt(zeitpunkt: string): string {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(zeitpunkt))
}