import React, {useMemo, useState} from 'react';
import {LEVELS, legalMoves, playMove, solvePuzzle, statusOf} from './puzzle.js';
import './style.css';

const readProgress = () => {
  try {
    const saved = Number(localStorage.getItem('bee-hop.best-level.v1'));
    return Number.isInteger(saved) ? Math.max(1, Math.min(5, saved)) : 1;
  } catch { return 1; }
};

const makeRound = level => ({bee: level.bee, pollen: [...level.pollen], history: [], turns: 0});
const fmt = n => String(n).padStart(2, '0');
const cellLabel = (i, width) => `row ${Math.floor(i / width) + 1}, column ${i % width + 1}`;

function Flower({mini = false}) {
  return <svg className={mini ? 'bh-flower bh-mini' : 'bh-flower'} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="17" r="11" fill="#f6c94b"/><circle cx="46" cy="24" r="11" fill="#ffdf71"/>
    <circle cx="43" cy="42" r="11" fill="#f6c94b"/><circle cx="21" cy="42" r="11" fill="#ffd865"/>
    <circle cx="18" cy="24" r="11" fill="#ffeb8a"/><circle cx="32" cy="32" r="11" fill="#ac6d31"/>
    <circle cx="29" cy="29" r="3" fill="#f1b252"/>
  </svg>;
}

function Bee() {
  return <svg className="bh-bee" viewBox="0 0 90 90" aria-hidden="true">
    <ellipse cx="35" cy="31" rx="19" ry="13" fill="#eefaff" fillOpacity=".95" transform="rotate(-34 35 31)"/>
    <ellipse cx="56" cy="29" rx="18" ry="12" fill="#e4faff" fillOpacity=".85" transform="rotate(28 56 29)"/>
    <ellipse cx="45" cy="52" rx="27" ry="23" fill="#ffc748" stroke="#774522" strokeWidth="3"/>
    <path d="M31 33Q39 51 32 71M51 31Q61 47 57 69" fill="none" stroke="#7c4b26" strokeWidth="10"/>
    <circle cx="37" cy="45" r="3" fill="#30261d"/><circle cx="57" cy="45" r="3" fill="#30261d"/>
    <path d="M42 55Q47 60 52 55" stroke="#66391c" fill="none" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M35 30L30 21M57 30L63 21" stroke="#754a24" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
}

export default function BeeHop() {
  const [index, setIndex] = useState(0);
  const level = LEVELS[index];
  const [round, setRound] = useState(() => makeRound(LEVELS[0]));
  const [hint, setHint] = useState(null);
  const [help, setHelp] = useState(false);
  const [unlocked, setUnlocked] = useState(readProgress);
  const state = useMemo(() => ({width: level.width, height: level.height, ...round}), [level, round]);
  const moves = useMemo(() => legalMoves(state), [state]);
  const destinations = useMemo(() => new Map(moves.map(move => [move.to, move])), [moves]);
  const status = statusOf(state);
  const collected = level.pollen.length - round.pollen.length;

  function selectLevel(next) {
    if (next < 0 || next >= LEVELS.length) return;
    setIndex(next);
    setRound(makeRound(LEVELS[next]));
    setHint(null);
  }
  function land(move) {
    if (!move || status !== 'playing') return;
    const next = playMove(state, move);
    if (next === state) return;
    setRound({bee: next.bee, pollen: next.pollen,
      history: [...round.history, {bee: round.bee, pollen: round.pollen}], turns: round.turns + 1});
    setHint(null);
    if (next.pollen.length === 0 && index + 2 > unlocked) {
      const value = Math.min(5, index + 2);
      setUnlocked(value);
      try {localStorage.setItem('bee-hop.best-level.v1', String(value));} catch { /* private browsing */ }
    }
  }
  function undo() {
    if (!round.history.length) return;
    const previous = round.history.at(-1);
    setRound({bee: previous.bee, pollen: previous.pollen,
      history: round.history.slice(0, -1), turns: Math.max(0, round.turns - 1)});
    setHint(null);
  }
  function askHint() {
    const result = solvePuzzle(state);
    setHint(result.solvable ? result.moves[0].to : 'no-solution');
  }

  return <div className="bh-app">
    <div className="bh-shell">
      <header className="bh-topbar">
        <a href="./index.html" className="bh-back" aria-label="Back to Card Game Lab">‹</a>
        <div className="bh-brand"><span className="bh-brand-mark">✿</span> BEE HOP <span className="bh-proto">PROTOTYPE</span></div>
        <button className="bh-icon-button" onClick={() => setHelp(!help)} type="button" aria-label="How to play">?</button>
      </header>

      <section className="bh-heading">
        <div><span className="bh-eyebrow">THE POLLEN TRAIL · LEVEL {fmt(level.id)}</span><h1>{level.name}</h1><p>One bee. Every jump collects pollen.</p></div>
        <div className="bh-level-badge"><span>LEVEL</span><strong>{fmt(level.id)}</strong></div>
      </section>

      <div className="bh-level-tabs" aria-label="Levels">
        {LEVELS.map((record, i) => <button key={record.id} className={i === index ? 'active' : ''} type="button" aria-pressed={i === index} onClick={() => selectLevel(i)}>{record.id}</button>)}
      </div>

      <div className="bh-progress-card">
        <div className="bh-progress-copy"><div><span className="bh-progress-icon">✿</span><span>POLLEN COLLECTED</span></div><strong>{collected} <small>/ {level.pollen.length}</small></strong></div>
        <div className="bh-progress-track"><div style={{width: `${collected / level.pollen.length * 100}%`}} /></div>
        <span className="bh-progress-sub">Collect every flower without getting stranded</span>
      </div>

      {help && <section className="bh-help" aria-label="How to play">
        <strong>How to play</strong><p>Your bee moves horizontally or vertically. Every jump must cross exactly one flower. You may fly through empty spaces before it and choose <b>any empty landing square beyond</b>. The flower disappears. Collect them all!</p>
      </section>}

      <section className="bh-board-section">
        <div className="bh-board-top"><span>THE MEADOW</span><span>{level.width} × {level.height} GRID</span></div>
        <div className="bh-board-outer">
          <div className="bh-board" style={{'--cols': level.width}} role="group" aria-label={`${level.width} by ${level.height} puzzle grid`}>
            {Array.from({length: level.width * level.height}, (_, cell) => {
              const move = destinations.get(cell);
              const bee = state.bee === cell;
              const pollen = state.pollen.includes(cell);
              const highlighted = move != null && status === 'playing';
              return <button key={`${level.id}-${cell}`} type="button"
                className={`bh-cell ${bee ? 'is-bee' : ''} ${pollen ? 'is-pollen' : ''} ${highlighted ? 'is-landing' : ''} ${hint === cell && highlighted ? 'is-hint' : ''}`}
                disabled={!highlighted} onClick={() => land(move)}
                aria-label={bee ? `Bee at ${cellLabel(cell, level.width)}` : pollen ? `Pollen at ${cellLabel(cell, level.width)}` : highlighted ? `Land at ${cellLabel(cell, level.width)}, capturing pollen` : `Empty ${cellLabel(cell, level.width)}`}>
                {bee ? <Bee/> : pollen ? <Flower/> : highlighted ? <span className="bh-landing-dot"/> : null}
              </button>;
            })}
          </div>
        </div>
        <div className="bh-board-note">{status === 'won' ? 'All pollen collected! The hive is happy.' : status === 'stuck' ? 'No legal jumps remain. Undo a move or restart.' : hint === 'no-solution' ? 'No winning route from here. Undo a move.' : hint !== null ? 'Glowing spot: a step toward the solution.' : 'Tap a glowing spot to choose where your bee lands.'}</div>
      </section>

      {status === 'won' && <div className="bh-result bh-win"><span>✦ PERFECT CLEAR ✦</span><strong>Sweet success!</strong><p>Every flower collected in {round.turns} jumps.</p><button type="button" onClick={() => selectLevel(index === 4 ? 0 : index + 1)}>{index === 4 ? 'Play from the start' : 'Next level →'}</button></div>}
      {status === 'stuck' && <div className="bh-result bh-loss"><strong>No more jumps</strong><p>Try a different landing position.</p></div>}

      <div className="bh-controls">
        <button onClick={undo} disabled={!round.history.length} type="button"><span>↶</span> Undo</button>
        <button onClick={() => {setRound(makeRound(level)); setHint(null);}} type="button"><span>↻</span> Restart</button>
        <button onClick={askHint} disabled={status !== 'playing'} type="button" className="bh-hint-button"><span>✧</span> Hint</button>
      </div>
      <div className="bh-bottom-note">Generated backwards · Verified by a puzzle solver · 5 playable levels</div>
    </div>
  </div>;
}
