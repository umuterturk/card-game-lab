import React, {useMemo, useState} from 'react';
import {LEVELS, legalMoves, playMove, selectableMoves, solvePuzzle, statusOf} from './puzzle.js';
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
  const [selectedPollen, setSelectedPollen] = useState(null);
  const [help, setHelp] = useState(false);
  const [unlocked, setUnlocked] = useState(readProgress);
  const state = useMemo(() => ({width: level.width, height: level.height, ...round}), [level, round]);
  const moves = useMemo(() => legalMoves(state), [state]);
  const targets = useMemo(() => new Set(moves.map(move => move.over)), [moves]);
  const destinations = useMemo(() => new Map(selectableMoves(moves, selectedPollen).map(move => [move.to, move])), [moves, selectedPollen]);
  const boardWidth = level.width + 0.5;
  const boardHeight = 1 + (level.height - 1) * 0.75;
  const boardAspect = boardWidth / (boardHeight * 2 / Math.sqrt(3));
  const hexStyle = cell => {
    const row = Math.floor(cell / level.width), column = cell % level.width;
    return {left: `${(column + (row % 2) * 0.5) / boardWidth * 100}%`,
      top: `${row * 0.75 / boardHeight * 100}%`};
  };
  const status = statusOf(state);
  const collected = level.pollen.length - round.pollen.length;

  function selectLevel(next) {
    if (next < 0 || next >= LEVELS.length) return;
    setIndex(next);
    setRound(makeRound(LEVELS[next]));
    setHint(null);
    setSelectedPollen(null);
  }
  function land(move) {
    if (!move || status !== 'playing') return;
    const next = playMove(state, move);
    if (next === state) return;
    setRound({bee: next.bee, pollen: next.pollen,
      history: [...round.history, {bee: round.bee, pollen: round.pollen}], turns: round.turns + 1});
    setHint(null);
    setSelectedPollen(null);
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
    setSelectedPollen(null);
  }
  function askHint() {
    const result = solvePuzzle(state);
    setHint(result.solvable ? result.moves[0].to : 'no-solution');
    setSelectedPollen(result.solvable ? result.moves[0].over : null);
  }

  return <div className="bh-app">
    <div className="bh-shell">
      <header className="bh-topbar">
        <a href="./index.html" className="bh-back" aria-label="Back to Card Game Lab">‹</a>
        <div className="bh-brand"><span className="bh-brand-mark">✿</span> BEE HOP <span className="bh-proto">PROTOTYPE</span></div>
        <button className="bh-icon-button" onClick={() => setHelp(!help)} type="button" aria-label="How to play">?</button>
      </header>

      <section className="bh-heading">
        <div><span className="bh-eyebrow">HONEYCOMB TRAIL · LEVEL {fmt(level.id)}</span><h1>{level.name}</h1><p>One bee. Every jump collects pollen.</p></div>
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
        <strong>How to play</strong><p>The bee flies in <b>six straight directions</b> along the honeycomb. Tap any glowing landing hex to jump immediately, or tap a pollen flower to narrow the landing choices. You can pass over empty hexes before the flower, but must cross <b>exactly one flower</b> per jump. Collect them all!</p>
      </section>}

      <section className="bh-board-section">
        <div className="bh-board-top"><span>THE HONEYCOMB</span><span>⬡ SIX DIRECTIONS · {level.width} × {level.height}</span></div>
        <div className="bh-board-outer">
          <div className="bh-board" style={{aspectRatio: boardAspect, '--hex-w': `${100 / boardWidth}%`, '--hex-h': `${100 / boardHeight}%`}} role="group" aria-label={`${level.width} by ${level.height} honeycomb puzzle with six directions`}>
            {Array.from({length: level.width * level.height}, (_, cell) => {
              const move = destinations.get(cell);
              const bee = state.bee === cell;
              const pollen = state.pollen.includes(cell);
              const target = targets.has(cell) && status === 'playing';
              const highlighted = move != null && status === 'playing';
              const selected = selectedPollen === cell;
              return <button key={`${level.id}-${cell}`} type="button"
                style={hexStyle(cell)}
                className={`bh-cell ${bee ? 'is-bee' : ''} ${pollen ? 'is-pollen' : ''} ${target ? 'is-target' : ''} ${selected ? 'is-selected' : ''} ${highlighted ? 'is-landing' : ''} ${hint === cell && highlighted ? 'is-hint' : ''}`}
                disabled={!target && !highlighted && !(bee && status === 'playing')}
                onClick={() => target ? (setSelectedPollen(selected ? null : cell), setHint(null)) : bee ? (setSelectedPollen(null), setHint(null)) : land(move)}
                aria-pressed={target ? selected : undefined}
                aria-label={bee ? `Bee at ${cellLabel(cell, level.width)}; tap to show all landings` : target ? `${selected ? 'Selected' : 'Select'} pollen at ${cellLabel(cell, level.width)}` : pollen ? `Pollen at ${cellLabel(cell, level.width)}` : highlighted ? `Land at ${cellLabel(cell, level.width)}, capturing selected pollen` : `Empty ${cellLabel(cell, level.width)}`}>
                {bee ? <Bee/> : pollen ? <Flower/> : highlighted ? <span className="bh-landing-dot"/> : null}
              </button>;
            })}
          </div>
        </div>
        <div className="bh-board-note">{status === 'won' ? 'All pollen collected! The hive is happy.' : status === 'stuck' ? 'No legal jumps remain. Undo a move or restart.' : hint === 'no-solution' ? 'No winning route from here. Undo a move.' : hint !== null ? 'Golden landing shows a winning move.' : selectedPollen !== null ? 'Pick a green landing hex, or tap the bee to see all moves.' : 'Tap a green landing hex to fly, or tap pollen to filter landings.'}</div>
      </section>

      {status === 'won' && <div className="bh-result bh-win"><span>✦ PERFECT CLEAR ✦</span><strong>Sweet success!</strong><p>Every flower collected in {round.turns} jumps.</p><button type="button" onClick={() => selectLevel(index === 4 ? 0 : index + 1)}>{index === 4 ? 'Play from the start' : 'Next level →'}</button></div>}
      {status === 'stuck' && <div className="bh-result bh-loss"><strong>No more jumps</strong><p>Try a different landing position.</p></div>}

      <div className="bh-controls">
        <button onClick={undo} disabled={!round.history.length} type="button"><span>↶</span> Undo</button>
        <button onClick={() => {setRound(makeRound(level)); setHint(null); setSelectedPollen(null);}} type="button"><span>↻</span> Restart</button>
        <button onClick={askHint} disabled={status !== 'playing'} type="button" className="bh-hint-button"><span>✧</span> Hint</button>
      </div>
      <div className="bh-bottom-note">Six directions · Reverse-generated · Solver-verified · 5 levels</div>
    </div>
  </div>;
}
