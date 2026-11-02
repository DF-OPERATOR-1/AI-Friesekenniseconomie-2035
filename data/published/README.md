# Publicatie en build-input

De bestaande GitHub Pages-publicatie gebruikt uitsluitend `docs/index.html`,
`docs/.nojekyll`, `docs/assets/` en `docs/data/`. De JSON-bestanden onder
`docs/data/` zijn noodzakelijk: React laadt ze voor beroepen, beroepsinhoud,
grafieken en de bronnenpagina. De goedgekeurde CSV’s zijn de downloadbestanden.

`publication_manifest.json` registreert expliciete gebruikersbesluiten voor
CSV-downloads én afgeleide JSON-data. Alleen `approved: true` met een ingevulde
`evidence` geldt als toelating. Niet-geregistreerde uitvoer wordt uitgesloten.

`uwv_catalogue.json` bevat alleen de bestaande openbare bronvermelding. De ruwe
UWV-werkmap en kwartaalwaarnemingen blijven lokaal. Zo blijft de bronnenpagina
in een schone checkout gelijk zonder de privéwerkmap mee te nemen.

## Wat blijft in Git?

- De websitebroncode, configuratie, scripts, tests en workflows om te onderhouden en opnieuw te bouwen.
- De werkelijk gebruikte AI-/DUO-CSV’s, de gecomprimeerde CompetentNL-bronset en de ISCO–BRC-koppeling als build-input.
- Het publicatieregister, UWV-catalogusmetadata en het beroepsmodel.
- De publicatie onder `docs/assets` en `docs/data`, plus HTML en `.nojekyll`.

De `.json.gz`-bestanden onder `data/processed/` zijn gecomprimeerde build-input,
geen bestanden die de browser rechtstreeks laadt. De gegenereerde werkkopie
onder `website/public/data/` staat geheel buiten Git en wordt automatisch opgebouwd.

## Wat blijft lokaal?

Alle ruwe bronnen, lokale instellingen, dependencies, caches, papers,
literatuurconversies, diagnostische dossiers, losse onderzoeksrapporten,
ongebruikte SOC-tussenresultaten, ongevalideerde koppelingen
en projectdocumentatie onder `docs/research_plan`, `docs/methodology` en
`docs/data_dictionary` zijn uitgesloten. De onderzoekscode die door de build of
bestaande controles wordt gebruikt blijft behouden.

## Controles

```bash
python3 website/scripts/check_repository.py
npm --prefix website run build
python3 -m unittest discover -s tests
npm --prefix website test
python3 website/scripts/publish_pages.py
```

De laatste stap synchroniseert lokaal naar `docs` en publiceert niets online.
`.gitignore` wist geen bestanden uit bestaande Git-geschiedenis. De oorspronkelijke
repositoryherstructurering en de al bestaande verwijderingen blijven behouden.
