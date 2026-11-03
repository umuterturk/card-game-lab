import React from 'react';
import {EnemyPortrait} from './OverswingEnemy.jsx';
import {opponentForLevel} from './overswingEnemies.js';
import {campaignLevel,campaignRuleLabels} from './overswingCampaign.js';
import {LAST_FLAME,LAST_FLAME_RELICS} from './overswingJourneyContent.js';
import {journeyGoldBalance,journeyRelicPrice} from './overswingJourney.js';
import GoldAmount from './GoldCoin.jsx';
import './overswingGateBriefing.css';

const SHORT_RELICS=Object.freeze({
  steady_hand:'FREE STEER ×1',
  jackpot_spark:'JACKPOT +1',
  vault_seal:'KEEP HAND ×1',
  swing_coil:'SWING +1'
});
export default function OverswingGateBriefing({run,ready=true,onBuy,onSkip,onBack,pendingPurchase=null}){
  const level=campaignLevel(run.levelNumber),enemy=opponentForLevel(run.levelNumber);
  const gateIndex=run.shopForGate??run.encounterIndex+1;
  const gate=LAST_FLAME.encounters[gateIndex],price=journeyRelicPrice(run);
  const balance=journeyGoldBalance(run),canAfford=balance>=price;
  return <main className="oj-shell og-briefing">
    <button type="button" className="oj-back og-back" onClick={onBack} disabled={!!pendingPurchase}>‹ MAP</button>
    <div className="og-portrait">
      <EnemyPortrait level={run.levelNumber} alt=""/>
      <div className="og-portrait-shade"/>
      <div className="og-caption">
        <small>LEVEL {run.levelNumber} · GATE {gateIndex+1}/3</small>
        <h2>{enemy.name}</h2>
      </div>
    </div>
    <div className={'og-panel'+(ready?' og-panel-visible':'')} aria-label="Rules and relics">
      <div className="og-top">
        <strong>{gate.title}</strong>
        <span>TARGET <GoldAmount value={Math.round(gate.target*level.targetScale)}/></span>
      </div>
      <div className="og-rules">{campaignRuleLabels(level).map(label=>
        <span key={label}>{label}</span>)}</div>
      <div className="og-wallet">
        <span>RELIC · <GoldAmount value={price}/></span>
        <strong data-oj-treasury><GoldAmount value={balance}/></strong>
      </div>
      <div className="og-relics">{run.offeredRelicIds.map(id=>{
        const relic=LAST_FLAME_RELICS[id];
        return <button key={id} type="button" className={'og-relic'+(pendingPurchase==='relic:'+id?' og-relic-buying':'')}
          disabled={!canAfford||!!pendingPurchase} onClick={e=>onBuy(id,e.currentTarget)}
          title={relic.description}
          aria-label={'Buy '+relic.title+' for '+price+' Gold and enter gate'}>
          <b>{relic.symbol}</b><strong>{relic.title}</strong>
          <small>{SHORT_RELICS[id]}</small>
          <span>{pendingPurchase==='relic:'+id?'PURCHASING':canAfford?'BUY':'LOCKED'}</span>
        </button>;
      })}</div>
      <button type="button" className="oj-primary og-fight" onClick={onSkip} disabled={!!pendingPurchase}>
        FIGHT WITHOUT RELIC ›
      </button>
    </div>
  </main>;
}
