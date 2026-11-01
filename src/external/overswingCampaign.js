// Persistent, Candy-Crush-style route: each node is one three-gate journey.
// Constraints are level-wide and displayed before entry; no hidden difficulty.
const stages=[
  ['first_ember','FIRST EMBER','Learn the fire',{}],
  ['short_fuse','SHORT FUSE','A smaller hand',{maxHandSize:7}],
  ['narrow_path','NARROW PATH','Stay inside ±9',{snapLimit:9}],
  ['flip_discipline','FLIP DISCIPLINE','Only 18 FLIPs',{maxFlips:18}],
  ['toll_bridge','TOLL BRIDGE','BANK pays a 5% toll',{bankTax:5}],
  ['tight_grip','TIGHT GRIP','Start with 6 cards',{maxHandSize:6}],
  ['iron_walls','IRON WALLS','Pendulum restricted to ±8',{snapLimit:8}],
  ['scarce_chances','SCARCE CHANCES','Only 14 FLIPs',{maxFlips:14}],
  ['high_toll','HIGH TOLL','BANK pays a 10% toll',{bankTax:10}],
  ['fire_cage','FIRE CAGE','Small hand and tight swing',{maxHandSize:6,snapLimit:9}],
  ['final_wager','FINAL WAGER','FLIP capped; BANK taxed',{maxFlips:14,bankTax:10}],
  ['last_light','LAST LIGHT','Master all constraints',{maxHandSize:6,snapLimit:8,maxFlips:12,bankTax:15}]
];
export const CAMPAIGN_LEVELS=Object.freeze(stages.map(([id,title,subtitle,rules],i)=>Object.freeze({
  id,number:i+1,title,subtitle,rules:Object.freeze(rules),
  // Mild increase; the rule changes are the main progression, not target inflation.
  targetScale:1+i*0.015
})));
export const campaignLevel=number=>CAMPAIGN_LEVELS[number-1]||null;
export const campaignNextLevel=cleared=>{
  const clearedSet=new Set(cleared||[]);
  return CAMPAIGN_LEVELS.find(level=>!clearedSet.has(level.id))?.number||CAMPAIGN_LEVELS.length;
};
export function campaignRuleLabels(level){
  if(!level)return [];
  const r=level.rules,labels=[];
  if(r.maxHandSize)labels.push('HAND '+r.maxHandSize);
  if(r.snapLimit)labels.push('SNAP ±'+r.snapLimit);
  if(r.maxFlips)labels.push('FLIP ≤'+r.maxFlips);
  if(r.bankTax)labels.push('BANK TAX '+r.bankTax+'%');
  return labels.length?labels:['STANDARD RULES'];
}
