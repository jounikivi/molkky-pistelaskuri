# Manuaalinen selaintestaus

Tama tarkistuslista on tarkoitettu nykyisen toimivan kaytoksen varmistamiseen selaimessa ennen uusia refaktorointeja, commitointia tai julkaisua. Lista painottaa erityisesti niita polkuja, joita ei saa rikkoa: undo, joukkuevuorotus, 3 huti -paatos, yli 50 -> 25, voittotilanne ja nollaus.

## Ennen kierrosta

- Avaa sovellus selaimessa tiedostosta `index.html` tai paikalliselta palvelimelta.
- Aloita jokainen isompi testikokonaisuus puhtaasta tilanteesta painamalla `Nollaa peli`.
- Jos tila tuntuu jaavan vanhaksi, lataa sivu uudelleen tai tyhjenna selaimen `localStorage` kyseisen nakyman osalta.
- Tee ainakin yksi kierros tavallisella tyopoytaleveydella ja yksi kapealla mobiilileveydella.
- Jos mahdollista, tee nopea tarkistus ainakin yhdella Chromium-pohjaisella selaimella ja yhdella toisella selaimella, kuten Firefoxilla.

## Nopea savutesti

- Avaa `index.html`. Odotus: etusivu latautuu ilman rikkinnaisia linkkeja.
- Avaa `game.html`. Odotus: yksilopelin nakyma latautuu ja `Vuorossa` nayttaa `-`, jos pelaajia ei ole viela lisatty.
- Avaa `team-game.html`. Odotus: joukkuepelin nakyma latautuu ja tyhja tila kertoo, etta tiimeja ei ole viela lisatty.

## Yksilopeli

- Lisaa pelaajat `Matti` ja `Liisa`. Odotus: molemmat ilmestyvat korteiksi, `Arvo aloitus` aktivoituu ja `Peru` pysyy pois paalta ennen ensimmaista heittoa.
- Yrita lisata duplikaatti, esimerkiksi `matti`. Odotus: duplikaattia ei lisata.
- Yrita lisata nimi, jossa on turhia valeja tai kulmasulkeita, esimerkiksi `  <Teemu>  `. Odotus: nimi siistiytyy turvalliseen muotoon eika riko layoutia.
- Paina `Arvo aloitus`. Odotus: vuorojarjestys voi vaihtua, mutta vuorossa on edelleen vain yksi aktiivinen pelaaja kerrallaan.
- Syota yksi heitto numeronapeilla ja toinen tekstikentasta. Odotus: pisteet paivittyvat oikein, `Peru` aktivoituu ja vuoro siirtyy seuraavalle aktiiviselle pelaajalle.
- Ensimmainen heitto lukitsee kokoonpanon. Odotus: pelaajan nimikentta ja `Lisaa`-nappi menevat pois kaytosta, ja ruudulla naytetaan viesti ettei pelaajia voi lisata kesken pelin.
- Tee heitto `0`. Odotus: kyseiselle pelaajalle kirjautuu huti, mutta pelaaja ei tipu viela ennen kolmatta perakkaista hutia.
- Rakenna tilanne, jossa sama pelaaja heittaa kolme hutia perakkain, ja valitse modaalista `Jatkaa pelia`. Odotus: pelaaja pysyy aktiivisena, hutilaskuri nollautuu ja peli jatkuu normaalisti.
- Lataa sivu uudelleen heti `Jatkaa pelia` -valinnan jalkeen. Odotus: tila sailyy oikein uudelleenlatauksen yli.
- Paina `Peru` heti uudelleenlatauksen jalkeen. Odotus: viimeisin oikea heitto peruuntuu ja pelaajan tila palautuu oikein.
- Rakenna tilanne, jossa sama pelaaja heittaa kolme hutia perakkain, ja valitse modaalista `Tiputa pelaaja`. Odotus: pelaaja merkitaan pois pelista ja vuoro siirtyy seuraavalle aktiiviselle pelaajalle.
- Lataa sivu uudelleen `Tiputa pelaaja` -valinnan jalkeen. Odotus: pudotus sailyy oikein uudelleenlatauksen yli.
- Paina `Peru`. Odotus: viimeisin heitto palautuu ja tiputus peruuntuu, jos se kuului juuri peruttuun heittoon.
- Rakenna tilanne, jossa pelaaja menee yli 50 pisteen. Odotus: pisteet putoavat arvoon 25 ja peli jatkuu.
- Rakenna tilanne, jossa pelaaja saavuttaa tasan 50 pistetta. Odotus: voittomodaali aukeaa, peli paattyy eika uusia heittoja voi syottaa ennen uuden pelin aloitusta.
- Testaa voittomodaalista `Aloita uusi peli samoilla pelaajilla`. Odotus: nimet ja jarjestys sailyvat, mutta pisteet, hudit ja historiat nollautuvat.
- Testaa voittomodaalista `Aloita alusta`. Odotus: koko peli tyhjenee takaisin alkutilaan.
- Testaa `Nollaa peli`. Odotus: selain kysyy vahvistuksen ja vahvistuksen jalkeen peli tyhjenee kokonaan.

## Joukkuepeli

- Lisaa tiimit `Punainen` ja `Sininen`. Odotus: molemmat tiimit ilmestyvat korteiksi.
- Lisaa kumpaankin tiimiin vahintaan kaksi pelaajaa `Lisaa pelaaja` -napilla. Odotus: pelaajat ilmestyvat oikean tiimin alle, eivatka duplikaatit mene saman tiimin sisalla lapi.
- Paina `Arvo aloitus`. Odotus: vuorossa on yksi tiimi ja yksi kyseisen tiimin aktiivinen pelaaja.
- Tee nelja heittoa niin, etta kumpikin tiimi ehtii vuoroon kahdesti. Odotus: vuorotus etenee tiimikohtaisesti, esimerkiksi `Punainen - pelaaja 1`, `Sininen - pelaaja 1`, `Punainen - pelaaja 2`, `Sininen - pelaaja 2`.
- Syota heitto numeronapeista ja toinen tekstikentasta. Odotus: joukkueen pisteet paivittyvat oikein ja heitto kirjautuu oikealle pelaajalle oikeassa vuorossa.
- Ensimmainen heitto lukitsee kokoonpanon. Odotus: tiimin nimikentta, `Lisaa tiimi` ja joukkuekorttien `Lisaa pelaaja` -napit menevat pois kaytosta, ja ruudulla naytetaan viesti ettei kokoonpanoa voi muuttaa kesken pelin.
- Paina `Peru` useamman heiton jalkeen. Odotus: vain viimeisin oikea heitto peruuntuu, oikean pelaajan historia palautuu ja vuoro palaa oikealle joukkueelle ja pelaajalle.
- Rakenna tilanne, jossa joukkue menee yli 50 pisteen. Odotus: joukkueen pisteet putoavat arvoon 25 ja peli jatkuu.
- Rakenna tilanne, jossa joukkue saavuttaa tasan 50 pistetta. Odotus: voittomodaali aukeaa, voittajaksi tulee oikea tiimi ja uusia heittoja ei voi enaa kirjata.
- Testaa joukkuepelissa 3 huti -tilanne ja valitse `Jatkaa pelia`. Odotus: pelaaja pysyy aktiivisena, joukkue pysyy pelissa ja seuraavat vuorot jatkuvat normaalisti.
- Lataa sivu uudelleen heti `Jatkaa pelia` -valinnan jalkeen. Odotus: pelaajan tila, joukkueen pisteet ja vuoro sailyvat oikein.
- Paina `Peru`. Odotus: viimeisin heitto peruuntuu oikein myos taman paatoksen yli.
- Testaa joukkuepelissa 3 huti -tilanne ja valitse `Tiputa pelaaja`. Odotus: vain kyseinen pelaaja putoaa, joukkue jatkaa jos sillla on viela aktiivisia pelaajia, ja vuorotus ohittaa pudonneen pelaajan.
- Jos joukkueesta poistuu kaikki aktiiviset pelaajat, tarkista etta joukkue ei enaa saa vuoroa. Odotus: vuorotus siirtyy vain aktiivisille joukkueille.
- Testaa voittomodaalista `Aloita uusi peli samoilla tiimeilla`. Odotus: tiimit ja pelaajat sailyvat, mutta pisteet, hudit, historiat ja sisaiset vuoroindeksit nollautuvat.
- Testaa voittomodaalista `Aloita alusta`. Odotus: kaikki tiimit ja pelaajat poistuvat.
- Testaa `Nollaa peli`. Odotus: selain kysyy vahvistuksen ja vahvistuksen jalkeen peli tyhjenee kokonaan.

## Naytto ja kaytettavyys

- Tarkista, etta pitkat nimet eivat riko korttien layoutia yksilo- tai joukkuepelissa.
- Tarkista, etta napit ovat kaytettavia myos kapealla leveydella eika heittopaneeli peita kriittista sisaltoa.
- Testaa 3 huti -modaali kokonaan ilman hiirta. Odotus: fokus siirtyy modaalin sisaan, `Tab` ja `Shift+Tab` kiertavat vain modaalin painikkeissa, `Escape` sulkee tilanteen tiputusvalinnalla ja fokus palautuu aiemmin aktiiviseen elementtiin.
- Tarkista, etta uudelleenlataus palauttaa keskeneraisen pelin oikeaan tilaan seka yksilo- etta joukkuepelissa.

## Hyvaksyntakriteeri taman kierroksen jalkeen

- Kaikki ylla olevat polut toimivat ilman konsolivirheita tai ilmeisia UI-rikkoutumisia.
- `Peru` palauttaa aina viimeisimman oikean heiton.
- 3 huti -paatokset sailyvat oikein seka uudelleenlatauksen etta perumisen yli.
- Joukkuevuorotus ei palaa vanhaan rikkinnaiseen malliin.
- Yli 50 -> 25 toimii seka yksilo- etta joukkuepelissa.
- Voittotilanne ja uuden pelin aloitus toimivat molemmissa pelimuodoissa.
