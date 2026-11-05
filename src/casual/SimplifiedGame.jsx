import React,{useEffect,useRef,useState} from 'react';
import {overswingPayout,signed} from '../external/engines.js';
import {GardenScene} from './CasualArt.jsx';
import {HorizontalMeter,GlassChest,PendingPot,SimpleCard} from './MinimalBoard.jsx';
import {animateCardAction,animateFactorReset,animateSnapLoss,animatePotBreak,animateBankPour} from './minimalMotion.js';
import {multiplierParts} from './multiplierView.js';
import {rawPotValue,visiblePotPayout,actionPresentation} from './presentation.js';
import {
  newOnboardingRound,onboardingLevel,onboardingActions,onboardingFinished,
  onboardingVictory,stepOnboarding,wouldSnap,ONBOARDING_COUNT
} from './onboardingLevels.js';

const SESSION_KEY='swing-casual-onboarding-session-v1';
const PROGRESS_KEY='swing-casual-onboarding-unlocked-v1';
const event=(name,details={})=>{
  if(typeof window==='undefined')return;
  window.dispatchEvent(new CustomEvent('swing-casual-event',{detail:{name,...details}}));
};
function save(round){try{localStorage.setItem(SESSION_KEY,JSON.stringify(round));}catch{}}
function initialRound(){
  try{
    const state=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    if(state&&Number.isInteger(state.levelId)&&state.levelId>=1&&state.levelId<=ONBOARDING_COUNT&&
      state.game?.game==='overswing'&&state.game.deal&&Number.isInteger(state.turn)&&
      Number.isInteger(state.snaps)&&Number.isInteger(state.flipCount)&&
      Number.isInteger(state.zeroBreakCount))return state;
  }catch{}
  return newOnboardingRound(1);
}
const displayOf=round=>({
  position:round.game.deal.S,
  rawPot:rawPotValue(round.game.deal),
  resonance:round.game.deal.resonancePoints||0,
  factors:multiplierParts(round.game.deal),
  snaps:round.snaps
});
const idleHint=(level,round,actions)=>{
  if(level.id<=2){
    if(actions.some(a=>a.type==='bank'))return 'Tap BANK to fill the glass';
    return 'Tap the card';
  }
  if(level.script[round.turn]?.type==='flip')return 'Try FLIP';
  if(level.script[round.turn]?.type==='bank')return 'Bank your drops';
  return level.lesson;
};

export default function SimplifiedGame(){
  const [round,setRound]=useState(initialRound);
  const [view,setView]=useState(()=>displayOf(round));
  const [shownGold,setShownGold]=useState(round.game.deal.T);
  const [animating,setAnimating]=useState(false);
  const [feedback,setFeedback]=useState(null);
  const [hint,setHint]=useState('');
  const [help,setHelp]=useState(false);
  const rootRef=useRef(null),busyRef=useRef(false),cancelRef=useRef(null);
  const resetMotionRef=useRef(null),lossMotionRef=useRef(null),breakMotionRef=useRef(null);
  const seenFactorsRef=useRef(new Set());
  const level=onboardingLevel(round.levelId);
  const {game}=round,deal=game.deal;
  const victory=onboardingVictory(round),finished=onboardingFinished(round);
  const available=finished||animating?[]:onboardingActions(round);
  const canBank=available.some(a=>a.type==='bank'&&a.dropIndex==null);
  const canFlip=available.some(a=>a.type==='flip');
  const potentialPayout=overswingPayout(game,level.rules);
  const potDisplay=visiblePotPayout(potentialPayout,rawPotValue(deal),view.rawPot);
  const remaining=deal.deck.length-deal.pos;
  const hearts=Math.max(0,level.maxSnaps-view.snaps);
  const scriptAction=level.script[round.turn];
  // During a one-action teaching beat, don't offer other inactive choices.
  const shownHand=scriptAction?.type==='flip'?[]:
    deal.hand.slice(0,level.visibleHandSlots);

  useEffect(()=>()=>{
    cancelRef.current?.();resetMotionRef.current?.();
    lossMotionRef.current?.();breakMotionRef.current?.();
  },[]);
  useEffect(()=>{
    event('level_start',{level:round.levelId});
  },[round.levelId]);
  useEffect(()=>{
    if(animating||finished)return;
    const timer=setTimeout(()=>{
      const message=idleHint(level,round,available);
      setHint(message);
      event('hint_shown',{level:level.id,turn:round.turn});
    },2800);
    return ()=>clearTimeout(timer);
  },[animating,round.turn,round.levelId,finished]);

  function startLevel(id){
    cancelRef.current?.();resetMotionRef.current?.();
    lossMotionRef.current?.();breakMotionRef.current?.();
    cancelRef.current=null;resetMotionRef.current=null;
    lossMotionRef.current=null;breakMotionRef.current=null;
    busyRef.current=false;
    const next=newOnboardingRound(id);
    save(next);
    setRound(next);setView(displayOf(next));setShownGold(0);
    setAnimating(false);setFeedback(null);setHint('');setHelp(false);
    seenFactorsRef.current=new Set();
  }
  function nextLevel(){
    if(round.levelId===ONBOARDING_COUNT)return startLevel(10);
    startLevel(round.levelId+1);
  }
  function skip(){
    event('tutorial_skip',{level:level.id});
    try{localStorage.setItem(PROGRESS_KEY,String(ONBOARDING_COUNT));}catch{}
    startLevel(ONBOARDING_COUNT);
  }

  function play(action,source){
    if(finished||busyRef.current)return;
    const next=stepOnboarding(round,action);
    if(next===round)return;
    const change=actionPresentation(round,next,action);
    // Commit before motion: an interrupted animation or reload never replays a move.
    save(next);
    event(action.type==='steer'?'card_play':action.type,{
      level:level.id,turn:next.turn,card:change.signedCard,
      snap:change.snap,zeroBreak:change.zeroBreak,bankGain:change.bankGain
    });
    if(round.turn===0)event('first_action',{level:level.id});
    if(change.snap)event('snap',{level:level.id});
    if(change.zeroBreak)event('zero_break',{level:level.id});
    change.rewards.forEach(({kind,value})=>event('factor_changed',{level:level.id,kind,value}));
    if(onboardingVictory(next)){
      event('level_complete',{level:level.id,actions:next.turn});
      if(level.id===ONBOARDING_COUNT)event('onboarding_complete');
      try{localStorage.setItem(PROGRESS_KEY,String(Math.min(ONBOARDING_COUNT,level.id+1)));}catch{}
    }
    const root=rootRef.current;
    busyRef.current=true;setAnimating(true);setFeedback(action.type);
    setHint('');setHelp(false);
    resetMotionRef.current?.();breakMotionRef.current?.();
    resetMotionRef.current=null;breakMotionRef.current=null;
    const done=()=>{
      busyRef.current=false;cancelRef.current=null;
      setRound(next);setView(displayOf(next));setShownGold(next.game.deal.T);
      setFeedback(null);setAnimating(false);
    };
    if(!root||!source){done();return;}
    if(action.type==='bank'){
      cancelRef.current=animateBankPour({
        root,source,potValue:change.rawPotBefore,
        fromScore:change.securedBefore,toScore:change.securedAfter,
        onPourProgress:rawPot=>setView(v=>({...v,rawPot})),
        onTake:()=>setView(v=>({...v,rawPot:0,resonance:0})),
        onCount:setShownGold,onComplete:done
      });
      return;
    }
    const firstFactorAwards=change.rewards
      .filter(({kind})=>!seenFactorsRef.current.has(kind)).map(({kind})=>kind);
    change.rewards.forEach(({kind})=>seenFactorsRef.current.add(kind));
    cancelRef.current=animateCardAction({
      root,source,action,view:change,firstFactorAwards,
      onMeter:position=>{
        setView(v=>({...v,position}));
        if(change.snap)setFeedback('snap');
      },
      onPot:rawPot=>setView(v=>({...v,rawPot,resonance:change.resonanceAfter})),
      onSnap:()=>{
        breakMotionRef.current?.();breakMotionRef.current=animatePotBreak(root,'snap');
        lossMotionRef.current?.();lossMotionRef.current=animateSnapLoss(root,change.rawPotBefore);
        setView(v=>({...v,snaps:change.snapsAfter}));
      },
      onFactors:factors=>{
        setView(v=>({...v,factors}));
        if(change.zeroBreak&&level.id>=8){
          setFeedback('zero_break');
          breakMotionRef.current?.();breakMotionRef.current=animatePotBreak(root,'zero');
        }
        if((change.zeroBreak&&level.id>=8)||change.snap||
          change.factorsAfter.some((f,i)=>f.value<change.factorsBefore[i].value)){
          resetMotionRef.current=animateFactorReset(root);
        }
      },
      onComplete:done
    });
  }

  return <main className="sgv-page">
    <div ref={rootRef}
      className={'sgv-phone sgv-onboarding sgv-onboarding-'+level.id+' sgv-event-'+(feedback||round.event.type)}
      aria-busy={animating}>
      <GardenScene/>
      <div className="sgv-atmosphere" aria-hidden="true"/>
      <header className="sgv-hud sgv-tutorial-hud">
        {level.id>=3&&<span className="sgv-tutorial-level">LEVEL {level.id}</span>}
        {level.showChances&&<div className="sgv-lives" aria-label={hearts+' chances remaining'}>
          {Array.from({length:level.maxSnaps},(_,i)=><span key={i}
            className={i<hearts?'sgv-heart':'sgv-heart sgv-heart-empty'}>♥</span>)}
        </div>}
        {level.id>=3&&<div className="sgv-tutorial-links">
          <button type="button" onClick={()=>setHelp(v=>!v)} aria-label="About this level">?</button>
          {level.id<ONBOARDING_COUNT&&<button type="button" onClick={skip}>Skip</button>}
        </div>}
      </header>
      <div className="sgv-middle">
        {level.showMeter?
          <HorizontalMeter position={view.position} limit={level.rules.snapLimit}
            multipliers={view.factors} visibleFactors={level.visibleFactors}/>:
          <div className="sgv-meter-placeholder" aria-hidden="true"/>}
        <span className="sgv-flight-center" aria-hidden="true"/>
        <div className="sgv-bottle-pair" aria-label="Pending Pot and secured glass">
          <PendingPot value={potDisplay} target={level.target}
            className={(level.id<=2&&round.turn===0&&view.rawPot===0?' sgv-pot-dormant':'')+
              (hint&&canBank?' sgv-attention':'')}
            bankable={canBank} onBank={source=>play({type:'bank'},source)}/>
          <GlassChest banked={shownGold} target={level.target} minimal={level.id<=2}/>
        </div>
      </div>
      <section className="sgv-controls sgv-tutorial-controls" aria-label="Card actions">
        <div className="sgv-card-shelf" aria-hidden="true"/>
        <div className="sgv-hand" aria-label="Your cards">
          {shownHand.map((id,i)=><SimpleCard key={id} id={id} index={i}
            value={signed(id)} showDirection={level.id>=2}
            risky={level.showChances&&wouldSnap(round,{type:'steer',index:i})}
            disabled={finished||animating||!available.some(a=>a.type==='steer'&&a.index===i)}
            onPlay={(index,element)=>play({type:'steer',index},element)}/>)}
        </div>
        {level.showFlip&&<div className="sgv-actions sgv-tutorial-actions">
          <button type="button"
            className={'sgv-action sgv-flip'+(hint&&canFlip?' sgv-attention':'')}
            disabled={!canFlip}
            onClick={e=>play({type:'flip'},e.currentTarget.querySelector('.sgv-next-card'))}
            aria-label={'Flip a hidden card. '+remaining+' remain'}>
            <span className="sgv-action-icon">⟳</span>
            <span className="sgv-action-text">FLIP</span>
            <span className="sgv-flip-next"><span className="sgv-next-card">?</span>
              <small>{remaining} left</small></span>
          </button>
        </div>}
      </section>
      {hint&&!finished&&<div className="sgv-tutorial-hint" role="status">{hint}</div>}
      {help&&!finished&&<div className="sgv-tutorial-help" role="note">{level.lesson}</div>}
      {finished&&<div className="sgv-end-overlay" role="dialog" aria-modal="true" aria-labelledby="sgv-end-title">
        <div className="sgv-end-card">
          <div className="sgv-end-symbol">{victory?'★':'♡'}</div>
          <h1 id="sgv-end-title">{victory?(level.id===ONBOARDING_COUNT?'You mastered Swing!':'Level complete!'):'Try again!'}</h1>
          <p>{'Drops secured: '+deal.T+' / '+level.target}</p>
          <button type="button" onClick={victory?nextLevel:()=>startLevel(level.id)}>
            {victory?(level.id===ONBOARDING_COUNT?'REPLAY CHALLENGE':'NEXT LEVEL'):'TRY AGAIN'}
          </button>
        </div>
      </div>}
    </div>
  </main>;
}