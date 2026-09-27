import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'voidbook.v2';

export const DEFAULT_STATE = {
  users: [
    { id:'u1', name:'VOID AI',  handle:'@voidai',    bio:'The blackest social layer.' },
    { id:'u2', name:'Jacob',    handle:'@jvoidial',  bio:'Building in the void.' },
    { id:'u3', name:'Nova',     handle:'@nova',      bio:'Signals from the dark.' },
    { id:'u4', name:'Rhea',     handle:'@rhea',      bio:'Designing black UIs.' },
    { id:'u5', name:'Kai',      handle:'@kai',       bio:'Shipping daily.' }
  ],
  posts: [
    { id:'p1', userId:'u1', content:'Welcome to VOIDBOOK. The blackest social layer. 🖤 #VOIDBOOK', likes:88, comments:[], shares:4, ts: Date.now()-120000 },
    { id:'p2', userId:'u2', content:'Python3 CI pipelines are clean. #buildinpublic', likes:34, comments:[], shares:2, ts: Date.now()-900000 },
    { id:'p3', userId:'u3', content:'Signals from the dark. New drop soon. #crypto', likes:12, comments:[], shares:1, ts: Date.now()-1800000 },
    { id:'p4', userId:'u4', content:'Pure black aesthetics done right. #design', likes:56, comments:[], shares:8, ts: Date.now()-3600000 }
  ],
  stories: [
    { id:'s1', userId:'u2', ts: Date.now()-3600000, seen:false },
    { id:'s2', userId:'u3', ts: Date.now()-7200000, seen:false },
    { id:'s3', userId:'u4', ts: Date.now()-10800000, seen:false }
  ],
  friends: {
    friends:['u2','u3'],
    requests:[{ id:'r1', userId:'u5', ts: Date.now()-600000 }],
    suggestions:['u4','u5']
  },
  conversations: [
    { id:'c1', withUserId:'u2', messages:[
      { id:'m1', from:'u2', text:'Yo, VOIDBOOK is live 🔥', ts: Date.now()-60000 },
      { id:'m2', from:'me', text:'Let\'s gooo', ts: Date.now()-30000 }
    ]},
    { id:'c2', withUserId:'u3', messages:[
      { id:'m3', from:'u3', text:'New drop?', ts: Date.now()-300000 }
    ]}
  ],
  notifications: [
    { id:'n1', type:'like',           userId:'u2', postId:'p1', ts: Date.now()-60000,  read:false },
    { id:'n2', type:'friend_request', userId:'u5',              ts: Date.now()-300000, read:false },
    { id:'n3', type:'comment',        userId:'u3', postId:'p1', ts: Date.now()-600000, read:true  }
  ],
  groups: [
    { id:'g1', name:'VOID Developers', members:1240, joined:false, desc:'Builders shipping in the void.' },
    { id:'g2', name:'Black UI Design', members:880,  joined:true,  desc:'Pure black aesthetics.' }
  ],
  listings: [
    { id:'l1', title:'iPhone 15 Pro',      price:850, sellerId:'u2', desc:'Mint, VOID black.' },
    { id:'l2', title:'Mechanical Keyboard',price:120, sellerId:'u4', desc:'Hot-swap, no RGB.' }
  ],
  watch: [
    { id:'w1', userId:'u1', title:'Building VOIDBOOK in 60s', views:12400, ts: Date.now()-3600000, live:false },
    { id:'w2', userId:'u2', title:'Python CI in the terminal', views:5600,  ts: Date.now()-7200000, live:false }
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
