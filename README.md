# Mölkky Pistelaskuri

Selainpohjainen Mölkky-pistelaskuri yksilö- ja joukkuepeleille. Projekti on toteutettu ilman build-vaihetta tavallisilla HTML-, CSS- ja JavaScript-tiedostoilla.

## Käynnistys

1. Lataa tai kloonaa repositorio.
2. Avaa [index.html](./index.html) selaimessa.
3. Vaihtoehtoisesti voit käynnistää paikallisen palvelimen komennolla `python -m http.server` ja avata osoitteen `http://localhost:8000/index.html`.

Julkaistu versio:
[jounikivi.github.io/molkky-pistelaskuri](https://jounikivi.github.io/molkky-pistelaskuri/)

## Testit

Projektissa on kevyt Node-pohjainen testisetti yhteiselle logiikalle.

1. Varmista että Node.js on asennettu.
2. Aja komento:

```bash
npm test
```

## Manuaalinen selaintestaus

Tarkeimmille pelipoluille on erillinen tarkistuslista:

- [MANUAL-TESTING.md](./MANUAL-TESTING.md)

## Rakenne

- [index.html](./index.html): etusivu
- [game.html](./game.html): yksilöpelin näkymä
- [team-game.html](./team-game.html): joukkuepelin näkymä
- [style.css](./style.css): yhteiset tyylit
- [js/app.js](./js/app.js): yksilöpelin UI-logiikka
- [js/team-app.js](./js/team-app.js): joukkuepelin UI-logiikka
- [js/rules.js](./js/rules.js): yhteinen sääntömoottori
- [js/shared.js](./js/shared.js): yleiset apufunktiot
- [js/state-utils.js](./js/state-utils.js): tilamuutokset, vuorologiikka ja historiasta laskenta
- [tests/](./tests): logiikkatestit

## Nykyiset säännöt

- 0 = huti
- 1–12 = pisteet
- tasan 50 = voitto
- yli 50 = pisteet putoavat 25:een
- 3 peräkkäisen hudin kohdalla sovellus kysyy jatkaako pelaaja vai tiputetaanko hänet

## Selaintuki

Sovellus toimii nykyaikaisilla selaimilla kuten Chrome, Edge, Firefox ja Safari.
