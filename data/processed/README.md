# Verwerkte onderzoeksdata

De AI-/DUO-CSV’s zijn de bestaande onderzoeksuitvoer. De website wijzigt hun
scores of aantallen niet. De normale build exporteert ze opnieuw naar de
gegenereerde werkkopie onder `website/public/data`.

`competentnl_occupations.json.gz` en `competentnl_members.json.gz` vormen de
verliesloos gecomprimeerde, verwerkte bronset voor de beroepsinhoud. Gzip gebruikt
standaardbibliotheek en een vaste tijdstempel; uitpakken levert dezelfde JSON-data
op als vóór de opschoning. Herimport: `npm --prefix website run data:refresh` met
de lokaal aanwezige bronnen en geïnstalleerde onderzoeksrequirements.

Genormaliseerde onderzoeksbestanden, importverslagen en
UWV-kwartaalwaarnemingen blijven lokaal. Zij zijn geen openbare website-input.
