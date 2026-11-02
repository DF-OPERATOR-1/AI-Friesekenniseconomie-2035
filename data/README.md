# Data

- `raw/`: oorspronkelijke bronnen, lokaal bewaard en uitgesloten van nieuwe commits.
- `processed/`: onderzoeksresultaten; CSV’s blijven beschikbaar voor reproduceerbare builds.
- `schemas/`: beroepsdatamodel en voorbeeld zonder fictieve cijfers.
- `mappings/`: toekomstige gevalideerde classificatiekoppelingen.
- `published/`: register van toegestane downloads.

Per bron dezelfde mapnaam in raw en processed: `ai_exposure`, `ai_complementarity`,
`onderwijs`. UWV staat onder `raw/uwv`; de genormaliseerde verwerking blijft lokaal.
De openbare websitebestanden staan onder `website/public/data/` en in de build onder `docs/data/`.
