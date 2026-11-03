# Onderwerpiconen

Door de gebruiker aangeleverde SVG's, verplaatst vanuit de repositoryroot.

| Onderwerp             | Bestandsstam           |
| --------------------- | ---------------------- |
| AI-blootstelling      | `ai`                   |
| AI-complementariteit  | `ai-complementariteit` |
| Arbeidsmarkt 2035     | `agenda`               |
| Beroepen              | `skills`               |
| Onderwijs en instroom | `onderwijs`            |

`-blue.svg` is voor lichte modus, `-yellow.svg` voor donkere modus.
De exports hebben geen witte achtergrondrechthoeken. Het binnenvlak bij
complementariteit gebruikt de kaartachtergrond: licht `#eef5f5`, donker `#103945`.
Pas die kleuren mee aan als `--surface-alt` in `global.css` verandert.
`TopicIcon.tsx` bepaalt de variant via de actieve CSS-theme.
