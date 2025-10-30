// rules.js — Mölkky-sääntömoottori (pure functions)

/**
 * Heiton tyypit:
 * - "MISS"         : huti (0)
 * - "SINGLE_PIN"   : kaatui 1 keila → pisteet = keilan numero (1..12)
 * - "MULTI_PINS"   : kaatui useita → pisteet = kaadettujen määrä (2..12)
 */
export const ThrowType = Object.freeze({
  MISS: "MISS",
  SINGLE_PIN: "SINGLE_PIN",
  MULTI_PINS: "MULTI_PINS",
});

/**
 * Pelaajan tila
 * score: kokonaispisteet (0..50)
 * misses: peräkkäisten hutien määrä (0..3)
 * active: onko mukana pelissä (3 hutia voi pudottaa)
 */
export function createPlayerState(name) {
  return { name, score: 0, misses: 0, active: true };
}

/**
 * Laskee heiton pistemäärän heittotyypin ja arvon perusteella.
 * Vain validit kombinaatiot sallitaan.
 */
export function resolveThrowPoints(throwType, value) {
  switch (throwType) {
    case ThrowType.MISS:
      if (value !== 0) throw new Error("MISS must have value 0");
      return 0;
    case ThrowType.SINGLE_PIN:
      if (!Number.isInteger(value) || value < 1 || value > 12) {
        throw new Error("SINGLE_PIN must be 1..12");
      }
      return value; // keilan numero
    case ThrowType.MULTI_PINS:
      if (!Number.isInteger(value) || value < 2 || value > 12) {
        throw new Error("MULTI_PINS must be 2..12");
      }
      return value; // kaadettujen määrä
    default:
      throw new Error("Unknown throw type");
  }
}

/**
 * Soveltaa Mölkyn erikoissäännöt kokonaispisteisiin:
 * - jos > 50 → palautus 25:een
 * - jos == 50 → voitto
 */
export function applyScoreRules(totalBefore, gained) {
  const raw = totalBefore + gained;
  if (raw === 50) {
    return { score: 50, win: true, bounced: false };
  }
  if (raw > 50) {
    return { score: 25, win: false, bounced: true };
  }
  return { score: raw, win: false, bounced: false };
}

/**
 * Soveltaa heiton pelaajan tilaan.
 * Palauttaa uuden tilan ja tapahtumat.
 */
export function applyThrow(player, throwType, value) {
  if (!player.active) {
    return { player: { ...player }, events: ["INACTIVE"] };
  }

  const pts = resolveThrowPoints(throwType, value);

  // Huti: kasvattaa misses, ei muuta scorea (paitsi voimme palauttaa viestin)
  if (pts === 0) {
    const misses = player.misses + 1;
    const eliminated = misses >= 3;
    const updated = {
      ...player,
      misses: eliminated ? 0 : misses, // nollataan jos pudotetaan, active false alla
      active: eliminated ? false : true,
    };
    const events = eliminated
      ? [`MISS_${misses}`, "ELIMINATED_3_MISSES"]
      : [`MISS_${misses}`];
    return { player: updated, events };
  }

  // Osuma: nollaa hutiputken ja päivitä pisteet erikoissäännöillä
  const { score, win, bounced } = applyScoreRules(player.score, pts);
  const updated = { ...player, score, misses: 0 };

  const events = [];
  if (bounced) events.push("BOUNCE_TO_25");
  if (win) events.push("WIN_50");
  if (!events.length) events.push("HIT");

  return { player: updated, events };
}

/**
 * Pieni apu-API käyttöä varten.
 * throwFromRawInput("0") -> {type: MISS, value:0}
 * throwFromRawInput("S1") -> SINGLE_PIN, value=1 (keilan numero)
 * throwFromRawInput("M4") -> MULTI_PINS, value=4 (määrä)
 */
export function throwFromRawInput(raw) {
  const s = String(raw).trim().toUpperCase();
  if (s === "0") return { type: ThrowType.MISS, value: 0 };
  if (/^S([1-9]|1[0-2])$/.test(s)) {
    return { type: ThrowType.SINGLE_PIN, value: parseInt(s.slice(1), 10) };
  }
  if (/^M([2-9]|1[0-2])$/.test(s)) {
    return { type: ThrowType.MULTI_PINS, value: parseInt(s.slice(1), 10) };
  }
  throw new Error("Invalid raw input. Use 0, S1..S12, or M2..M12");
}