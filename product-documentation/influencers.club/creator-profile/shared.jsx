/* Shared helpers + chart components for all 5 platform pages.
   Loaded as type="text/babel". Exposes globals via window. */
const { useEffect, useState } = React;

const PLATFORMS = {
  instagram: { label: 'Instagram', color: '#E4405F', bg: 'linear-gradient(135deg,#feda77,#f58529,#dd2a7b,#8134af,#515bd4)', file: 'instagram.html' },
  tiktok: { label: 'TikTok', color: '#FE2C55', bg: 'linear-gradient(135deg,#25F4EE,#000,#FE2C55)', file: 'tiktok.html' },
  twitch: { label: 'Twitch', color: '#9146FF', bg: '#9146FF', file: 'twitch.html' },
  twitter: { label: 'X (Twitter)', color: '#000', bg: '#000', file: 'twitter.html' },
  youtube: { label: 'YouTube', color: '#FF0033', bg: '#FF0033', file: 'youtube.html' },
};

const PlatformIcon = ({ p, size = 14, color = 'currentColor' }) => {
  const s = size;
  if (p === 'instagram') return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill={color}/></svg>;
  if (p === 'tiktok') return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M19.6 6.4a5.5 5.5 0 0 1-3.5-1.4 5.4 5.4 0 0 1-1.6-3H11v12.5a2.7 2.7 0 1 1-2.7-2.7v-3.4a6 6 0 1 0 6 6V9.4a8.4 8.4 0 0 0 5.3 1.8V7.7c-.7 0-1.3-.4-2.1-1.3z"/></svg>;
  if (p === 'twitch') return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M4 2 2 6v14h5v3h3l3-3h4l5-5V2H4zm17 11-3 3h-5l-3 3v-3H6V4h15v9zM18 7v6h-2V7h2zm-5 0v6h-2V7h2z"/></svg>;
  if (p === 'twitter') return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M18.244 2H21l-6.51 7.44L22 22h-6.18l-4.84-6.32L5.4 22H2.64l6.96-7.95L2 2h6.32l4.37 5.78L18.24 2z"/></svg>;
  if (p === 'youtube') return <svg width={s} height={s} viewBox="0 0 24 24" fill={color}><path d="M23 7.6s-.2-1.6-.9-2.3c-.9-.9-1.8-.9-2.3-1C16.5 4 12 4 12 4s-4.5 0-7.8.3c-.5.1-1.4.1-2.3 1C1.2 6 1 7.6 1 7.6S.7 9.5.7 11.4v1.8c0 1.9.3 3.8.3 3.8s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.6.3 7.6.3s4.5 0 7.8-.3c.5-.1 1.4-.1 2.3-1 .7-.7.9-2.3.9-2.3s.3-1.9.3-3.8v-1.8c0-1.9-.3-3.8-.3-3.8zM9.7 15.2V8.4l5.8 3.4-5.8 3.4z"/></svg>;
  return null;
};

const formatNum = (n) => {
  if (n == null || isNaN(n)) return '—';
  n = Number(n);
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + 'K';
  return Math.round(n).toLocaleString();
};
const formatPct = (n, d = 1) => (n == null ? '—' : (Number(n) < 1 && Number(n) > 0 ? Number(n)*100 : Number(n)).toFixed(d) + '%');
const formatPctRaw = (n, d = 2) => (n == null ? '—' : Number(n).toFixed(d) + '%');
const formatDate = (s) => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
const flagEmoji = (cc) => { if (!cc || cc.length !== 2) return cc || '··'; const A = 0x1F1E6; return String.fromCodePoint(A + cc.toUpperCase().charCodeAt(0) - 65, A + cc.toUpperCase().charCodeAt(1) - 65); };
const fmtDuration = (s) => { if (!s) return '—'; if (typeof s === 'string' && s.startsWith('PT')) { const m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); if (m) { const h=+m[1]||0,mn=+m[2]||0,sc=+m[3]||0; return h?`${h}h ${mn}m`:`${mn}:${String(sc).padStart(2,'0')}`; }} return `${s}s`; };

// === Charts ===
const Donut = ({ data, size = 120, thickness = 16, colors }) => {
  const total = data.reduce((s, d) => s + (d.value||0), 0) || 1;
  const r = (size - thickness) / 2; const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0eee5" strokeWidth={thickness} />
      {data.map((d, i) => {
        const dash = ((d.value||0) / total) * c;
        const el = <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={colors[i % colors.length]} strokeWidth={thickness} strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}/>;
        offset += dash; return el;
      })}
    </svg>
  );
};

const Sparkline = ({ values, height = 60, color = '#2f6b3a' }) => {
  if (!values || values.length === 0) return <div className="empty">No data</div>;
  const W = 480, H = height;
  const max = Math.max(...values), min = Math.min(...values), range = max - min || 1;
  const stepX = W / Math.max(1, values.length - 1);
  const points = values.map((v, i) => [i * stepX, H - ((v - min) / range) * (H - 4) - 2]);
  const d = points.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={d + ` L ${W} ${H} L 0 ${H} Z`} fill={color} fillOpacity="0.12"/>
      <path d={d} stroke={color} strokeWidth="1.8" fill="none"/>
      {points.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === points.length-1 ? 3 : 2} fill={color}/>)}
    </svg>
  );
};

const ScatterPlot = ({ posts, xKey, yKey, xLabel, yLabel, height = 220 }) => {
  if (!posts?.length) return <div className="empty">No data</div>;
  const xs = posts.map(p => p[xKey] || 0), ys = posts.map(p => p[yKey] || 0);
  const xMax = Math.max(...xs) || 1, yMax = Math.max(...ys) || 1;
  const W = 480, H = height, pad = 32;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{display:'block'}}>
      <line x1={pad} y1={H-pad} x2={W-10} y2={H-pad} stroke="#e7e5dc"/>
      <line x1={pad} y1={10} x2={pad} y2={H-pad} stroke="#e7e5dc"/>
      {[0.25, 0.5, 0.75].map(t => <line key={t} x1={pad} y1={H-pad-t*(H-pad-10)} x2={W-10} y2={H-pad-t*(H-pad-10)} stroke="#e7e5dc" strokeDasharray="2 4"/>)}
      {posts.map((p, i) => {
        const x = pad + ((p[xKey]||0)/xMax)*(W-pad-10);
        const y = H - pad - ((p[yKey]||0)/yMax)*(H-pad-10);
        return <circle key={i} cx={x} cy={y} r="5" fill="#2f6b3a" fillOpacity=".55" stroke="#2f6b3a" strokeWidth="1"/>;
      })}
      <text x={W-10} y={H-10} textAnchor="end" fill="#777970" fontSize="10" fontFamily="JetBrains Mono">{xLabel} →</text>
      <text x={pad+4} y={16} fill="#777970" fontSize="10" fontFamily="JetBrains Mono">↑ {yLabel}</text>
    </svg>
  );
};

const PostingHeatmap = ({ posts }) => {
  const grid = Array.from({length:7}, () => Array(24).fill(0));
  (posts || []).forEach(p => {
    const dt = p.created_at || p.published_at;
    if (!dt) return;
    const d = new Date(dt); if (isNaN(d)) return;
    grid[d.getDay()][d.getHours()]++;
  });
  const max = Math.max(...grid.flat()) || 1;
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <div>
      <div className="heatmap">
        <div className="h-d"></div>
        {Array.from({length:24}).map((_, h) => <div className="h-h" key={h}>{h%6===0?h:''}</div>)}
        {grid.map((row, di) => (
          <React.Fragment key={di}>
            <div className="h-d">{days[di]}</div>
            {row.map((v, hi) => (
              <div className="cell" key={hi} style={{background: v===0 ? 'rgba(47,107,58,.04)' : `rgba(47,107,58,${0.18 + (v/max)*0.82})`}} title={`${days[di]} ${hi}:00 · ${v} post${v===1?'':'s'}`}/>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const SectionH = ({ title, badge, right }) => (
  <div className="section-h">
    <h2>{title}</h2><div className="line"/>
    {badge && <span className="badge">{badge}</span>}
    {right}
  </div>
);
const CardH = ({ title, desc, right }) => (
  <div className="card-h">
    <div><h3>{title}</h3>{desc && <div className="desc">{desc}</div>}</div>
    {right && <div className="right">{right}</div>}
  </div>
);

const AgePyramid = ({ ages, gendersPerAge }) => {
  const order = ['13-17','18-24','25-34','35-44','45-64','65-'];
  const rows = order.map(code => {
    const a = ages?.find(x=>x.code===code)?.weight || 0;
    const g = gendersPerAge?.find(x=>x.code===code);
    return { code, male: g?.male ?? a*0.55, female: g?.female ?? a*0.45 };
  });
  const max = Math.max(...rows.map(r => Math.max(r.male, r.female))) || 1;
  return (
    <div>
      <div className="gender-key">
        <div className="k"><span className="swatch" style={{background:'#355bff'}}/>Male</div>
        <div className="k"><span className="swatch" style={{background:'#d63384'}}/>Female</div>
      </div>
      <div className="pyramid" style={{marginTop:10}}>
        {rows.map(r => (
          <div className="row" key={r.code}>
            <div className="lhs"><span className="v">{(r.male*100).toFixed(1)}%</span><div className="bar" style={{width:`${(r.male/max)*100}%`}}/></div>
            <div className="age">{r.code==='65-'?'65+':r.code}</div>
            <div className="rhs"><div className="bar" style={{width:`${(r.female/max)*100}%`}}/><span className="v">{(r.female*100).toFixed(1)}%</span></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BarsList = ({ data, formatter = formatNum, gradient }) => {
  if (!data?.length) return <div className="empty">No data</div>;
  const max = Math.max(...data.map(d => d.value)) || 1;
  return (
    <div className="bars">
      {data.map((d, i) => (
        <div className="bar-row" key={i}>
          <div className="lbl" title={d.label}>{d.label}</div>
          <div className="track"><div className="fill" style={{width:`${(d.value/max)*100}%`, background: gradient}}/></div>
          <div className="val">{formatter(d.value)}</div>
        </div>
      ))}
    </div>
  );
};

const CountryList = ({ data, formatter = (v) => (v*100).toFixed(1)+'%' }) => {
  if (!data?.length) return <div className="empty">No geo data</div>;
  const max = Math.max(...data.map(d => d.weight)) || 1;
  return (
    <div>
      {data.slice(0, 8).map((c, i) => (
        <div className="country-row" key={i}>
          <div className="flag">{c.code ? flagEmoji(c.code) : '··'}</div>
          <div className="name">{c.name || c.code}</div>
          <div className="track"><div className="fill" style={{width:`${(c.weight/max)*100}%`}}/></div>
          <div className="val">{formatter(c.weight)}</div>
        </div>
      ))}
    </div>
  );
};

const CredibilityMeter = ({ value, klass }) => {
  if (value == null) return <div className="empty">Credibility score not available</div>;
  const pct = Math.max(0, Math.min(1, value));
  const labels = { good:'Excellent', normal:'Average', average:'Average', bad:'Low' };
  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-end',gap:8,marginBottom:14}}>
        <div className="mono" style={{fontSize:32,fontWeight:700,letterSpacing:'-.02em'}}>{(pct*100).toFixed(0)}</div>
        <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:6}}>/100</div>
        <div style={{flex:1}}/>
        <span className={`tag ${klass==='bad'?'bad':klass==='good'?'good':'warn'}`}><span className="dot"/>{labels[klass]||klass||'—'}</span>
      </div>
      <div className="cred-meter"><div className="marker" style={{left:`${pct*100}%`}}/></div>
      <div className="cred-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    </div>
  );
};

const ReachFlow = ({ data }) => {
  if (!data?.length) return <div className="empty">No data</div>;
  const colorFor = (code) => {
    if (code.startsWith('-')) return 'linear-gradient(90deg,#2f6b3a,#5fa14a)';
    if (code.startsWith('1500')) return 'linear-gradient(90deg,#c43050,#e35a78)';
    return 'linear-gradient(90deg,#d97300,#e8a040)';
  };
  const labelFor = (code) => code.startsWith('-') ? '< 500' : code.startsWith('1500') ? '> 1.5K' : code.replace('-', ' – ');
  return (
    <div>
      {data.map((r, i) => (
        <div className="reach-row" key={i}>
          <div className="lbl">{labelFor(r.code)}</div>
          <div className="track"><div className="fill" style={{width:`${r.weight*100}%`, background:colorFor(r.code)}}>{r.weight>0.08?`${(r.weight*100).toFixed(1)}%`:''}</div></div>
          <div className="val">{(r.weight*100).toFixed(1)}%</div>
        </div>
      ))}
    </div>
  );
};

const Histogram = ({ data, label = '' }) => {
  if (!data?.length) return <div className="empty">No histogram data</div>;
  const max = Math.max(...data.map(d => d.total || 0)) || 1;
  return (
    <div>
      <div className="hist">
        {data.map((d, i) => <div key={i} className="col" style={{height:`${(d.total/max)*100}%`, background: d.max > 0.5 ? '#2f6b3a' : '#c43050'}} title={`≤ ${(d.max*100).toFixed(0)}: ${d.total.toLocaleString()}`}/>)}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'var(--ink-3)',marginTop:6,fontFamily:'JetBrains Mono'}}>
        <span>0% credibility</span><span>{label}</span><span>100%</span>
      </div>
    </div>
  );
};

const NotableUsers = ({ users }) => {
  if (!users?.length) return <div className="empty">No notable users</div>;
  return (
    <div className="user-list">
      {users.slice(0, 12).map((u, i) => {
        const name = u.full_name || u.username || u.name || '?';
        const handle = u.username || u.user_id;
        const initials = name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
        return (
          <div className="user-row" key={i}>
            <div className="av">{initials}</div>
            <div className="nm">
              <div className="h">{name} {u.is_verified && <span className="vf">✓</span>}</div>
              {handle && <div className="s">@{handle}{u.followers || u.follower_count ? ` · ${formatNum(u.followers || u.follower_count)}`:''}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TopNav = ({ active }) => (
  <nav className="topnav">
    <div className="logo">
      <div className="mark">P</div>
      <div className="name">PulseScope<small>Creator Intelligence</small></div>
    </div>
    <div className="pages">
      {Object.entries(PLATFORMS).map(([k, v]) => (
        <a key={k} href={v.file} className={active === k ? 'active' : ''}>
          <PlatformIcon p={k} size={12} color={active === k ? v.color : 'var(--ink-3)'}/>
          {v.label}
        </a>
      ))}
    </div>
    <div style={{display:'flex',gap:8}}>
      <button className="btn ghost">Export</button>
      <button className="btn primary">+ New profile</button>
    </div>
  </nav>
);

const ProfileHead = ({ platform, profile, kpis, tags = [] }) => {
  const meta = PLATFORMS[platform];
  const initials = (profile.full_name || profile.username || profile.title || profile.displayName || '?').slice(0,2).toUpperCase();
  return (
    <>
      <div className="profile-head">
        <div className="avatar initials" style={{background: meta.bg}}>{initials}</div>
        <div className="info">
          <div className="name-row">
            <h1>{profile.full_name || profile.title || profile.displayName || profile.username}</h1>
            {(profile.is_verified || profile.isPartner) && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={meta.color}><path d="M22.5 12l-2.4-2.8.3-3.7-3.6-.8L14.9 1.5 12 3 9.1 1.5 7.2 4.7l-3.6.8.3 3.7L1.5 12l2.4 2.8-.3 3.7 3.6.8 1.9 3.2L12 21l2.9 1.5 1.9-3.2 3.6-.8-.3-3.7L22.5 12zm-12 5L6 12.5l1.4-1.4 3.1 3.1 6.6-6.6 1.4 1.4-8 8z"/></svg>
            )}
            <span className="tag" style={{borderColor: meta.color, color: meta.color, background: 'transparent'}}>
              <PlatformIcon p={platform} size={10} color={meta.color}/> {meta.label}
            </span>
          </div>
          <div className="handle">@{profile.username || profile.custom_url} {profile.region || profile.country || profile.location ? `· ${profile.region||profile.country||profile.location}` : ''} {profile.join_date || profile.published_at ? `· joined ${formatDate(profile.join_date||profile.published_at)}` : ''}</div>
          {profile.biography || profile.description ? <div className="bio">{(profile.biography || profile.description || '').slice(0, 320)}{(profile.biography||profile.description||'').length > 320 ? '…' : ''}</div> : null}
          {tags.length > 0 && <div className="profile-tags">{tags.map((t, i) => <span key={i} className={`tag ${t.kind || ''}`}><span className="dot"/>{t.label}</span>)}</div>}
        </div>
        <div className="actions">
          <button className="btn primary">+ Add to list</button>
          <button className="btn ghost" style={{fontSize:11}}>↗ View profile</button>
        </div>
      </div>
      <div className="kpi-row">
        {kpis.map((k, i) => (
          <div className="kpi" key={i}>
            <div className="label">{k.label}</div>
            <div className="value">{k.value}</div>
            <div className="sub">{k.sub}</div>
          </div>
        ))}
      </div>
    </>
  );
};

// Reusable audience block — passes through every sub-section if data exists
const AudienceBlock = ({ audience, credHist, sourceLabel = 'Followers' }) => {
  if (!audience) return null;
  const a = audience;
  const genderColors = ['#355bff','#d63384'];
  const typeColors = ['#2f6b3a','#c43050','#355bff','#d97300'];
  const typeLabels = { real:'Real People', suspicious:'Suspicious', influencers:'Influencers', mass_followers:'Mass Followers' };
  return (
    <>
      <SectionH title={`Audience Intelligence — ${sourceLabel}`}/>
      <div className="grid">
        {(a.audience_credibility != null || a.audience_types) && (
          <div className="card">
            <CardH title="Audience Credibility" desc="Authentic-vs-suspicious account composition" right={<span className="pill">{sourceLabel}</span>}/>
            <CredibilityMeter value={a.audience_credibility} klass={a.credibility_class}/>
            <div className="minis" style={{gridTemplateColumns:'1fr 1fr'}}>
              <div className="mini"><div className="l">Notable Users</div><div className="v">{a.notable_users_ratio != null ? formatPct(a.notable_users_ratio, 2) : '—'}</div><div className="sub">verified / influencers</div></div>
              {a.audience_types ? (
                <div className="mini"><div className="l">Suspicious</div><div className="v" style={{color:'var(--bad)'}}>{formatPct(a.audience_types.find(t=>t.code==='suspicious')?.weight||0, 1)}</div><div className="sub">bots & inactive</div></div>
              ) : (
                <div className="mini"><div className="l">Reachable</div><div className="v">{formatPct(a.audience_reachability?.find(r=>r.code==='-500')?.weight||0, 1)}</div><div className="sub">follow &lt; 500 accts</div></div>
              )}
            </div>
          </div>
        )}

        {a.audience_genders?.length > 0 && (
          <div className="card">
            <CardH title="Gender Split"/>
            <div className="donut-wrap">
              <Donut size={130} thickness={18} data={a.audience_genders.map(g=>({value:g.weight,label:g.code}))} colors={genderColors}/>
              <div className="donut-legend">
                {a.audience_genders.map((g, i) => (
                  <div className="legend-row" key={i}>
                    <div className="lhs"><span className="swatch" style={{background:genderColors[i]}}/><span className="name">{g.code==='MALE'?'Male':'Female'}</span></div>
                    <div className="pct">{(g.weight*100).toFixed(1)}%</div>
                  </div>
                ))}
                <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid var(--line)',fontSize:11,color:'var(--ink-3)'}}>
                  Skew: <span className="mono" style={{color:'var(--ink)'}}>{a.audience_genders[0]?.weight>0.55?'Male-leaning':a.audience_genders[1]?.weight>0.55?'Female-leaning':'Balanced'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {a.audience_ages?.length > 0 && (
          <div className="card">
            <CardH title="Age × Gender" desc="Population pyramid of follower demographics"/>
            <AgePyramid ages={a.audience_ages} gendersPerAge={a.audience_genders_per_age}/>
          </div>
        )}

        {a.audience_types?.length > 0 && (
          <div className="card">
            <CardH title="Audience Composition" desc="Account type breakdown"/>
            <div className="donut-wrap">
              <Donut size={130} thickness={18} data={a.audience_types.map(t=>({value:t.weight,label:t.code}))} colors={typeColors}/>
              <div className="donut-legend">
                {a.audience_types.map((t, i) => (
                  <div className="legend-row" key={i}>
                    <div className="lhs"><span className="swatch" style={{background:typeColors[i%typeColors.length]}}/><span className="name">{typeLabels[t.code]||t.code}</span></div>
                    <div className="pct">{(t.weight*100).toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {a.audience_reachability?.length > 0 && (
          <div className="card">
            <CardH title="Follower Reachability" desc="How many accounts each follower follows"/>
            <ReachFlow data={a.audience_reachability}/>
          </div>
        )}

        {a.audience_languages?.length > 0 && (
          <div className="card">
            <CardH title="Languages Spoken" desc="Detected from bios & captions"/>
            <BarsList data={a.audience_languages.slice(0,8).map(l=>({label:l.name||l.code, value:l.weight}))} formatter={v=>(v*100).toFixed(1)+'%'} gradient="linear-gradient(90deg,#355bff,#2f6b3a)"/>
          </div>
        )}

        {(a.audience_geo_countries?.length > 0 || a.audience_geo_cities?.length > 0) && (
          <div className="card span-2">
            <CardH title="Geographic Distribution" desc="Where the audience lives"/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
              <div>
                <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,fontWeight:500}}>Top Countries</div>
                <CountryList data={a.audience_geo_countries}/>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,fontWeight:500}}>Top Cities</div>
                {a.audience_geo_cities?.length ? (
                  <div>{a.audience_geo_cities.slice(0,8).map((c, i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px dashed var(--line)',fontSize:12}}>
                      <span style={{color:'var(--ink-2)'}}>{c.name}{c.country ? `, ${c.country}` : ''}</span>
                      <span className="mono" style={{color:'var(--ink)'}}>{(c.weight*100).toFixed(2)}%</span>
                    </div>
                  ))}</div>
                ) : <div className="empty">No city data</div>}
              </div>
            </div>
          </div>
        )}

        {a.audience_ethnicities?.length > 0 && (
          <div className="card">
            <CardH title="Ethnicities" desc="Estimated audience demographics"/>
            <BarsList data={a.audience_ethnicities.map(e=>({label:e.name||e.code, value:e.weight}))} formatter={v=>(v*100).toFixed(1)+'%'} gradient="linear-gradient(90deg,#d97300,#e8b71e)"/>
          </div>
        )}

        {a.audience_brand_affinity?.length > 0 && (
          <div className="card">
            <CardH title="Brand Affinity" desc="Brands the audience engages with"/>
            <div className="chips">{a.audience_brand_affinity.slice(0,16).map((b, i) => <span className="chip" key={i}>{b.name} <strong>{(b.weight*100).toFixed(1)}%</strong></span>)}</div>
          </div>
        )}

        {a.audience_interests?.length > 0 && (
          <div className={`card ${a.audience_brand_affinity?.length > 0 ? '' : 'span-2'}`}>
            <CardH title="Interest Categories" desc="What this audience cares about"/>
            <div className="chips">{a.audience_interests.slice(0,16).map((b, i) => <span className="chip" key={i}>{b.name} <strong>{(b.weight*100).toFixed(1)}%</strong></span>)}</div>
          </div>
        )}

        {a.notable_users?.length > 0 && (
          <div className="card span-2">
            <CardH title="Notable Followers" desc="High-influence accounts in the audience" right={<span className="pill mono">{a.notable_users.length}</span>}/>
            <NotableUsers users={a.notable_users}/>
          </div>
        )}

        {a.audience_lookalikes?.length > 0 && (
          <div className="card span-2">
            <CardH title="Lookalike Creators" desc="Similar profiles by audience overlap"/>
            <NotableUsers users={a.audience_lookalikes}/>
          </div>
        )}

        {credHist && Array.isArray(credHist) && credHist.length > 0 && (
          <div className="card span-2">
            <CardH title="Credibility Distribution" desc="Histogram of audience credibility scores across followers"/>
            <Histogram data={credHist} label={`${credHist.reduce((s,d)=>s+(d.total||0),0).toLocaleString()} accounts sampled`}/>
          </div>
        )}
      </div>
    </>
  );
};

// All shared exports
Object.assign(window, {
  PLATFORMS, PlatformIcon, formatNum, formatPct, formatPctRaw, formatDate, flagEmoji, fmtDuration,
  Donut, Sparkline, ScatterPlot, PostingHeatmap, SectionH, CardH,
  AgePyramid, BarsList, CountryList, CredibilityMeter, ReachFlow, Histogram, NotableUsers,
  TopNav, ProfileHead, AudienceBlock,
});
