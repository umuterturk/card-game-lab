// Data-only journey pack. New encounters/relics should not change the run coordinator.
export const LAST_FLAME={
  id:'last_flame_v1',version:1,title:'THE LAST FLAME',
  subtitle:'Carry the last ember through the dark.',
  encounters:[
    {id:'ash_gate',title:'ASH GATE',kind:'normal',target:800,subtitle:'Ignite the path.',symbol:'♨'},
    {id:'the_furnace',title:'THE FURNACE',kind:'normal',target:1800,subtitle:'Keep the fire alive.',symbol:'✦'},
    {id:'ember_keeper',title:'EMBER KEEPER',kind:'boss',target:3000,
      subtitle:'The flames demand a price.',symbol:'♛',
      objective:{type:'snap_target_tax',pointsPerSnap:200}}
  ],
  relics:[
    {id:'steady_hand',title:'STEADY HAND',symbol:'✥',category:'control',
      description:'First noncrossing STEER this gate costs no SWING.',
      effect:'first_noncross_steer_free'},
    {id:'jackpot_spark',title:'JACKPOT SPARK',symbol:'✦',category:'risk',
      description:'First FLIP crossing this gate grants +1 extra JACKPOT.',
      effect:'first_flip_cross_extra_jackpot'},
    {id:'vault_seal',title:'VAULT SEAL',symbol:'▣',category:'bank',
      description:'First BANK this gate keeps your hand capacity.',
      effect:'first_bank_keep_capacity'},
    {id:'swing_coil',title:'SWING COIL',symbol:'↯',category:'control',
      description:'First STEER crossing this gate gains +1 extra SWING.',
      effect:'first_steer_cross_extra_swing'}
  ],
  rewards:{offerCount:3,pickCount:1,maxPerGate:1}
};
export const LAST_FLAME_RELICS=Object.fromEntries(LAST_FLAME.relics.map(relic=>[relic.id,relic]));
export const LAST_FLAME_ENCOUNTERS=Object.fromEntries(LAST_FLAME.encounters.map(encounter=>[encounter.id,encounter]));
