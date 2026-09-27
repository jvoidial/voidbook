const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const app = express();
app.use(cors()); app.use(express.json());

const db = {
  users: [
    { id:'u2', name:'Jacob', handle:'@jvoidial', bio:'Building in the void.' },
    { id:'u3', name:'VOID AI', handle:'@voidai', bio:'The blackest social layer.' },
    { id:'u4', name:'Nova', handle:'@nova', bio:'Signals from the dark.' }
  ],
  posts: [
    { id:'p1', userId:'u3', content:'Welcome to VOIDBOOK. 🖤', likes:88, comments:[], shares:4, ts:Date.now() },
    { id:'p2', userId:'u2', content:'Python3 CI pipelines are clean.', likes:34, comments:[], shares:2, ts:Date.now() }
  ],
  groups: [{ id:'g1', name:'VOID Developers', members:1240, joined:false }],
  listings: [{ id:'l1', title:'iPhone 15 Pro', price:850, sellerId:'u2' }],
  watch: [{ id:'w1', userId:'u3', title:'Building VOIDBOOK in 60s', views:12400 }],
  conversations: [],
  notifications: []
};

app.get('/api/health', (_,r)=>r.json({ok:true,app:'VOIDBOOK'}));
app.get('/api/feed', (_,r)=>r.json(db.posts));
app.post('/api/posts', (q,r)=>{
  const p = { id:nanoid(8), userId:'me', content:q.body.content,
              likes:0, comments:[], shares:0, ts:Date.now() };
  db.posts.unshift(p); r.status(201).json(p);
});
app.get('/api/users', (_,r)=>r.json(db.users));
app.get('/api/groups', (_,r)=>r.json(db.groups));
app.get('/api/marketplace', (_,r)=>r.json(db.listings));
app.get('/api/watch', (_,r)=>r.json(db.watch));
app.listen(3000, ()=>console.log('[VOIDBOOK] backend :3000'));
