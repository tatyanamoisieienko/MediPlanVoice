import { useState } from 'react'
import { aendereRaum, holeRaeume, legeRaumAn, loescheRaum } from '../../api/client'
import { useApiDaten } from '../../api/useApiDaten'
import { Datenzustand } from '../../components/Datenzustand'
import { RessourcenFormular, type RessourcenFormWerte } from '../../components/RessourcenFormular'
import { LoeschDialog } from '../../components/LoeschDialog'
import { KeineTreffer, Sortierkopf, Suchleiste } from '../../components/Tabellenwerkzeuge'
import { useTabellenansicht } from '../../components/useTabellenansicht'
import { VerwerfenDialog } from '../../components/VerwerfenDialog'
import type { Raum } from '../../types/api'

type FormularModus = { art: 'neu' } | { art: 'bearbeiten'; raum: Raum }

export function RaeumeAnsicht() {
  const { daten: raeume, status, fehlermeldung, erneutLaden } = useApiDaten(holeRaeume)
  const [formularModus, setFormularModus] = useState<FormularModus | null>(null)
  const [erfolgsmeldung, setErfolgsmeldung] = useState('')
  const [loeschFehler, setLoeschFehler] = useState('')
  const [loeschbestaetigungId, setLoeschbestaetigungId] = useState<number | null>(null)
  const [loeschtRaumId, setLoeschtRaumId] = useState<number | null>(null)
  const [hatAenderungen, setHatAenderungen] = useState(false)
  const [verlassenBestaetigen, setVerlassenBestaetigen] = useState(false)
  const eintraege = raeume ?? []
  const zuLoeschen = eintraege.find((raum) => raum.id === loeschbestaetigungId) ?? null
  const tabelle = useTabellenansicht(eintraege, {
    suchtext: (raum) => `${raum.name} ${raum.standort} ${raum.kapazitaet} ${raum.aktiv ? 'Aktiv' : 'Inaktiv'}`,
    sortierwerte: {
      name: (raum) => raum.name,
      standort: (raum) => raum.standort,
      kapazitaet: (raum) => raum.kapazitaet,
      status: (raum) => (raum.aktiv ? 'Aktiv' : 'Inaktiv'),
    },
  })

  async function speichereRaum(werte: RessourcenFormWerte) {
    const anfrage = {
      name: werte.name,
      standort: werte.standort,
      kapazitaet: Number(werte.kapazitaet),
      aktiv: werte.aktiv,
    }
    const raum = formularModus?.art === 'bearbeiten'
      ? await aendereRaum(formularModus.raum.id, anfrage)
      : await legeRaumAn(anfrage)

    kehreZurListeZurueck()
    setErfolgsmeldung(`Raum „${raum.name}“ wurde ${formularModus?.art === 'bearbeiten' ? 'aktualisiert' : 'angelegt'}.`)
    erneutLaden()
  }

  function oeffneFormular(modus: FormularModus) {
    setErfolgsmeldung('')
    setLoeschbestaetigungId(null)
    setHatAenderungen(false)
    setFormularModus(modus)
    window.scrollTo({ top: 0 })
  }

  function kehreZurListeZurueck() {
    setVerlassenBestaetigen(false)
    setHatAenderungen(false)
    setFormularModus(null)
    window.scrollTo({ top: 0 })
  }

  function verlasseFormular() {
    if (hatAenderungen) {
      setVerlassenBestaetigen(true)
      return
    }
    kehreZurListeZurueck()
  }

  async function bestaetigeLoeschen(raum: Raum) {
    setLoeschtRaumId(raum.id)
    setLoeschFehler('')
    setErfolgsmeldung('')
    try {
      await loescheRaum(raum.id)
      setLoeschbestaetigungId(null)
      setErfolgsmeldung(`Raum „${raum.name}“ wurde gelöscht.`)
      erneutLaden()
    } catch (fehler) {
      // Der Dialog bleibt offen und zeigt den Fehler an.
      setLoeschFehler(fehler instanceof Error ? fehler.message : 'Raum konnte nicht gelöscht werden.')
    } finally {
      setLoeschtRaumId(null)
    }
  }

  // Eigener Arbeitsbereich für Anlegen und Bearbeiten: Liste, Suche und Sortierung sind ausgeblendet,
  // ihr Zustand bleibt in dieser Komponente erhalten.
  if (formularModus) {
    const titel = formularModus.art === 'bearbeiten' ? 'Raum bearbeiten' : 'Neuen Raum anlegen'
    return (
      <section aria-labelledby="raum-formular-titel">
        <header className="ansicht-kopf">
          <div>
            <p className="ansicht-bereich">Ressourcen</p>
            <h1 id="raum-formular-titel">{titel}</h1>
          </div>
          <div className="ansicht-aktionen">
            <button className="sekundaerknopf knopf-zurueck" type="button" onClick={verlasseFormular}>
              <span aria-hidden="true">←</span> Zurück zu Räumen
            </button>
          </div>
        </header>

        <RessourcenFormular
          key={formularModus.art === 'bearbeiten' ? `raum-${formularModus.raum.id}` : 'raum-neu'}
          titel={titel}
          art="raum"
          initialWerte={formularModus.art === 'bearbeiten' ? {
            name: formularModus.raum.name,
            standort: formularModus.raum.standort,
            kapazitaet: String(formularModus.raum.kapazitaet),
            geraetetyp: '',
            aktiv: formularModus.raum.aktiv,
          } : undefined}
          onAbbrechen={verlasseFormular}
          onSpeichern={speichereRaum}
          beimEingabestatus={setHatAenderungen}
        />

        <VerwerfenDialog
          offen={verlassenBestaetigen}
          titel="Änderungen verwerfen?"
          text="Ihre Eingaben wurden noch nicht gespeichert. Wenn Sie zur Raumliste zurückkehren, gehen sie verloren."
          beimWeiterBearbeiten={() => setVerlassenBestaetigen(false)}
          beimVerwerfen={kehreZurListeZurueck}
        />
      </section>
    )
  }

  return (
    <section aria-labelledby="raeume-titel">
      <header className="ansicht-kopf">
        <div>
          <p className="ansicht-bereich">Ressourcen</p>
          <h1 id="raeume-titel">Räume</h1>
        </div>
        <div className="ansicht-aktionen">
          {status === 'bereit' && <span className="eintragszahl">{eintraege.length} Einträge</span>}
          <button className="primaerknopf" type="button" onClick={() => oeffneFormular({ art: 'neu' })}>
            Neuer Raum
          </button>
        </div>
      </header>

      {erfolgsmeldung && <p className="erfolgsmeldung" role="status">{erfolgsmeldung}</p>}

      <Datenzustand
        laedt={status === 'laedt'}
        fehler={fehlermeldung}
        leer={status === 'bereit' && eintraege.length === 0}
        leertext="Keine Räume vorhanden."
        erneutLaden={erneutLaden}
      >
        <Suchleiste
          wert={tabelle.suche}
          beimAendern={tabelle.setSuche}
          beschriftung="Räume durchsuchen"
          platzhalter="Räume durchsuchen …"
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
                <Sortierkopf spalte="name" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Name</Sortierkopf>
                <Sortierkopf spalte="standort" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Standort</Sortierkopf>
                <Sortierkopf spalte="kapazitaet" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Kapazität</Sortierkopf>
                <Sortierkopf spalte="status" sortierung={tabelle.sortierung} beimSortieren={tabelle.sortiereNach}>Status</Sortierkopf>
                <th scope="col">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {tabelle.eintraege.map((raum) => (
                <tr key={raum.id}>
                  <td className="hauptwert">{raum.name}</td>
                  <td>{raum.standort}</td>
                  <td>{raum.kapazitaet}</td>
                  <td>
                    <span className={`aktivstatus${raum.aktiv ? '' : ' inaktiv'}`}>
                      {raum.aktiv ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                  <td>
                    <div className="buchungsaktionen">
                      <button className="tabellenaktion" type="button" onClick={() => oeffneFormular({ art: 'bearbeiten', raum })}>Bearbeiten</button>
                      <button className="tabellenaktion tabellenaktion-loeschen" type="button" onClick={() => {
                        setErfolgsmeldung('')
                        setLoeschFehler('')
                        setLoeschbestaetigungId(raum.id)
                      }}>Löschen</button>
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
        ueberschrift="Raum löschen?"
        bezeichnung="den Raum"
        name={zuLoeschen?.name ?? ''}
        loescht={zuLoeschen !== null && loeschtRaumId === zuLoeschen.id}
        fehler={loeschFehler}
        beimAbbrechen={() => setLoeschbestaetigungId(null)}
        beimBestaetigen={() => { if (zuLoeschen) void bestaetigeLoeschen(zuLoeschen) }}
      />
    </section>
  )
}