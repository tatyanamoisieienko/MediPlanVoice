import { useState } from 'react'
import { holeBuchungen, holeMedizingeraete, loescheBuchung as loescheBuchungApi } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import type { Buchung } from '../../types/api'
import { Datenzustand } from '../../components/Datenzustand'
import { LoeschDialog } from '../../components/LoeschDialog'
import { KeineTreffer, Sortierkopf, Suchleiste } from '../../components/Tabellenwerkzeuge'
import { useTabellenansicht } from '../../components/useTabellenansicht'
import { VerwerfenDialog } from '../../components/VerwerfenDialog'
import { NeueBuchungFormular } from './NeueBuchungFormular'

type Buchungsdaten = {
  buchungen: Buchung[]
  geraetenamen: Map<number, string>
}

type FormularModus =
  | { art: 'neu' }
  | { art: 'bearbeiten'; buchung: Buchung }

async function ladeBuchungsdaten(signal: AbortSignal): Promise<Buchungsdaten> {
  const [buchungen, geraete] = await Promise.all([
    holeBuchungen(signal),
    holeMedizingeraete(signal),
  ])

  return {
    buchungen,
    geraetenamen: new Map(geraete.map((geraet) => [geraet.id, geraet.name])),
  }
}

const deutscherZeitpunkt = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatiereZeitpunkt(zeitpunkt: string): string {
  return deutscherZeitpunkt.format(new Date(zeitpunkt))
}

export function BuchungenAnsicht() {
  const { daten, status, fehlermeldung, erneutLaden } = useApiDaten(ladeBuchungsdaten)
  const [formularModus, setFormularModus] = useState<FormularModus | null>(null)
  const [erfolgsmeldung, setErfolgsmeldung] = useState('')
  const [loeschFehler, setLoeschFehler] = useState('')
  const [loeschbestaetigungId, setLoeschbestaetigungId] = useState<number | null>(null)
  const [loeschtBuchungId, setLoeschtBuchungId] = useState<number | null>(null)
  const [hatUngespeicherteEingaben, setHatUngespeicherteEingaben] = useState(false)
  const [verlassenBestaetigen, setVerlassenBestaetigen] = useState(false)
  const buchungen = daten?.buchungen ?? []
  const zuLoeschen = buchungen.find((buchung) => buchung.id === loeschbestaetigungId) ?? null
  const formularGeoeffnet = formularModus !== null
  const geraeteNamen = (buchung: Buchung) =>
    buchung.medizingeraetIds.map((id) => daten?.geraetenamen.get(id) ?? `Gerät ${id}`)
  const tabelle = useTabellenansicht(buchungen, {
    suchtext: (buchung) => [buchung.titel, buchung.raumName, ...geraeteNamen(buchung)].join(' '),
    sortierwerte: {
      titel: (buchung) => buchung.titel,
      zeitraum: (buchung) => [Date.parse(buchung.beginn), Date.parse(buchung.ende)],
      raum: (buchung) => buchung.raumName,
      geraete: (buchung) => geraeteNamen(buchung).join(', '),
    },
  })

  function oeffneNeueBuchung() {
    setErfolgsmeldung('')
    setLoeschbestaetigungId(null)
    setHatUngespeicherteEingaben(false)
    setFormularModus({ art: 'neu' })
    window.scrollTo({ top: 0 })
  }

  function kehreZurListeZurueck() {
    setVerlassenBestaetigen(false)
    setHatUngespeicherteEingaben(false)
    setFormularModus(null)
    window.scrollTo({ top: 0 })
  }

  function verlasseNeueBuchung() {
    if (hatUngespeicherteEingaben) {
      setVerlassenBestaetigen(true)
      return
    }
    kehreZurListeZurueck()
  }

  async function bestaetigeLoeschen(buchung: Buchung) {
    setLoeschtBuchungId(buchung.id)
    setLoeschFehler('')
    setErfolgsmeldung('')
    try {
      await loescheBuchungApi(buchung.id)
      setLoeschbestaetigungId(null)
      setErfolgsmeldung(`„${buchung.titel}“ wurde gelöscht.`)
      erneutLaden()
    } catch (fehler) {
      // Der Dialog bleibt offen und zeigt den Fehler an.
      setLoeschFehler(fehler instanceof Error ? fehler.message : 'Buchung konnte nicht gelöscht werden.')
    } finally {
      setLoeschtBuchungId(null)
    }
  }

  // Eigener Arbeitsbereich für neue Buchungen: Die Buchungsliste ist in diesem Modus ausgeblendet.
  if (formularModus?.art === 'neu') {
    return (
      <section aria-labelledby="neue-buchung-seitentitel">
        <header className="ansicht-kopf">
          <div>
            <p className="ansicht-bereich">Belegung</p>
            <h1 id="neue-buchung-seitentitel">Neue Buchung</h1>
          </div>
          <div className="ansicht-aktionen">
            <button className="sekundaerknopf knopf-zurueck" type="button" onClick={verlasseNeueBuchung}>
              <span aria-hidden="true">←</span> Zurück zu Buchungen
            </button>
          </div>
        </header>

        <NeueBuchungFormular
          key="neu"
          eigenerKopf={false}
          beimEingabestatus={setHatUngespeicherteEingaben}
          beimSchliessen={verlasseNeueBuchung}
          beimSpeichern={(buchung) => {
            kehreZurListeZurueck()
            setErfolgsmeldung(`„${buchung.titel}“ wurde erfolgreich angelegt.`)
            erneutLaden()
          }}
        />

        <VerwerfenDialog
          offen={verlassenBestaetigen}
          titel="Eingaben verwerfen?"
          text="Die neue Buchung wurde noch nicht gespeichert. Wenn Sie zur Buchungsliste zurückkehren, gehen Ihre Eingaben verloren."
          beimWeiterBearbeiten={() => setVerlassenBestaetigen(false)}
          beimVerwerfen={kehreZurListeZurueck}
        />
      </section>
    )
  }

  return (
    <section aria-labelledby="buchungen-titel">
      <header className="ansicht-kopf">
        <div>
          <p className="ansicht-bereich">Belegung</p>
          <h1 id="buchungen-titel">Buchungen</h1>
        </div>
        <div className="ansicht-aktionen">
          {status === 'bereit' && <span className="eintragszahl">{buchungen.length} Einträge</span>}
          {!formularGeoeffnet && (
            <button className="primaerknopf" type="button" onClick={oeffneNeueBuchung}>
              Neue Buchung
            </button>
          )}
        </div>
      </header>

      {erfolgsmeldung && <p className="erfolgsmeldung" role="status">{erfolgsmeldung}</p>}
      {formularModus && (
        <NeueBuchungFormular
          key={formularModus.art === 'bearbeiten' ? `bearbeiten-${formularModus.buchung.id}` : 'neu'}
          buchungZumBearbeiten={formularModus.art === 'bearbeiten' ? formularModus.buchung : undefined}
          beimSchliessen={() => setFormularModus(null)}
          beimSpeichern={(buchung) => {
            const wurdeBearbeitet = formularModus.art === 'bearbeiten'
            setFormularModus(null)
            setErfolgsmeldung(wurdeBearbeitet
              ? `„${buchung.titel}“ wurde aktualisiert.`
              : `„${buchung.titel}“ wurde erfolgreich angelegt.`)
            erneutLaden()
          }}
        />
      )}

      <Datenzustand
        laedt={status === 'laedt'}
        fehler={fehlermeldung}
        leer={status === 'bereit' && buchungen.length === 0}
        leertext="Keine Buchungen vorhanden."
        erneutLaden={erneutLaden}
      >
        <Suchleiste
          wert={tabelle.suche}
          beimAendern={tabelle.setSuche}
          beschriftung="Buchungen durchsuchen"
          platzhalter="Buchungen durchsuchen …"
          anzahlSichtbar={tabelle.eintraege.length}
          anzahlGesamt={tabelle.anzahlGesamt}
        />
        {tabelle.eintraege.length === 0 ? (
          <KeineTreffer beimZuruecksetzen={() => tabelle.setSuche('')} />
        ) : (
        <div className="tabellenrahmen">
          <table className="datentabelle">
            <thead>
              <tr>
                <Sortierkopf spalte="titel" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Titel / Zweck</Sortierkopf>
                <Sortierkopf spalte="zeitraum" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Beginn – Ende</Sortierkopf>
                <Sortierkopf spalte="raum" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Raum</Sortierkopf>
                <Sortierkopf spalte="geraete" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Medizingeräte</Sortierkopf>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {tabelle.eintraege.map((buchung) => (
                <tr key={buchung.id}>
                  <td className="hauptwert">{buchung.titel}</td>
                  <td>
                    <time dateTime={buchung.beginn}>{formatiereZeitpunkt(buchung.beginn)}</time>
                    <span className="unterwert">
                      bis <time dateTime={buchung.ende}>{formatiereZeitpunkt(buchung.ende)}</time>
                    </span>
                  </td>
                  <td>{buchung.raumName}</td>
                  <td>
                    {buchung.medizingeraetIds.length > 0 ? (
                      <div className="geraeteliste">
                        {buchung.medizingeraetIds.map((id) => (
                          <span key={id}>{daten?.geraetenamen.get(id) ?? `Gerät ${id}`}</span>
                        ))}
                      </div>
                    ) : (
                      <span className="unterwert">Keine Geräte</span>
                    )}
                  </td>
                  <td>
                    <div className="buchungsaktionen">
                      <button
                        className="tabellenaktion"
                        type="button"
                        onClick={() => {
                          setErfolgsmeldung('')
                          setLoeschbestaetigungId(null)
                          setFormularModus({ art: 'bearbeiten', buchung })
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="tabellenaktion tabellenaktion-loeschen"
                        type="button"
                        onClick={() => {
                          setErfolgsmeldung('')
                          setLoeschFehler('')
                          setLoeschbestaetigungId(buchung.id)
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </Datenzustand>

      <LoeschDialog
        offen={zuLoeschen !== null}
        ueberschrift="Buchung löschen?"
        bezeichnung="die Buchung"
        name={zuLoeschen?.titel ?? ''}
        loescht={zuLoeschen !== null && loeschtBuchungId === zuLoeschen.id}
        fehler={loeschFehler}
        beimAbbrechen={() => setLoeschbestaetigungId(null)}
        beimBestaetigen={() => { if (zuLoeschen) void bestaetigeLoeschen(zuLoeschen) }}
      />
    </section>
  )
}