import React,{useState,useEffect,useLayoutEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {rank,suit,signed,label,applySwing,overswingActions,overswingPayout,overswingMultiplier} from './engines.js';
import {royalRank} from './overswingRoyals.js';
import './overswing.css';
import './overswingVisualFix.css';
import {OVERSWING_TUTORIAL_STEPS,OVERSWING_TUTORIAL_INTRO} from './overswingTutorial.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';
import {journeyRules,journeyActions} from './overswingJourney.js';
import {campaignLevel,campaignRuleLabels} from './overswingCampaign.js';
import {WILD_IDS,WILD_RULES} from './overswingWilds.js';
import {journeyWildBalance,journeyCanUseWild} from './overswingJourney.js';
import {swingImpactForAction} from './overswingImpact.js';
import DoomFire from './DoomFire.jsx';
import GoldAmount,{GoldCoin} from './GoldCoin.jsx';
import RevealedCards from './RevealedCards.jsx';
import AbilityIcon from './OverswingAbilityIcon.jsx';
import {revealOffer} from './overswingReveal.js';
import {overswingTension} from './overswingTension.js';
import {pixelPendulumFrame,PENDULUM_FPS,PENDULUM_REGULAR_MS,PENDULUM_SNAP_MS} from './overswingPendulum.js';
import {cardFlightResult,flipFlightPoints,bankCoinBurst,bankBurstPoints} from './overswingFlipFlight.js';
import OverswingSoundControls from './OverswingSoundControls.jsx';
import {multiplierFeedbackForAction,potCrackForAction} from './overswingFeedback.js';
import {MultiplierBurst,PotCrack} from './OverswingFeedback.jsx';

const SUITS=['♥','♦','♠','♣'];
const name=id=>label(id);
const val=n=>n>0?'+'+n:String(n);
const target={pot:'POT',discard:'DISCARD'};
function Card({id,onClick,caption,chosen=false,mini=false,potCard=false,handCard=false,flightHidden=false}){
  return <button type="button" disabled={!onClick} onClick={onClick}
    data-pot-card={potCard?id:undefined}
    data-hand-card={handCard?id:undefined}
    className={'os8-card '+(suit(id)<2?'os8-red':'os8-black')+(royalRank(id)?' os8-royal':'')+(chosen?' os8-selected':'')+(mini?' os8-mini':'')+(flightHidden?' os8-pot-flight-hidden':'')}
    aria-label={name(id)+' '+val(signed(id))+(caption?' '+caption:'')}>
    <span className="os8-card-top">{name(id)}</span>

    {!mini&&<strong>{val(signed(id))}</strong>}
    {!mini&&<small>{caption}</small>}
  </button>;
}
function Outcome({e}){
  if(!e)return <>Tap any hand card to <b>STEER</b>, or <b>FLIP</b> a random card.</>;
  if(e.type==='wild')return <><b>WILD SHUFFLE!</b> Refreshed {e.replaced} ordinary hand cards.</>;
  if(e.type==='bank')return <><b><GoldAmount value={e.points} prefix="+"/> BANKED</b>{e.taxPaid>0?<> · TAX <GoldAmount value={e.taxPaid} prefix="−"/></>:''}{e.crownBonus?' · CROWN +'+e.crownBonus+'%':''} · Hand limit {e.oldCap} → {e.newCap}. {e.dropped!=null?name(e.dropped)+' discarded. ':''}{e.refilled?.length?'Hand refilled.':''}</>;
  if(e.snap&&e.shielded)return <><b>EMBER SHIELD!</b> SNAP contained: <b>{name(e.card)}</b>. Pot saved, multipliers reset to ×1.</>;
  if(e.snap)return <><b>SNAP!</b> <b>{name(e.card)}</b>: {val(e.from)} → {val(e.to)}. Lost {e.lostPayout.toLocaleString('en-US')} potential points.</>;
  if(e.zeroBreak)return <><b>ZERO BREAK!</b> {name(e.card)}: {val(e.from)} → 0. <b>All multipliers reset to ×1.</b> Pot kept{e.refilled?.length?', hand refilled':''}.</>;
  return <><b>{e.polarityReversed?'POLARITY ':e.type==='flip'?'FLIP ':'STEER '}{name(e.card)}</b> · {val(e.from)} → {val(e.to)} · <b>{target[e.destination]}</b>{e.scouted!=null?<b> · NEXT FLIP: {name(e.scouted)}</b>:null}{e.swung?<b> · SWING +{e.gain}</b>:null}{e.swingPenalty?<b> · SWING −1</b>:null} · total ×{e.multiplier.toLocaleString('en-US')}{e.refilled?.length?' · '+e.refilled.length+' cards refilled':''}{e.shieldFaded?' · SHIELD SPENT':''}</>;
}

function FlameMeter({position,limit=10,action=null}){
  const [needle,setNeedle]=useState(position);
  const needleRef=useRef(position);
  const initial=useRef(true);
  useEffect(()=>{
    // Initial render and reduced-motion devices always show the resolved state.
    if(initial.current){initial.current=false;needleRef.current=position;return;}
    const prefersReducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const snapTo=action?.snap&&(action.type==='flip'||action.type==='steer')
      ?action.to:null;
    if(prefersReducedMotion||document.hidden||
       (needleRef.current===position&&snapTo===null)){
      needleRef.current=position;setNeedle(position);return;
    }
    const from=needleRef.current,duration=snapTo!==null?
      PENDULUM_SNAP_MS:Math.max(270,Math.min(610,
        PENDULUM_REGULAR_MS+Math.abs(position-from)*12));
    let started=null,last=-Infinity,frame=0;
    const animate=now=>{
      if(started===null)started=now;
      const progress=Math.min(1,(now-started)/duration);
      if(now-last>=1000/PENDULUM_FPS||progress===1){
        const next=pixelPendulumFrame(from,position,progress,limit,snapTo);
        needleRef.current=next;setNeedle(next);last=now;
      }
      if(progress<1)frame=window.requestAnimationFrame(animate);
    };
    frame=window.requestAnimationFrame(animate);
    return ()=>window.cancelAnimationFrame(frame);
  },[position,limit,action]);
  const t=Math.PI-(needle+limit)/(2*limit)*Math.PI;
  const x=200+147*Math.cos(t),y=184-147*Math.sin(t);
  const n=position>0?'+'+position:String(position);
  const pixels=Array.from({length:19},(_,i)=>{
    const fraction=(i+1)/20;
    return {x:Math.round((200+(x-200)*fraction)/6)*6,
      y:Math.round((184+(y-184)*fraction)/6)*6};
  });
  return <div className="os8-flame-meter">
    <svg viewBox="0 0 400 205" role="img" shapeRendering="crispEdges"
      aria-label={'Pendulum '+n+' on a scale from minus '+limit+' to plus '+limit}>
      <defs>
        <linearGradient id="os8-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#776c6a"/><stop offset=".48" stopColor="#322c36"/>
          <stop offset="1" stopColor="#e26b28"/>
        </linearGradient>
        <linearGradient id="os8-flame-side" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#101722"/><stop offset=".5" stopColor="#241b21"/>
          <stop offset="1" stopColor="#77200d"/>
        </linearGradient>
        <linearGradient id="os8-needle" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff7d1f"/><stop offset=".5" stopColor="#ffdf84"/><stop offset="1" stopColor="#ffb639"/>
        </linearGradient>
      </defs>
      <path d="M 22 184 A 178 178 0 0 1 378 184 Z" fill="url(#os8-flame-side)"/>
      <path d="M 28 184 A 172 172 0 0 1 372 184" fill="none" stroke="#16131c" strokeWidth="20"/>
      <path d="M 28 184 A 172 172 0 0 1 372 184" fill="none" stroke="url(#os8-rim)" strokeWidth="12" strokeDasharray="10 3"/>
      <path d="M 45 184 A 155 155 0 0 1 355 184" fill="none" stroke="#efb872" strokeWidth="2"/>
      <path d="M 200 26 V 184" stroke="#e7c8ad" strokeWidth="2" strokeDasharray="6 4" opacity=".7"/>
      {[-10,-8,-6,-4,-2,0,2,4,6,8,10].map(value=>{
        const theta=Math.PI-(value+10)/20*Math.PI;
        const r1=155,r2=value%5===0?135:143;
        return <line key={value} x1={200+r1*Math.cos(theta)} y1={184-r1*Math.sin(theta)}
          x2={200+r2*Math.cos(theta)} y2={184-r2*Math.sin(theta)}
          stroke={value>0?'#ff8b42':'#d3d2d7'} strokeWidth={value%5===0?3:1.5}/>;
      })}
      <text x="24" y="197" fill="#fff5df" fontSize="19" fontWeight="900">−{limit}</text>
      <text x="375" y="197" textAnchor="end" fill="#ffb36a" fontSize="19" fontWeight="900">+{limit}</text>
      <text x="200" y="22" textAnchor="middle" fill="#f5dfb1" fontSize="20" fontWeight="900">0</text>
      <g className="os8-pixel-pendulum" aria-hidden="true">
        {pixels.map((p,i)=><React.Fragment key={i}>
          <rect x={p.x-6} y={p.y-6} width="12" height="12" fill="#51220f"/>
          <rect x={p.x-3} y={p.y-4} width="7" height="8"
            fill={i%3===0?'#ffdb75':'#ff8630'}/>
        </React.Fragment>)}
        <rect x={Math.round(x/4)*4-11} y={Math.round(y/4)*4-11}
          width="22" height="22" fill="#ffba4b" stroke="#2e1520" strokeWidth="4"/>
        <rect x={Math.round(x/4)*4-4} y={Math.round(y/4)*4-4}
          width="8" height="8" fill="#fff0ab"/>
      </g>
      <rect x="182" y="166" width="36" height="36" fill="#18121a" stroke="#ff8b24" strokeWidth="6"/>
      <text x="200" y="190" textAnchor="middle" fill="#ffbe58" fontSize="20">♨</text>
      <rect x={Math.min(350,Math.max(8,x-23))} y={Math.max(29,y-43)} width="48" height="31" rx="2"
        fill="#2c1510" stroke="#ff8f34" strokeWidth="3"/>
      <text x={Math.min(350,Math.max(8,x-23))+24} y={Math.max(29,y-43)+22}
        textAnchor="middle" fill="#fff4df" fontSize="21" fontWeight="900">{n}</text>
    </svg>
  </div>;
}


// Twelve-column, low-resolution sprites. Each lit cell becomes a crisp 4px pixel.
const IMPACT_GLYPHS={
  zero:[
    '000011110000','000111111000','001110011100','011100001110',
    '011000000110','011000000110','011000000110','011000000110',
    '011100001110','001110011100','000111111000','000011110000'
  ],
  snap:[
    '110000000011','111000000111','011100001110','001110011100',
    '000111111000','000011110000','000011110000','000111111000',
    '001110011100','011100001110','111000000111','110000000011'
  ]
};
const IMPACT_RAYS=Array.from({length:12},(_,i)=>({
  '--ray':(i*30)+'deg','--travel':(45+(i%3)*16)+'px'
}));
function SwingImpact({impact}){
  if(!impact)return null;
  const snap=impact.kind==='snap';
  return createPortal(<div className={'os8-impact os8-impact-over-card os8-impact-'+impact.kind+' os8-impact-'+impact.side}
    style={impact.frame} aria-hidden="true">
    <div className="os8-impact-flash"/>
    <div className="os8-impact-shockwave"/>
    <div className="os8-impact-split"/>
    {IMPACT_RAYS.map((vars,i)=><i className="os8-impact-spark" key={i} style={vars}/>)}
    <svg className="os8-impact-glyph" viewBox="0 0 48 48" shapeRendering="crispEdges"
      focusable="false" aria-hidden="true">
      {IMPACT_GLYPHS[impact.kind].flatMap((line,y)=>[...line].map((bit,x)=>
        bit==='1'?<rect key={y+'-'+x} x={x*4} y={y*4} width="4" height="4"
          fill={snap?(y%3===0?'#fff4c4':'#ff6d44'):(y%3===0?'#c9d0e0':'#8791b1')}/>:null
      ))}
    </svg>
    <div className="os8-impact-caption">
      <strong>{snap?'SNAP!':'ZERO BREAK'}</strong>
      <span>{snap?'POT LOST':'ALL MULTIPLIERS → ×1'}</span>
    </div>
  </div>,document.body);
}


// FLIP and STEER share one pixel card reveal, but STEER originates from the
// exact touched hand card. A non-crossing STEER flies to the discard tracker.

function FlipFlight({flight,onFinish}){
  if(!flight)return null;
  const isSnap=flight.destination==='snap',isDiscard=flight.destination==='discard';
  const isSteer=flight.kind==='steer';
  const isRed=suit(flight.card)<2;
  const face=name(flight.card);
  const onEnd=event=>{
    if(event.target===event.currentTarget)onFinish(flight.serial);
  };
  return createPortal(
    <div className={'os8-flip-flight '+(isSnap?'os8-flip-flight-snap':isDiscard?'os8-flip-flight-discard':'os8-flip-flight-pot')+
      (isSteer?' os8-steer-flight':'')+
      (isRed?' os8-flip-flight-red':' os8-flip-flight-black')}
      key={flight.serial} style={flight.style} onAnimationEnd={onEnd}
      aria-hidden="true">
      <div className="os8-flip-face">
        <span className="os8-flip-face-corner">{face}</span>
        <strong className="os8-flip-face-suit">{SUITS[suit(flight.card)]}</strong>
        <b className="os8-flip-face-value">{val(signed(flight.card))}</b>
        <span className="os8-flip-face-tag">{isSnap?'SNAP!':isDiscard?'DISCARDED':isSteer?'STEERED':'FLIPPED'}</span>
      </div>
      {isSnap&&<span className="os8-flip-face-break" aria-hidden="true">✕</span>}
    </div>,document.body);
}


function BankCoinBurst({burst,onFinish}){
  if(!burst)return null;
  const onEnd=event=>{
    if(event.target===event.currentTarget)onFinish(burst.serial);
  };
  return createPortal(<div className="os8-bank-burst" key={burst.serial}
    aria-hidden="true" onAnimationEnd={onEnd}>
    {Array.from({length:burst.count},(_,i)=>{
      const angle=(i/burst.count)*Math.PI*2;
      const radius=22+(i%5)*13;
      const fanX=Math.round(Math.cos(angle)*radius),fanY=Math.round(Math.abs(Math.sin(angle))*radius);
      const vars={...burst.style,
        '--fan-x':fanX+'px','--fan-y':fanY+'px',
        '--fan-x-quarter':Math.round(fanX*.24)+'px',
        '--bank-delay':((i%7)*33)+'ms'};
      return <span className="os8-bank-flying-coin" key={i} style={vars}>
        <GoldCoin size="lg" shine={false}/>
      </span>;
    })}
    <div className="os8-bank-burst-label" style={burst.style}>
      <GoldAmount value={burst.amount} prefix="+" size="lg"/>
      <span>BANKED!</span>
    </div>
  </div>,document.body);
}

const FACTOR_HELP={
  swing:{title:'SWING',text:'Cross zero to gain SWING. Any safe noncrossing FLIP or STEER loses 1 SWING tier (minimum ×1).'},
  flip:{title:'FLIP',text:'Each consecutive safe FLIP builds ×2, ×3, ×4… even when it crosses zero. STEER ends the streak but preserves earned FLIP.'},
  jackpot:{title:'JACKPOT',text:'Every zero crossing made by FLIP adds one tier: ×2, ×3, ×4… A noncrossing FLIP does not reduce it. Exact zero resets all multipliers.'}
};
function Factor({id,label,value,onClick,expanded,winning=false}){
  return <button type="button" className={'os8-factor '+(value>1?'os8-active':'')+
    (expanded?' os8-factor-open':'')+(winning?' os8-factor-winning':'')}
      onClick={onClick} aria-expanded={expanded} aria-controls="os8-factor-help"
      aria-label={label+' multiplier '+value+'. Tap for help'}>
    <span>{label} <span className="os8-info-icon" aria-hidden="true">ⓘ</span></span>
    <b>×{value.toLocaleString('en-US')}</b>
  </button>;
}
export default function OverswingPlay({s,act,restart,onWild=null,onReveal=null,journey=null,onBack=null,fullView=false,sound=null}){
  const [discardPick,setDiscardPick]=useState(false);
  const [openFactor,setOpenFactor]=useState(null);
  const [polarityPick,setPolarityPick]=useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  const [queenPick,setQueenPick]=useState(null);
  const [impact,setImpact]=useState(null);
  const [flight,setFlight]=useState(null);
  const [coinBurst,setCoinBurst]=useState(null);
  const [multiplierBurst,setMultiplierBurst]=useState(null);
  const [potCrack,setPotCrack]=useState(null);
  const lastAudioAction=useRef(s.lastAction);
  const flipButtonRef=useRef(null),bankButtonRef=useRef(null);
  const potTargetRef=useRef(null),potSectionRef=useRef(null);
  const meterRef=useRef(null),goldTargetRef=useRef(null);
  const discardTargetRef=useRef(null),handContainerRef=useRef(null);
  const steerSourceRef=useRef(null);
  const previousFlightAction=useRef(s.lastAction),flightSerial=useRef(0),bankSerial=useRef(0);
  const previousFeedbackAction=useRef(s.lastAction),bonusSerial=useRef(0),crackSerial=useRef(0);

  const dispatch=command=>{sound?.unlock();act(command);};
  const saveSteerSource=(index,element)=>{
    if(!element||!Number.isInteger(d?.hand?.[index]))return;
    steerSourceRef.current={card:d.hand[index],rect:element.getBoundingClientRect()};
  };
  useEffect(()=>{
    if(s.lastAction===lastAudioAction.current)return;
    lastAudioAction.current=s.lastAction;
    sound?.play(s.lastAction);
  },[s.lastAction]);
  useLayoutEffect(()=>{
    const action=s.lastAction;
    if(action===previousFlightAction.current)return;
    previousFlightAction.current=action;
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const bank=bankCoinBurst(action);
    if(bank){
      setFlight(null);
      const source=bankButtonRef.current,target=goldTargetRef.current;
      if(source&&target&&!reduced){
        setCoinBurst({...bank,
          style:bankBurstPoints(source.getBoundingClientRect(),target.getBoundingClientRect()),
          serial:++bankSerial.current});
      }else setCoinBurst(null);
      return;
    }
    const event=cardFlightResult(action);
    if(!event||reduced){setFlight(null);return;}
    const source=event.kind==='flip'?
      flipButtonRef.current?.getBoundingClientRect():
      steerSourceRef.current?.card===event.card?steerSourceRef.current.rect:null;
    const destination=event.destination==='pot'?
      (potTargetRef.current?.querySelector('[data-pot-card="'+event.card+'"]')||
       potTargetRef.current):
      event.destination==='discard'?discardTargetRef.current:meterRef.current;
    if(!source||!destination){setFlight(null);return;}
    const style=flipFlightPoints(
      source,destination.getBoundingClientRect(),
      {width:window.innerWidth,height:window.innerHeight});
    setFlight({...event,style,serial:++flightSerial.current});
  },[s.lastAction,s.dealIndex,s.seed]);
  useLayoutEffect(()=>{
    const action=s.lastAction;
    if(action===previousFeedbackAction.current)return;
    previousFeedbackAction.current=action;
    const bonus=multiplierFeedbackForAction(action);
    setMultiplierBurst(bonus?{...bonus,serial:++bonusSerial.current}:null);
    const loss=potCrackForAction(action);
    const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if(!loss||reduced){setPotCrack(null);return;}
    const area=potSectionRef.current?.getBoundingClientRect();
    const centerX=area?Math.round(area.left+area.width/2):Math.round(window.innerWidth/2);
    const centerY=area?Math.round(area.top+area.height/2):Math.round(window.innerHeight*.62);
    setPotCrack({...loss,serial:++crackSerial.current,style:{
      '--crack-x':centerX+'px','--crack-y':centerY+'px'
    }});
  },[s.lastAction,s.dealIndex,s.seed]);
  // A new action object means a new event. Use an increasing key so successive
  // ZERO BREAKs or SNAPs always restart their CSS animations.
  useLayoutEffect(()=>{
    const event=swingImpactForAction(s.lastAction);
    if(!event){setImpact(null);return;}
    const rect=meterRef.current?.getBoundingClientRect();
    const frame=rect?{left:rect.left,top:rect.top,width:rect.width,height:rect.height}:
      {left:0,top:0,width:window.innerWidth,height:window.innerHeight*.28};
    setImpact(previous=>({...event,frame,serial:(previous?.serial||0)+1}));
  },[s.lastAction,s.seed,s.dealIndex]);
  useEffect(()=>setHelpOpen(false),[s.mode,s.dealIndex]);
  const tutorial=s.mode==='tutorial';
  const isJourney=!!journey;
  const tutorialStep=tutorial?OVERSWING_TUTORIAL_STEPS[s.tutorialStep]:null;
  const d=s.deal,legal=isJourney?journeyActions(journey):overswingActions(s),pot=d.pot.reduce((a,c)=>a+rank(c),0);
  const rules=isJourney?journeyRules(journey):{};
  const limit=rules.snapLimit||10;
  const payout=overswingPayout(s,rules),multiplier=overswingMultiplier(d);
  const gateTarget=isJourney?journey.encounter.effectiveTarget:3000;
  const goalMet=isJourney&&d.T>=gateTarget;
  const tension=overswingTension({deal:d,target:gateTarget,
    gateLevel:isJourney?(journey.levelNumber-1)*3+journey.encounterIndex+1:1});
  useEffect(()=>sound?.setTension(tension,{goalMet}),[tension,goalMet]);
  const total=s.dealTotals.reduce((a,b)=>a+b,0)+(s.status==='over'?0:d.T);
  const canFlip=legal.some(a=>a.type==='flip'),canBank=legal.some(a=>a.type==='bank');
  const wildCounts=isJourney?journeyWildBalance(journey):null;
  const nextCap=Math.max(2,d.handCap-(isJourney?journeyRules(journey).bankCapacityLoss:1)),mustDiscard=d.hand.filter(id=>royalRank(id)!=='K').length>nextCap;
  useEffect(()=>{setDiscardPick(false);setQueenPick(null);},[s.dealIndex,d.bankCount,s.status]);
  useEffect(()=>{setHistoryOpen(false);setPolarityPick(false);},
    [journey?.encounterIndex,journey?.retryCount,s.dealIndex]);
  const triggerWild=(wildId,index)=>{
    if(!journeyCanUseWild(journey,wildId))return;
    if(wildId==='polarity'){
      const card=d.hand[index];
      saveSteerSource(index,handContainerRef.current?.querySelector('[data-hand-card="'+card+'"]'));
    }
    sound?.unlock();
    onWild?.(wildId,index);
    setPolarityPick(false);
  };
  const doSteer=(index,element)=>{
    if(discardPick){
      if(legal.some(a=>a.type==='bank'&&a.dropIndex===index)){
        dispatch({type:'bank',dropIndex:index});setDiscardPick(false);
      }
    }else if(royalRank(d.hand[index])==='Q'){
      saveSteerSource(index,element);
      const safeDirections=legal.filter(a=>a.type==='steer'&&
        a.index===index&&Math.abs(d.S+a.direction*12)<=limit);
      if(safeDirections.length===1){
        dispatch({type:'steer',index,direction:safeDirections[0].direction});
      }else setQueenPick(index);
    }else if(legal.some(a=>a.type==='steer'&&a.index===index)){
      saveSteerSource(index,element);
      dispatch({type:'steer',index});
    }
  };
  const bank=()=>{if(mustDiscard){sound?.unlock();setDiscardPick(true);}else dispatch({type:'bank'});};
  const playQueen=direction=>{
    if(queenPick!=null&&legal.some(a=>a.type==='steer'&&a.index===queenPick&&a.direction===direction))
      dispatch({type:'steer',index:queenPick,direction});
    setQueenPick(null);
  };
  const guidedActionFirst=tutorial&&s.tutorialIntroDone&&(tutorialStep?.type==='flip'||tutorialStep?.type==='bank');
  const scoutedFlip=canFlip?d.scoutNext:null;
  const deckRemaining=Math.max(0,d.deck.length-d.pos);
  const actionButtons=<div className="os8-controls">
    <div className="os8-actions os8-actions-primary">
      <button type="button" ref={flipButtonRef} disabled={!canFlip||discardPick}
        className={'os8-flip '+(tutorial&&canFlip?'os8-guide-action':'')}
        onClick={()=>dispatch({type:'flip'})}>
        {scoutedFlip!=null?
          <span className={'os8-next-flip-card '+(suit(scoutedFlip)<2?'os8-next-red':'os8-next-black')}
            aria-label={'Next FLIP: '+name(scoutedFlip)+' '+val(signed(scoutedFlip))}>
            <strong>{name(scoutedFlip)}</strong><span>{val(signed(scoutedFlip))}</span>
          </span>:
          <span className="os8-action-icon" aria-hidden="true">▣?</span>}
        <b>FLIP</b>
        <small>{scoutedFlip!=null?'SCOUTED · NEXT CARD':rules.maxFlips?'USED '+d.flips+'/'+rules.maxFlips:'RANDOM CARD'}</small>
      </button>
      <button type="button" ref={bankButtonRef} disabled={!canBank||discardPick}
        className={'os8-bank '+(tutorial&&canBank?'os8-guide-action':'')} onClick={bank}>
        <span className="os8-action-icon" aria-hidden="true">▰</span><b>BANK</b>
        <small><GoldAmount value={payout} prefix="+"/></small>
      </button>
    </div>
    {isJourney&&<div className={'os8-abilities '+(isJourney?'os8-abilities-journey':'os8-abilities-quick')}
      aria-label="Wild Cards and revealed cards">
      {isJourney&&WILD_IDS.map(id=><button type="button" key={id}
        className={'os8-ability os8-wild-action os8-ability-'+id}
        title={WILD_RULES[id].description}
        aria-label={WILD_RULES[id].name+', '+wildCounts[id]+' remaining'}
        disabled={discardPick||!journeyCanUseWild(journey,id)}
        onClick={()=>id==='polarity'?setPolarityPick(true):triggerWild(id)}>
        <AbilityIcon kind={id}/>
        <span>{id==='shuffle'?'SHUFFLE':id==='polarity'?'POLARITY':'SHIELD'}</span>
        <b>{journey.wildUsedGate?'USED':'×'+wildCounts[id]}</b>
      </button>)}
      {isJourney&&<button type="button" ref={discardTargetRef} className="os8-ability os8-history-button"
        onClick={()=>setHistoryOpen(true)} aria-label="Reveal remaining deck for Gold"
        disabled={!revealOffer(journey)&&!journey.revealPurchaseCount}>
        <AbilityIcon kind="revealed"/>
        <span>REVEALED</span>
        <b>{revealOffer(journey)?
          <GoldAmount value={revealOffer(journey).price}/>:
          journey.revealPurchaseCount?'OWNED':'EMPTY'}</b>
      </button>}
    </div>}
  </div>;
  const multiplierDetails=<>
    <div className="os8-factors" aria-label="Multiplier details; tap for an explanation">
      <Factor id="swing" label="SWING" value={d.W+1}
        winning={multiplierBurst?.kind==='swing'}
        onClick={()=>setOpenFactor(openFactor==='swing'?null:'swing')} expanded={openFactor==='swing'}/>
      <Factor id="flip" label="FLIP" value={d.flipFactor}
        winning={multiplierBurst?.kind==='flip'}
        onClick={()=>setOpenFactor(openFactor==='flip'?null:'flip')} expanded={openFactor==='flip'}/>
      <Factor id="jackpot" label="JACKPOT" value={d.jackpotFactor}
        winning={multiplierBurst?.kind==='jackpot'}
        onClick={()=>setOpenFactor(openFactor==='jackpot'?null:'jackpot')} expanded={openFactor==='jackpot'}/>
      {multiplierBurst&&<MultiplierBurst key={multiplierBurst.serial} feedback={multiplierBurst}/>}
    </div>
    {openFactor&&FACTOR_HELP[openFactor]&&<div id="os8-factor-help" className="os8-factor-tooltip" role="region" aria-label={FACTOR_HELP[openFactor].title+' explanation'}>
      <div className="os8-tooltip-header"><strong >How {FACTOR_HELP[openFactor].title} works</strong><button type="button" aria-label="Close explanation" onClick={()=>setOpenFactor(null)}>×</button></div>
      <p>{FACTOR_HELP[openFactor].text}</p>
    </div>}
    {s.lastAction?.type==='flip'||s.lastAction?.type==='steer'?
      <span className="os8-flip-a11y" role="status" aria-live="polite">
        <Outcome e={s.lastAction}/>
      </span>:
      <div className={'os8-event '+(s.lastAction?.snap?'os8-snap':s.lastAction?.zeroBreak?'os8-zero-break':'')} role="status" aria-live="polite">
        {s.lastAction?.card!=null&&<Card id={s.lastAction.card} mini/>}
        <p><Outcome e={s.lastAction}/></p>
      </div>}
  </>;

  if(fullView&&helpOpen)return <section className="os8 os8-full os8-help-screen" aria-label="How to play Overswing">
    <div className="os8-help-heading"><h2>HOW TO PLAY</h2><button type="button" onClick={()=>setHelpOpen(false)}>✕ CLOSE</button></div>
    <h3>FLIP · STEER · BANK</h3>
    <p><b>FLIP</b> draws a random card into your Pot. <b>STEER</b> plays a card from your hand. <b>BANK</b> secures Pot points multiplied by SWING × FLIP × JACKPOT.</p>
    <h3>THE PENDULUM</h3>
    <p>Red cards move right (+), black cards left (−). Keep the meter between −10 and +10. Crossing zero grows SWING. Landing exactly on zero resets all multipliers.</p>
    <h3>MULTIPLIERS</h3>
    <p>Consecutive safe FLIPs build FLIP ×2, ×3, ×4… Crossing zero with a FLIP adds a JACKPOT tier. A noncrossing FLIP or STEER costs one SWING tier. SNAP loses your Pot.</p>
    <h3>THE JOURNEY</h3>
    <p>Follow the level map. Each level changes visible rules: hand size, SNAP limit, FLIP cap or BANK tax. Buy relics between gates or skip. Boss SNAPs increase the target.</p>
    <h3>WILD CARDS &amp; REVEALED</h3>
    <p>SHUFFLE, POLARITY and SHIELD are consumable Wild Cards. REVEALED lets
      you buy all remaining deck card identities, sorted by rank and suit—not draw order.
      The fewer cards remain, the higher the Gold price.</p>
    <button type="button" className="os8-help-return" onClick={()=>setHelpOpen(false)}>BACK TO GAME</button>
  </section>;
  return <div className={'os8'+(fullView?' os8-full':'')}>
    <header className="os8-head">
      <div className="os8-brand"><span>{tutorial?'GUIDED TRAINING':isJourney?'THE LAST FLAME':'V13 · ARCADE MODE'}</span><h2>OVER<span>SWING</span></h2></div>
      <div className="os8-settings">
        <OverswingSoundControls sound={sound}/>
        {fullView&&<button type="button" aria-label="How to play" title="How to play" onClick={()=>setHelpOpen(true)}>?</button>}
        {isJourney?<button type="button" title="Back to journey" onClick={onBack}>‹ MAP</button>:null}
        {!isJourney&&!tutorial&&<button className="os8-tutorial-launch" type="button" onClick={()=>{setDiscardPick(false);setOpenFactor(null);restart('tutorial');}}>TRAIN</button>}
        {!isJourney&&<select value={s.mode} aria-label="Game mode" onChange={e=>{setDiscardPick(false);setOpenFactor(null);restart(e.target.value);}}>
          <option value="short">QUICK</option><option value="match">3 DECKS</option><option value="tutorial">TRAIN</option>
        </select>}
        {!isJourney&&<button title="Restart" aria-label="Restart" onClick={()=>{setDiscardPick(false);restart(s.mode);}} type="button">↻</button>}
      </div>
    </header>
    {isJourney&&<section className="os8-journey-strip" aria-label="Current journey objective">
      <div className="os8-journey-top"><span>LEVEL {journey.levelNumber||1} · GATE {journey.encounterIndex+1}/3 · {LAST_FLAME.encounters[journey.encounterIndex].title}</span>
        <strong><GoldAmount value={d.T}/> / <GoldAmount value={journey.encounter.effectiveTarget}/></strong></div>
      <div className="os8-journey-track"><span style={{width:Math.min(100,d.T/journey.encounter.effectiveTarget*100)+'%'}}/></div>
      <div className="os8-journey-bottom"><span>{journey.encounterIndex===2?'BOSS · SNAP +200 GOAL':'♨ REACH THE GATE TARGET'}</span>
        <div>{journey.relicIds.map(id=><button key={id} type="button"
          title={LAST_FLAME_RELICS[id].description}
          className={'os8-relic-charge '+(journey.encounter.relicUses[id]?'os8-relic-spent':'')}
          onClick={()=>setOpenFactor(openFactor===id?null:id)}>{LAST_FLAME_RELICS[id].symbol}</button>)}</div>
      </div>
      <div className="os8-campaign-rules">
        <strong className="os8-campaign-snap">SNAP ±{limit}</strong>
        {campaignRuleLabels(campaignLevel(journey.levelNumber||1))
          .filter(x=>!x.startsWith('SNAP ')&&x!=='STANDARD RULES')
          .map(x=><span key={x}>{x}</span>)}
      </div>
      {journey.relicIds.includes(openFactor)&&<p className="os8-journey-relic-help">{LAST_FLAME_RELICS[openFactor]?.title}: {LAST_FLAME_RELICS[openFactor]?.description} {journey.encounter.relicUses[openFactor]?'(Used this gate)':'(Ready)'}</p>}
    </section>}
    <div className="os8-legend"><span className="os8-redtext">♥ ♦ POSITIVE</span><span>♠ ♣ NEGATIVE</span><span>0 = RESET</span><span>±{limit} = SNAP</span></div>
    <div className="os8-scoreline">
      <div ref={goldTargetRef}><small>{isJourney?'GATE GOLD':'GOLD'}</small><b><GoldAmount value={total}/></b></div>
      <div><small>♨ POT</small><b>{pot}</b></div>
      <div><small>× MULTIPLIER</small><b>×{multiplier.toLocaleString('en-US')}</b></div>
      <div><small>BANK NOW</small><b><GoldAmount value={payout} prefix="+"/></b></div>
    </div>
    {isJourney&&journey.wildShieldArmed&&<div className="os8-wild-armed" role="status">
      ◇ EMBER SHIELD ARMED · NEXT FLIP PROTECTED
    </div>}
    <section className="os8-meter" ref={meterRef} aria-label={'Swing '+val(d.S)}>
      <DoomFire className="os8-meter-fire" width={92} height={36}/>
      <FlameMeter position={d.S} limit={limit} action={s.lastAction}/>
      {impact&&<SwingImpact key={impact.serial} impact={impact}/>}
      <div className="os8-zero-warning">ZERO BREAK = RESET MULTIPLIERS · CROSS ZERO = SWING</div>
    </section>
    {tutorial&&<section className="os8-tutorial" aria-live="polite" aria-label="Required tutorial step">
      {!s.tutorialIntroDone?<div className="os8-tutorial-intro">
        <div className="os8-tutorial-head"><strong>FOUR BASICS</strong><span>BEFORE YOU PLAY</span></div>
        <div className="os8-tutorial-glossary">
          {OVERSWING_TUTORIAL_INTRO.map(item=><div className="os8-tutorial-term" key={item.term}>
            <strong>{item.term}</strong><span>=</span><span>{item.text}</span>
          </div>)}
        </div>
        <button type="button" className="os8-start-tutorial" onClick={()=>dispatch({type:'tutorial-start'})}>GOT IT — START</button>
      </div>:tutorialStep?<><div className="os8-tutorial-head"><strong>STEP {s.tutorialStep+1} / {OVERSWING_TUTORIAL_STEPS.length}</strong><span>FOLLOW THE HIGHLIGHT</span></div>
        <div className="os8-tutorial-progress"><span style={{width:((s.tutorialStep+1)/OVERSWING_TUTORIAL_STEPS.length*100)+'%'}}/></div>
        <h3>{tutorialStep.title}</h3>
        <p>{discardPick?'Choose the highlighted card to finish banking.':tutorialStep.instruction}</p>
        <small>{tutorialStep.why}</small>
      </>:<><h3>TUTORIAL COMPLETE!</h3><p>You know all three multipliers, the STEER cost, and the risks. Ready to play?</p>
        <button type="button" onClick={()=>restart('short')}>PLAY A GAME</button>
        <button type="button" onClick={()=>restart('tutorial')}>REPLAY TUTORIAL</button>
      </>}
      {tutorialStep&&s.tutorialIntroDone&&<button type="button" className="os8-tutorial-exit" onClick={()=>restart('short')}>EXIT TUTORIAL</button>}
    </section>}
    {guidedActionFirst&&actionButtons}
    {multiplierDetails}
    <section ref={potSectionRef} className={'os8-pot'+(potCrack?' os8-pot-breaking':'')}>
      <div className="os8-section-heading"><h3>♨ POT CARDS</h3><span>{d.pot.length} cards · {pot} pts</span></div>
      <div className="os8-potcards" ref={potTargetRef}>
        {(fullView?d.pot.slice(-6):d.pot).map(c=>
          <Card key={c} id={c} mini potCard
            flightHidden={flight?.destination==='pot'&&flight.card===c}/>)}
        {fullView&&d.pot.length>6&&
          <span className="os8-pot-overflow" aria-label={(d.pot.length-6)+' more cards'}>+{d.pot.length-6}</span>}
        {!d.pot.length&&<span className="os8-empty">EMPTY</span>}
      </div>
    </section>
    <section className="os8-hand">
      <div className="os8-section-heading"><h3>{discardPick?'BANK · REMOVE 1 CARD':'YOUR HAND · STEER'}</h3><span>DECK {deckRemaining} · HAND {d.hand.length}/{d.handCap}{discardPick?' · BANK CAP '+nextCap:''}</span></div>
      {discardPick&&<p className="os8-attention">Hand limit {d.handCap} → {nextCap}. {tutorial?'Remove only the highlighted card.':'Tap the card to discard.'} <button type="button" onClick={()=>setDiscardPick(false)}>CANCEL</button></p>}
      <div className="os8-handcards" ref={handContainerRef}>
        {d.hand.map((id,index)=>{
          const o=applySwing(d.S,d.W,signed(id),limit);
          const royal=royalRank(id);
          const caption=discardPick?'REMOVE':royal==='K'?'CROWN +'+(d.crownBonus||0)+'%':royal==='J'?'SCOUT':royal==='Q'?'±12':o.snap?'SNAP':d.S!==0&&o.S===0?'ZERO BREAK':d.plays===0||o.swung?'POT +'+rank(id):d.W>0?'SWING −1':'DISCARD';
          const allowed=discardPick?legal.some(a=>a.type==='bank'&&a.dropIndex===index):legal.some(a=>a.type==='steer'&&a.index===index);
          const highlighted=tutorial&&allowed;
          return <Card key={id} id={id} handCard chosen={highlighted||(!tutorial&&discardPick)}
            onClick={allowed?event=>doSteer(index,event.currentTarget):null} caption={caption}/>;
        })}
        {!d.hand.length&&<p className="os8-empty">No cards in hand. It refills automatically when deck cards remain.</p>}
      </div>
    </section>
    {!guidedActionFirst&&actionButtons}
    <footer className="os8-footer">
      <span>{s.mode==='match'?'Deck '+(s.dealIndex+1)+'/3 · ':''}{d.pos}/{d.deck.length} drawn</span>
      <details><summary>Rules & multipliers</summary>
        <p>Start with up to 8 cards. Hearts and diamonds move right (+); spades and clubs move left (−). Exceed the level's SNAP limit and lose the Pot.</p>
        <p>FLIP draws a random card into the Pot. Consecutive safe FLIPs grow FLIP: ×2, ×3, ×4… Crossing zero counts.</p>
        <p>Crossing zero with FLIP raises SWING and adds +1 JACKPOT tier. A noncrossing FLIP lowers SWING by 1 and keeps JACKPOT unchanged.</p>
        <p>ZERO BREAK: Land exactly on zero to reset all multipliers to ×1, but keep the Pot. SNAP: Go outside ±{limit} and lose the Pot.</p>
        <p>STEER ends the current FLIP streak but preserves FLIP and JACKPOT tiers. Every noncrossing FLIP or STEER costs 1 SWING tier (minimum ×1).</p>
        <p>The first STEER of a Pot, crossing STEER, and ZERO BREAK STEER enter the Pot; other STEER cards are discarded.</p>
        <p>BANK becomes available after at least 2 card actions. Each BANK reduces hand capacity from 8 toward 2 (unless a relic prevents it). Choose which card to discard if necessary.</p>
        <p>An empty hand refills automatically from the remaining deck, up to its capacity.</p>
      </details>
    </footer>
    {flight&&<FlipFlight flight={flight} onFinish={serial=>
      setFlight(current=>current?.serial===serial?null:current)}/>}
    {coinBurst&&<BankCoinBurst burst={coinBurst} onFinish={serial=>
      setCoinBurst(current=>current?.serial===serial?null:current)}/>}
    {potCrack&&<PotCrack key={potCrack.serial} crack={potCrack} onFinish={serial=>
      setPotCrack(current=>current?.serial===serial?null:current)}/>}
    {historyOpen&&isJourney&&<RevealedCards deal={d} run={journey}
      onPurchase={()=>onReveal?.()} onClose={()=>setHistoryOpen(false)}/>}
    {polarityPick&&isJourney&&<div className="os8-wild-overlay" role="presentation">
      <div className="os8-wild-modal" role="dialog" aria-modal="true"
        aria-labelledby="os8-polarity-title">
        <div className="os8-wild-heading">
          <h3 id="os8-polarity-title">POLARITY SWITCH</h3>
          <button type="button" onClick={()=>setPolarityPick(false)}
            aria-label="Cancel Polarity Switch">✕</button>
        </div>
        <p>Pick an ordinary card to reverse its sign and STEER immediately.</p>
        <div className="os8-wild-polarity-cards">
          {d.hand.map((id,index)=>id<40&&
            <button key={id} type="button" onClick={()=>triggerWild('polarity',index)}
              aria-label={'Reverse and STEER '+name(id)}>
              <strong>{name(id)}</strong>
              <span>{val(signed(id))} → {val(-signed(id))}</span>
              <small>{Math.abs(d.S-signed(id))>limit?'SNAP':
                d.S-signed(id)===0&&d.S!==0?'ZERO BREAK':'STEER'}</small>
            </button>)}
        </div>
        <button className="os8-wild-cancel" type="button" onClick={()=>setPolarityPick(false)}>
          CANCEL
        </button>
      </div>
    </div>}
    {queenPick!==null&&<div className="os8-queen-overlay" role="presentation">
      <div className="os8-queen-modal" role="dialog" aria-modal="true" aria-label="Choose Queen direction">
        <h3>Q · THE MIRROR</h3><p>Choose the pendulum direction. A safe crossing adds 12 Pot points.</p>
        <div className="os8-queen-choices">
          <button type="button" onClick={()=>playQueen(-1)}>← −12 <small>{d.S-12<-limit?'SNAP':'SAFE'}</small></button>
          <button type="button" onClick={()=>playQueen(1)}>+12 → <small>{d.S+12>limit?'SNAP':'SAFE'}</small></button>
        </div>
        <button type="button" className="os8-queen-cancel" onClick={()=>setQueenPick(null)}>CANCEL</button>
      </div>
    </div>}
    {!isJourney&&s.status==='over'&&<div className="os8-complete"><h3>{tutorial?'TRAINING COMPLETE':'DEAL COMPLETE'}</h3><b><GoldAmount value={s.dealTotals.reduce((a,b)=>a+b,0)} size="lg" showLabel/></b><button type="button" onClick={()=>restart(s.mode)}>PLAY AGAIN</button></div>}
  </div>;
}
