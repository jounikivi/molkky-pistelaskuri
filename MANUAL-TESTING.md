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
- Avaa `ohjeet.html`. Odotus: ohjesivu latautuu, keilojen alkuasettelu nakyy oikein ja linkit peleihin toimivat.
- Avaa `game.html`. Odotus: yksilopelin nakyma latautuu kompaktissa aloitustilassa, heittopaneeli ei nay viela ja ohje kehottaa lisaamaan pelaajat ensin.
- Avaa `team-game.html`. Odotus: joukkuepelin nakyma latautuu kompaktissa aloitustilassa, heittopaneeli ei nay viela ja ohje kehottaa lisaamaan tiimit ensin.

## Yksilopeli

- Lisaa pelaajat `Matti` ja `Liisa`. Odotus: molemmat ilmestyvat korteiksi, `Arvo aloitus` aktivoituu ja `Peru` pysyy pois paalta ennen ensimmaista heittoa.
- Kun pelaajat on lisatty, tarkista aloitustila. Odotus: `Vuorossa`-kortti pysyy kompaktina, ensimmaisen heittajan nimi nakyy ja heittopaneeli tulee esiin vasta kun peli on valmis aloitettavaksi.
- Yrita lisata duplikaatti, esimerkiksi `matti`. Odotus: duplikaattia ei lisata.
- Yrita lisata nimi, jossa on turhia valeja tai kulmasulkeita, esimerkiksi `  <Teemu>  `. Odotus: nimi siistiytyy turvalliseen muotoon eika riko layoutia.
- Paina `Arvo aloitus`. Odotus: vuorojarjestys voi vaihtua, mutta vuorossa on edelleen vain yksi aktiivinen pelaaja kerrallaan.
- Syota kaksi heittoa alapalkin pistepainikkeilla, mukaan lukien `Huti (0)`. Odotus: pisteet tai huti paivittyvat oikein, `Peru` aktivoituu ja vuoro siirtyy seuraavalle aktiiviselle pelaajalle.
- Ensimmainen heitto lukitsee kokoonpanon. Odotus: `Lisaa pelaaja` -kortti poistuu nakyvista ja sen tilalla naytetaan pieni viesti siita, etta kokoonpano on lukittu pelin ajaksi.
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
- Testaa `Nollaa peli`. Odotus: sovellus avaa oman vahvistusmodaalin ja vahvistuksen jalkeen peli tyhjenee kokonaan.

## Joukkuepeli

- Lisaa tiimit `Punainen` ja `Sininen`. Odotus: molemmat tiimit ilmestyvat korteiksi.
- Lisaa kumpaankin tiimiin vahintaan kaksi pelaajaa `Lisaa pelaaja` -napilla. Odotus: pelaajat ilmestyvat oikean tiimin alle, eivatka duplikaatit mene saman tiimin sisalla lapi.
- Kun tiimit ja pelaajat on lisatty, tarkista aloitustila. Odotus: `Vuorossa`-kortti pysyy kompaktina, ensimmaisen tiimin ja heittajan tiedot nakyvat ja heittopaneeli tulee esiin vasta kun ainakin yksi pelivalmis tiimi on olemassa.
- Testaa `Arvo tiimit` syottamalla esimerkiksi `Matti`, `Liisa`, `Teemu` ja `Aino`, valitse 2 tiimia ja paina arvontaa. Odotus: sovellus luo valmiit tiimit, jakaa pelaajat mahdollisimman tasaisesti ja nimeaa tiimit automaattisesti.
- Testaa `Arvo tiimit` olemassa olevan mutta viela aloittamattoman kokoonpanon paalle. Odotus: sovellus kysyy vahvistuksen ennen kuin vanhat tiimit ja pelaajat korvataan.
- Paina `Arvo aloitus`. Odotus: vuorossa on yksi tiimi ja yksi kyseisen tiimin aktiivinen pelaaja.
- Tee nelja heittoa niin, etta kumpikin tiimi ehtii vuoroon kahdesti. Odotus: vuorotus etenee tiimikohtaisesti, esimerkiksi `Punainen - pelaaja 1`, `Sininen - pelaaja 1`, `Punainen - pelaaja 2`, `Sininen - pelaaja 2`.
- Syota kaksi heittoa alapalkin pistepainikkeilla, mukaan lukien `Huti (0)`. Odotus: joukkueen pisteet tai huti paivittyvat oikein ja heitto kirjautuu oikealle pelaajalle oikeassa vuorossa.
- Ensimmainen heitto lukitsee kokoonpanon. Odotus: `Lisaa tiimi` -kortti poistuu nakyvista ja sen tilalla naytetaan pieni viesti siita, etta kokoonpano on lukittu pelin ajaksi. Joukkuekorttien `Lisaa pelaaja` -napit menevat samalla pois kaytosta.
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
- Testaa `Nollaa peli`. Odotus: sovellus avaa oman vahvistusmodaalin ja vahvistuksen jalkeen peli tyhjenee kokonaan.

## Naytto ja kaytettavyys

- Tarkista, etta pitkat nimet eivat riko korttien layoutia yksilo- tai joukkuepelissa.
- Tarkista, etta ennen pelin aloitusta heittopaneeli pysyy piilossa, kunnes pelissa on oikeasti pelivalmis kokoonpano.
- Tarkista, etta napit ovat kaytettavia myos kapealla leveydella eika heittopaneeli peita kriittista sisaltoa.
- Tarkista, etta aloitustilassa `Vuorossa`-kortti on kompaktimpi kuin pelin aikana, mutta muuttuu selkeaksi isoksi vuoronakymaksi ensimmaisen heiton jalkeen.
- Tarkista puhelinleveydella, etta ylapalkin toiminnot pinoutuvat siististi omalle rivilleen eivatka valu ruudun ulos.
- Tarkista puhelinleveydella, etta ylapalkissa naytetaan vain takaisinpaluu, otsikko ja `⋯`-valikko, ja etta `Arvo aloitus` seka `Nollaa peli` toimivat valikon kautta oikein.
- Tarkista puhelinleveydella, etta `Peru` naytetaan vain alapalkissa pistepainikkeiden yhteydessa.
- Tarkista puhelinleveydella, etta pisteita lisataan vain alapalkin heittopaneelista ja etta punainen `Huti (0)` toimii samalla tavalla kuin muutkin pistepainikkeet.
- Tarkista puhelinleveydella, etta alapalkin heittopainikkeet ovat helposti painettavia, mahtuvat ruudulle ilman vaakasuuntaista scrollausta ja etta sivun loppu sisalto nousee niiden ylapuolelle.
- Tarkista, etta `Pelitilanne`-osio paivittyy jokaisen heiton jalkeen oikein ja etta johtaja, sijoitukset ja vuorossa oleva pelaaja tai tiimi vastaavat todellista tilannetta.
- Tarkista joukkuepelissa puhelinleveydella, etta pelaajarivit, poistopainike ja tilastochipit pinoutuvat luettavasti eivatka leikkaannu.
- Tarkista tablettileveydella, etta kortit asettuvat kahteen sarakkeeseen ilman ahtautta ja etta alapalkki pysyy kaytettavana pysty- ja vaakasuunnassa.
- Testaa 3 huti -modaali kokonaan ilman hiirta. Odotus: fokus siirtyy modaalin sisaan, `Tab` ja `Shift+Tab` kiertavat vain modaalin painikkeissa, `Escape` sulkee tilanteen tiputusvalinnalla ja fokus palautuu aiemmin aktiiviseen elementtiin.
- Tarkista, etta uudelleenlataus palauttaa keskeneraisen pelin oikeaan tilaan seka yksilo- etta joukkuepelissa.

## PWA ja offline

- Avaa sovellus `http://localhost`, `http://127.0.0.1`- tai `https://`-osoitteesta. Odotus: sivu latautuu ilman service worker -virheita.
- Tarkista etusivun `Asenna sovellus` -nappi. Odotus: nappi on näkyvissa, aktivoituu kun selain tarjoaa asennusta ja piiloutuu asennuksen jalkeen.
- Avaa etusivu, yksilopeli ja joukkuepeli ainakin kerran verkkoyhteyden kanssa. Odotus: ydinsivut ja resurssit kayvat latautuneina valimuistiin.
- Avaa myos `ohjeet.html` ainakin kerran verkkoyhteyden kanssa. Odotus: ohjesivu kay valimuistiin offline-kayttoa varten.
- Asenna sovellus selaimen `Asenna sovellus`- tai `Lisaa aloitusnayttoon` -toiminnolla. Odotus: sovellus avautuu omassa ikkunassaan ilman normaalia selaimen chromea.
- Katkaise verkkoyhteys ja lataa etusivu uudelleen. Odotus: sovellus aukeaa edelleen offline-tilassa.
- Avaa myos `game.html` ja `team-game.html` ilman verkkoyhteytta. Odotus: molemmat toimivat edelleen ja aiemmin tallennettu pelitila palautuu oikein.

## Hyvaksyntakriteeri taman kierroksen jalkeen

- Kaikki ylla olevat polut toimivat ilman konsolivirheita tai ilmeisia UI-rikkoutumisia.
- `Peru` palauttaa aina viimeisimman oikean heiton.
- 3 huti -paatokset sailyvat oikein seka uudelleenlatauksen etta perumisen yli.
- Joukkuevuorotus ei palaa vanhaan rikkinnaiseen malliin.
- Yli 50 -> 25 toimii seka yksilo- etta joukkuepelissa.
- Voittotilanne ja uuden pelin aloitus toimivat molemmissa pelimuodoissa.
