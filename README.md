# Mölkky Pistelaskuri

Selainpohjainen Mölkky-pistelaskuri yksilö- ja joukkuepeleille. Projekti on toteutettu ilman build-vaihetta tavallisilla HTML-, CSS- ja JavaScript-tiedostoilla.

## Käynnistys

1. Lataa tai kloonaa repositorio.
2. Kaynnista paikallinen palvelin projektikansiossa komennolla `python -m http.server`.
3. Avaa osoite `http://localhost:8000/index.html`.

Vaihtoehtoisesti voit kayttaa esimerkiksi Live Serveria. Talloinkin sovellus voi aueta osoitteesta `http://127.0.0.1:5500/index.html`.

Sovellus toimii edelleen myos avaamalla [index.html](./index.html) suoraan selaimessa, mutta PWA-asennus ja offline-cache toimivat vain `http://localhost`, `http://127.0.0.1`- tai `https://`-osoitteesta.

Julkaistu versio:
[jounikivi.github.io/molkky-pistelaskuri](https://jounikivi.github.io/molkky-pistelaskuri/)

## PWA ja offline-kaytto

- Sovellus voidaan asentaa puhelimen tai tietokoneen aloitusnayttoon PWA:na.
- Offline-kaytto aktivoituu, kun sovellus on avattu kerran onnistuneesti `localhost`, `127.0.0.1`- tai `https://`-osoitteesta.
- Taman jalkeen etusivu, yksilopeli, joukkuepeli ja niiden ydintiedostot latautuvat myos ilman verkkoyhteytta.
- Kun julkaiset uuden version, avaa sovellus kerran verkkoyhteyden kanssa. Service worker paivittaa silloin uusimmat HTML-, CSS- ja JS-tiedostot valimuistiin.
- Pelitila tallentuu selaimen `localStorage`:en kuten ennenkin.

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
- [ohjeet.html](./ohjeet.html): Molkyn aloitusohjeet ja saannot
- [game.html](./game.html): yksilöpelin näkymä
- [team-game.html](./team-game.html): joukkuepelin näkymä
- [style.css](./style.css): yhteiset tyylit
- [js/app.js](./js/app.js): yksilöpelin UI-logiikka
- [js/team-app.js](./js/team-app.js): joukkuepelin UI-logiikka
- [js/team-randomizer.js](./js/team-randomizer.js): joukkuepelin tiimiarvonnan apulogiikka
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

## Joukkuepelin lisätoiminnot

- Tiimit voi rakentaa käsin tai arpoa valmiiksi pelaajalistasta ennen ensimmäistä heittoa.
- Arvonta jakaa pelaajat mahdollisimman tasaisesti tiimeihin `Tiimi 1`, `Tiimi 2` ja niin edelleen.

## Selaintuki

Sovellus toimii nykyaikaisilla selaimilla kuten Chrome, Edge, Firefox ja Safari. PWA-asennus ja offline-cache toimivat parhaiten selaimissa, jotka tukevat service workereita.
