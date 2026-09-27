import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'voidbook.v5';

export const DEFAULT_STATE = {
  users: [
    { id:'u1', name:'VOID AI', handle:'@voidai',   bio:'The blackest social layer.',       followers:12800, following:12,  verified:true,  cover:null, location:'The Void' },
    { id:'u2', name:'Jacob',   handle:'@jvoidial', bio:'Building in the void.',            followers:342,   following:88,  verified:true,  cover:null, location:'London' },
    { id:'u3', name:'Nova',    handle:'@nova',     bio:'Signals from the dark.',           followers:880,   following:42,  verified:false, cover:null, location:'Berlin' },
    { id:'u4', name:'Rhea',    handle:'@rhea',     bio:'Designing black UIs.',             followers:560,   following:120, verified:false, cover:null, location:'NYC' },
    { id:'u5', name:'Kai',     handle:'@kai',      bio:'Shipping daily. Building in public.', followers:210, following:34, verified:false, cover:null, location:'Tokyo' }
  ],
  posts: [
    { id:'p1', userId:'u1', content:'Welcome to VOIDBOOK. The blackest social layer. #VOIDBOOK #launch', likes:1288, comments:[{id:'c1',userId:'u2',text:'🔥🔥🔥',ts:Date.now()-30000}], shares:44, ts: Date.now()-120000 },
    { id:'p2', userId:'u2', content:'Python3 CI pipelines are clean. Building the future in public. #buildinpublic', likes:34, comments:[], shares:2, ts: Date.now()-900000 },
    { id:'p3', userId:'u3', content:'Signals from the dark. New drop soon. #crypto #web3', likes:112, comments:[], shares:11, ts: Date.now()-1800000 },
    { id:'p4', userId:'u4', content:'Pure black aesthetics done right. #design #VOIDBOOK', likes:256, comments:[], shares:28, ts: Date.now()-3600000 }
  ],
  stories: [
    { id:'s1', userId:'u2', ts: Date.now()-3600000, seen:false },
    { id:'s2', userId:'u3', ts: Date.now()-7200000, seen:false },
    { id:'s3', userId:'u4', ts: Date.now()-10800000, seen:false },
    { id:'s4', userId:'u5', ts: Date.now()-14400000, seen:false }
  ],
  friends: {
    friends:['u2','u3'],
    requests:[{ id:'r1', userId:'u5', ts: Date.now()-600000 }],
    suggestions:['u4','u5']
  },
  follows: { following:['u1','u2','u3'] },
  bookmarks: [],
  drafts: [],
  reports: [],
  conversations: [
    { id:'c1', withUserId:'u2', messages:[
      { id:'m1', from:'u2', text:'Yo, VOIDBOOK is live', ts: Date.now()-60000, read:true },
      { id:'m2', from:'me', text:'Lets gooo', ts: Date.now()-30000, read:true }
    ]},
    { id:'c2', withUserId:'u3', messages:[
      { id:'m3', from:'u3', text:'New drop?', ts: Date.now()-300000, read:false }
    ]}
  ],
  notifications: [
    { id:'n1', type:'like', userId:'u2', postId:'p1', ts: Date.now()-60000, read:false },
    { id:'n2', type:'friend_request', userId:'u5', ts: Date.now()-300000, read:false },
    { id:'n3', type:'comment', userId:'u3', postId:'p1', ts: Date.now()-600000, read:true }
  ],
  groups: [
    { id:'g1', name:'VOID Developers', members:12400, joined:false, desc:'Builders shipping in the void.' },
    { id:'g2', name:'Black UI Design', members:8800, joined:true, desc:'Pure black aesthetics.' }
  ],
  listings: [
    { id:'l1', title:'iPhone 15 Pro', price:850, sellerId:'u2', desc:'Mint, VOID black.' },
    { id:'l2', title:'Mechanical Keyboard', price:120, sellerId:'u4', desc:'Hot-swap, no RGB.' }
  ],
  watch: [
    { id:'w1', userId:'u1', title:'Building VOIDBOOK in 60s', views:12400, ts: Date.now()-3600000, live:false },
    { id:'w2', userId:'u2', title:'Python CI in the terminal', views:5600, ts: Date.now()-7200000, live:false }
  ],
  settings: { darkMode:true, privateAccount:false, notificationsOn:true }
};

export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch { return DEFAULT_STATE; }
}
export async function saveState(s) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}
