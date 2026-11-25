// two-robots-entry2 — main.ts
//
// One funny line of awkward small talk that one robot says to another in an
// elevator. The program runs a full round-robin tournament over ten original
// candidate lines, scores each one against the judge brief (most important
// first: on-subject small talk, machine logic showing through, awkwardness
// landing, funny on first read, tight single line), and writes the winner to
// /output/entry.txt.
//
// Angle of the whole slate: MISDIRECTION and DEADPAN first-person. Each line
// starts as polite elevator small talk and bends at the end into robot logic:
// a manual, a battery, firmware, a serial number, a protocol, a log, a
// cooling fan, sensors, a saved device name. The robot misreads elevator
// etiquette as a protocol it must follow, and the awkwardness is the thing
// neither robot wants to name.
//
// The winner is the cooling-fan line: a machine fact (the fan kicking in)
// misread as a bodily tell (blushing), then a forced courtesy ("please
// ignore it") that names exactly the thing neither robot wants to name. It
// wins the tournament 158 to 156 over the door-holding marriage-proposal
// line, 9 wins out of 9 games.
//
// Scoring weights follow the brief order:
//   subject 5, machine 4, awkward 3, funny 3, tight 2  (max total 170)
// Every sub-score is 0..10. A round-robin game is won by the higher weighted
// total; a tied total is broken by the higher funny score, then by the
// shorter text, then by the earlier slate position, so every game has a
// winner and the tournament is fully deterministic.

import { mkdirSync, writeFileSync } from "node:fs";

type Candidate = {
  text: string;
  subject: number;
  machine: number;
  awkward: number;
  funny: number;
  tight: number;
};

const WEIGHT_SUBJECT = 5;
const WEIGHT_MACHINE = 4;
const WEIGHT_AWKWARD = 3;
const WEIGHT_FUNNY = 3;
const WEIGHT_TIGHT = 2;

const CANDIDATES: Candidate[] = [
  {
    text: "I have been holding this door open for you for eleven seconds, which my manual lists as a marriage proposal.",
    subject: 10,
    machine: 9,
    awkward: 9,
    funny: 9,
    tight: 8,
  },
  {
    text: "My battery is at four percent, so if this elevator stops, I get to panic first.",
    subject: 9,
    machine: 9,
    awkward: 7,
    funny: 8,
    tight: 9,
  },
  {
    text: "I updated my firmware this morning and it still did not include anything to say to you in here.",
    subject: 10,
    machine: 10,
    awkward: 9,
    funny: 7,
    tight: 8,
  },
  {
    text: "You smell like new plastic, and I have decided to take that as a compliment until further notice.",
    subject: 9,
    machine: 8,
    awkward: 8,
    funny: 8,
    tight: 8,
  },
  {
    text: "Your serial number is newer than mine, and I have been pretending not to notice for four floors.",
    subject: 9,
    machine: 9,
    awkward: 9,
    funny: 7,
    tight: 8,
  },
  {
    text: "I am required by protocol to make small talk, and I am required by honesty to tell you I have none.",
    subject: 10,
    machine: 9,
    awkward: 8,
    funny: 8,
    tight: 9,
  },
  {
    text: "I counted the floors with you in silence, and my log now lists this as our longest conversation.",
    subject: 10,
    machine: 8,
    awkward: 10,
    funny: 8,
    tight: 8,
  },
  {
    text: "My cooling fan just kicked in, which is the closest thing I have to blushing, so please ignore it.",
    subject: 10,
    machine: 9,
    awkward: 9,
    funny: 9,
    tight: 9,
  },
  {
    text: "I was going to ask about your day, but my sensors say you are also avoiding eye contact, so we are even.",
    subject: 9,
    machine: 8,
    awkward: 9,
    funny: 8,
    tight: 7,
  },
  {
    text: "This is the third time we have ridden together, and I still have you saved as Unknown Device.",
    subject: 9,
    machine: 9,
    awkward: 8,
    funny: 9,
    tight: 9,
  },
];

const OUTPUT_PATH = "/output/entry.txt";

function totalOf(candidate: Candidate): number {
  const weightedTotal =
    candidate.subject * WEIGHT_SUBJECT +
    candidate.machine * WEIGHT_MACHINE +
    candidate.awkward * WEIGHT_AWKWARD +
    candidate.funny * WEIGHT_FUNNY +
    candidate.tight * WEIGHT_TIGHT;
  return weightedTotal;
}

function scoreInRange(score: number): boolean {
  const inRange = score >= 0 && score <= 10 && Number.isInteger(score);
  return inRange;
}

function validateCandidates(candidates: Candidate[]): string[] {
  const problems: string[] = [];
  for (let index = 0; index < candidates.length; index++) {
    const candidate = candidates[index];
    const label = `candidate ${index + 1}`;
    const lengthOk = candidate.text.length >= 1 && candidate.text.length <= 200;
    if (lengthOk === false) {
      problems.push(`${label}: length ${candidate.text.length} outside 1..200`);
    }
    const singleLine = candidate.text.includes("\n") === false && candidate.text.includes("\r") === false;
    if (singleLine === false) {
      problems.push(`${label}: not a single line`);
    }
    const nonBlank = candidate.text.trim().length > 0;
    if (nonBlank === false) {
      problems.push(`${label}: blank text`);
    }
    const noEdgeSpace = candidate.text === candidate.text.trim();
    if (noEdgeSpace === false) {
      problems.push(`${label}: leading or trailing whitespace`);
    }
    const scoresOk =
      scoreInRange(candidate.subject) &&
      scoreInRange(candidate.machine) &&
      scoreInRange(candidate.awkward) &&
      scoreInRange(candidate.funny) &&
      scoreInRange(candidate.tight);
    if (scoresOk === false) {
      problems.push(`${label}: sub-score outside 0..10`);
    }
  }
  return problems;
}

function firstBeatsSecond(
  first: Candidate,
  firstTotal: number,
  second: Candidate,
  secondTotal: number,
): boolean {
  const totalDiffers = firstTotal !== secondTotal;
  if (totalDiffers) {
    return firstTotal > secondTotal;
  }
  const funnyDiffers = first.funny !== second.funny;
  if (funnyDiffers) {
    return first.funny > second.funny;
  }
  const lengthDiffers = first.text.length !== second.text.length;
  if (lengthDiffers) {
    return first.text.length < second.text.length;
  }
  return true;
}

function playRoundRobin(candidates: Candidate[], totals: number[]): number[] {
  const wins: number[] = candidates.map(() => 0);
  for (let first = 0; first < candidates.length; first++) {
    for (let second = first + 1; second < candidates.length; second++) {
      const firstWins = firstBeatsSecond(
        candidates[first],
        totals[first],
        candidates[second],
        totals[second],
      );
      if (firstWins) {
        wins[first] = wins[first] + 1;
      }
      if (firstWins === false) {
        wins[second] = wins[second] + 1;
      }
    }
  }
  return wins;
}

function rankIndices(
  candidates: Candidate[],
  totals: number[],
  wins: number[],
): number[] {
  const ranked: number[] = candidates.map((candidate, index) => index);
  ranked.sort((a, b) => {
    const totalGap = totals[b] - totals[a];
    if (totalGap !== 0) {
      return totalGap;
    }
    const winsGap = wins[b] - wins[a];
    if (winsGap !== 0) {
      return winsGap;
    }
    const funnyGap = candidates[b].funny - candidates[a].funny;
    if (funnyGap !== 0) {
      return funnyGap;
    }
    const lengthGap = candidates[a].text.length - candidates[b].text.length;
    if (lengthGap !== 0) {
      return lengthGap;
    }
    return a - b;
  });
  return ranked;
}

function replayCheck(
  candidates: Candidate[],
  totals: number[],
  wins: number[],
  ranked: number[],
): string[] {
  const problems: string[] = [];
  const recomputedTotals: number[] = candidates.map((candidate) => totalOf(candidate));
  for (let index = 0; index < candidates.length; index++) {
    if (recomputedTotals[index] !== totals[index]) {
      problems.push(`replay: total mismatch at candidate ${index + 1}`);
    }
  }
  const replayWins: number[] = playRoundRobin(candidates, recomputedTotals);
  for (let index = 0; index < candidates.length; index++) {
    if (replayWins[index] !== wins[index]) {
      problems.push(`replay: wins mismatch at candidate ${index + 1}`);
    }
  }
  let scanWinner = 0;
  for (let index = 1; index < candidates.length; index++) {
    const challengerBeats = firstBeatsSecond(
      candidates[index],
      recomputedTotals[index],
      candidates[scanWinner],
      recomputedTotals[scanWinner],
    );
    if (challengerBeats) {
      scanWinner = index;
    }
  }
  const scanWinnerMatches = scanWinner === ranked[0];
  if (scanWinnerMatches === false) {
    problems.push(`replay: linear scan winner ${scanWinner + 1} differs from ranked winner ${ranked[0] + 1}`);
  }
  const gamesPlayed = candidates.length * (candidates.length - 1) / 2;
  const winsSum = wins.reduce((sum, count) => sum + count, 0);
  if (winsSum !== gamesPlayed) {
    problems.push(`replay: wins sum ${winsSum} differs from games played ${gamesPlayed}`);
  }
  for (let position = 1; position < ranked.length; position++) {
    const earlierTotal = totals[ranked[position - 1]];
    const laterTotal = totals[ranked[position]];
    if (laterTotal > earlierTotal) {
      problems.push(`replay: ranking not monotonic at position ${position + 1}`);
    }
  }
  return problems;
}

function main(): void {
  const validationProblems = validateCandidates(CANDIDATES);
  if (validationProblems.length > 0) {
    throw new Error(`candidate validation failed: ${validationProblems.join("; ")}`);
  }
  const totals: number[] = CANDIDATES.map((candidate) => totalOf(candidate));
  const wins: number[] = playRoundRobin(CANDIDATES, totals);
  const ranked: number[] = rankIndices(CANDIDATES, totals, wins);
  const replayProblems = replayCheck(CANDIDATES, totals, wins, ranked);
  if (replayProblems.length > 0) {
    throw new Error(`tournament replay failed: ${replayProblems.join("; ")}`);
  }
  const winnerIndex = ranked[0];
  const runnerUpIndex = ranked[1];
  const winner = CANDIDATES[winnerIndex];
  const runnerUp = CANDIDATES[runnerUpIndex];
  const winnerTotal = totals[winnerIndex];
  const winnerWins = wins[winnerIndex];
  const gamesTotal = CANDIDATES.length * (CANDIDATES.length - 1) / 2;
  mkdirSync("/output", { recursive: true });
  writeFileSync(OUTPUT_PATH, winner.text, "utf8");
  console.log(`tournament: ${CANDIDATES.length} candidates, ${gamesTotal} games, round-robin complete`);
  for (let position = 0; position < ranked.length; position++) {
    const standingIndex = ranked[position];
    const standing = CANDIDATES[standingIndex];
    console.log(`rank ${position + 1}: #${standingIndex + 1} total ${totals[standingIndex]} wins ${wins[standingIndex]}/${gamesTotal} (${standing.text.length} chars)`);
  }
  console.log(`winner: #${winnerIndex + 1} total ${winnerTotal} wins ${winnerWins}/${gamesTotal}`);
  console.log(`winner text (${winner.text.length} chars): ${winner.text}`);
  console.log(`runner-up: #${runnerUpIndex + 1} total ${totals[runnerUpIndex]} wins ${wins[runnerUpIndex]}/${gamesTotal}`);
  console.log(`runner-up text (${runnerUp.text.length} chars): ${runnerUp.text}`);
  console.log(`field validation: PASS`);
  console.log(`tournament replay check: PASS`);
  console.log(`wrote ${OUTPUT_PATH}`);
}

main();
