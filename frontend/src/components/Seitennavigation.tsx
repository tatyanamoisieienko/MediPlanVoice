export type Ansicht = 'buchungen' | 'raeume' | 'medizingeraete'

type Props = {
  aktuelleAnsicht: Ansicht
  beimWechseln: (ansicht: Ansicht) => void
}

const menuepunkte: { id: Ansicht; titel: string; zeichen: string }[] = [
  { id: 'buchungen', titel: 'Buchungen', zeichen: 'B' },
  { id: 'raeume', titel: 'Räume', zeichen: 'R' },
  { id: 'medizingeraete', titel: 'Medizingeräte', zeichen: 'M' },
]

export function Seitennavigation({ aktuelleAnsicht, beimWechseln }: Props) {
  return (
    <nav aria-label="Hauptnavigation">
      <p className="navigation-titel">Arbeitsbereiche</p>
      <div className="navigationsliste">
        {menuepunkte.map((menuepunkt) => (
          <button
            key={menuepunkt.id}
            className="navigationsknopf"
            type="button"
            aria-current={aktuelleAnsicht === menuepunkt.id ? 'page' : undefined}
            onClick={() => beimWechseln(menuepunkt.id)}
          >
            <span className="navigationszeichen" aria-hidden="true">{menuepunkt.zeichen}</span>
            <span>{menuepunkt.titel}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}