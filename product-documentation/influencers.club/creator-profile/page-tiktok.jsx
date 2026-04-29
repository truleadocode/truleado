/* TikTok page — Khaby Lame */
const { useState: useStateTT } = React;

function TikTokPage({ data }) {
  const d = data;
  const af = d.audience?.audience_followers?.data;
  const totalEng = (d.post_data || []).map(p => ({
    likes: p.engagement?.like_count||0,
    comments: p.engagement?.comment_count||0,
    views: p.engagement?.view_count||0,
    shares: p.engagement?.share_count||0,
    downloads: p.engagement?.download_count||0,
    duration: p.media?.video_duration||0,
    date: p.created_at,
  }));

  const tags = [
    d.is_verified && { kind:'good', label:'Verified' },
    d.is_ad && { kind:'warn', label:'Runs ads' },
    d.has_paid_partnership && { kind:'warn', label:'Paid partnerships' },
    d.is_commerce && { label:'Commerce' },
    d.tt_seller && Object.keys(d.tt_seller).length && { label:'TT Seller' },
    d.duet_setting !== undefined && { label:`Duet: ${d.duet_setting}` },
    d.is_private && { kind:'bad', label:'Private' },
    d.has_merch ? { kind:'good', label:'Has merch' } : { label:'No merch' },
    d.streamer && { label:'Streamer' },
  ].filter(Boolean);

  const kpis = [
    { label:'Followers', value: formatNum(d.follower_count), sub: `${formatNum(d.following_count)} following · ${formatNum(d.video_count)} videos` },
    { label:'Engagement Rate', value: formatPctRaw(d.engagement_percent, 2), sub:'lifetime average' },
    { label:'Total Likes', value: formatNum(d.total_likes), sub:`${formatNum(d.total_shares)} shares · ${formatNum(d.total_saves)} saves` },
    { label:'Reach Score', value: formatNum(d.reach_score), sub:`Avg views ${formatNum(d.play_count_avg)}` },
  ];

  const growth = d.creator_follower_growth || {};
  const growthData = [
    { p:'12m', v: growth['12_months_ago']||0 },
    { p:'9m', v: growth['9_months_ago']||0 },
    { p:'6m', v: growth['6_months_ago']||0 },
    { p:'3m', v: growth['3_months_ago']||0 },
    { p:'now', v: 0 },
  ];

  return (
    <div className="page">
      <TopNav active="tiktok"/>
      <ProfileHead platform="tiktok" profile={d} kpis={kpis} tags={tags}/>

      <SectionH title="Profile Snapshot" badge={`@${d.username} · ID ${d.user_id}`}/>
      <div className="grid">
        <div className="card">
          <CardH title="Identity & Account"/>
          <div className="dl">
            <div><span className="k">Full name</span><span className="v">{d.full_name}</span></div>
            <div><span className="k">Username</span><span className="v">@{d.username}</span></div>
            <div><span className="k">User ID</span><span className="v">{d.user_id}</span></div>
            <div><span className="k">Sec User ID</span><span className="v" title={d.sec_user_id} style={{fontSize:10}}>{(d.sec_user_id||'').slice(0,28)}…</span></div>
            <div><span className="k">Region</span><span className="v">{d.region}</span></div>
            <div><span className="k">Languages</span><span className="v">{(d.language_code||[]).join(', ')||'—'}</span></div>
            <div><span className="k">Verified</span><span className="v">{String(d.is_verified)}</span></div>
            <div><span className="k">Private</span><span className="v">{String(d.is_private)}</span></div>
            <div><span className="k">Is ad</span><span className="v">{String(d.is_ad)}</span></div>
            <div><span className="k">Commerce</span><span className="v">{String(d.is_commerce)}</span></div>
            <div><span className="k">Duet enabled</span><span className="v">{String(d.duet_setting)}</span></div>
            <div><span className="k">Paid partnership</span><span className="v">{String(d.paid_partnership)}</span></div>
            <div><span className="k">Promotes affiliate</span><span className="v">{String(d.promotes_affiliate_links)}</span></div>
            <div><span className="k">Uses link in bio</span><span className="v">{String(d.uses_link_in_bio)}</span></div>
            <div><span className="k">Has merch</span><span className="v">{String(d.has_merch)}</span></div>
            <div><span className="k">Streamer</span><span className="v">{String(d.streamer)}</span></div>
            <div><span className="k">Most recent post</span><span className="v">{formatDate(d.most_recent_post_date)}</span></div>
            <div><span className="k">Posting freq</span><span className="v">{d.posting_frequency} / mo</span></div>
            <div><span className="k">Posting freq (recent)</span><span className="v">{d.posting_frequency_recent_months} / mo</span></div>
          </div>
        </div>
        <div className="card">
          <CardH title="Bio & Categorization"/>
          <div style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.5}}>{d.biography || <span style={{color:'var(--ink-4)'}}>No biography</span>}</div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Niche classification</div>
            <div className="chips">
              {(d.niche_class||[]).map((n,i) => <span className="chip" key={i}>{typeof n==='string'?n:JSON.stringify(n)}</span>)}
              {(d.niche_sub_class||[]).map((n,i) => <span className="chip" key={`s${i}`}>{typeof n==='string'?n:JSON.stringify(n)}</span>)}
            </div>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Category</div>
            <div className="chips">{Object.entries(d.category||{}).map(([k,v],i) => <span className="chip" key={i}>{k}: <strong>{String(v)}</strong></span>)}{!Object.keys(d.category||{}).length && <span className="chip">none</span>}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Brands found</div>
            <div className="chips">{(d.brands_found||[]).map((b,i) => <span className="chip" key={i}>{typeof b==='string'?b:b.name||JSON.stringify(b)}</span>)}{!d.brands_found?.length && <span className="empty" style={{padding:8}}>None</span>}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Mention status</div>
            <div className="chips">{Object.entries(d.mention_status||{}).map(([k,v],i) => <span className="chip" key={i}>{k}: <strong>{String(v)}</strong></span>)}</div>
          </div>
        </div>
      </div>

      <SectionH title="Engagement Performance"/>
      <div className="grid">
        <div className="card">
          <CardH title="Lifetime Aggregate" desc="Cumulative across all 1,321 videos"/>
          <div className="minis" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
            <div className="mini"><div className="l">Total Likes</div><div className="v">{formatNum(d.total_likes)}</div></div>
            <div className="mini"><div className="l">Total Shares</div><div className="v">{formatNum(d.total_shares)}</div></div>
            <div className="mini"><div className="l">Total Saves</div><div className="v">{formatNum(d.total_saves)}</div></div>
            <div className="mini"><div className="l">Reach Score</div><div className="v">{formatNum(d.reach_score)}</div></div>
          </div>
        </div>
        <div className="card">
          <CardH title="Per-Post Averages" desc="Mean & median values"/>
          <div className="dl">
            <div><span className="k">Avg likes</span><span className="v">{formatNum(d.avg_likes)}</span></div>
            <div><span className="k">Median likes</span><span className="v">{formatNum(d.likes_median)}</span></div>
            <div><span className="k">Avg comments</span><span className="v">{formatNum(d.comment_count_avg)}</span></div>
            <div><span className="k">Median comments</span><span className="v">{formatNum(d.comments_median)}</span></div>
            <div><span className="k">Avg plays</span><span className="v">{formatNum(d.play_count_avg)}</span></div>
            <div><span className="k">Median plays</span><span className="v">{formatNum(d.play_count_median)}</span></div>
            <div><span className="k">Median shares</span><span className="v">{formatNum(d.shares_median)}</span></div>
            <div><span className="k">Median saves</span><span className="v">{formatNum(d.saves_median)}</span></div>
            <div><span className="k">Avg duration</span><span className="v">{d.duration_avg?.toFixed(1)}s</span></div>
          </div>
        </div>
        <div className="card span-2">
          <CardH title="Follower Growth" desc="Quarter-over-quarter % change" right={<span className="pill mono">{growth['12_months_ago']?.toFixed(2)}% YoY</span>}/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 200px',gap:24,alignItems:'center'}}>
            <Sparkline values={growthData.map(g=>g.v)} height={100} color={growthData[0].v < 0 ? '#c43050' : '#2f6b3a'}/>
            <div className="dl single">
              {growthData.map(g => <div key={g.p}><span className="k">{g.p} ago</span><span className="v" style={{color:g.v<0?'var(--bad)':'var(--good)'}}>{g.v>0?'+':''}{g.v.toFixed(2)}%</span></div>)}
            </div>
          </div>
        </div>

        <div className="card span-2">
          <CardH title="Saves & Reach Trend" desc="Saves count and reach score across recent posts"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <div>
              <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:4}}>Saves per post (recent)</div>
              <Sparkline values={(d.saves_count_list||[]).slice(0,30).reverse()} height={80} color="#2f6b3a"/>
            </div>
            <div>
              <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:4}}>Reach score per post (recent)</div>
              <Sparkline values={(d.reach_score_list||[]).slice(0,30).reverse()} height={80} color="#FE2C55"/>
            </div>
          </div>
        </div>

        <div className="card span-2">
          <CardH title="Views vs Likes" desc="Engagement scatter for recent videos"/>
          <ScatterPlot posts={totalEng} xKey="views" yKey="likes" xLabel="Views" yLabel="Likes" height={240}/>
        </div>

        <div className="card span-2">
          <CardH title="Posting Heatmap" desc="When videos get published"/>
          <PostingHeatmap posts={d.post_data}/>
        </div>
      </div>

      <SectionH title="Recent Videos" badge={`${d.post_data?.length||0} videos`}/>
      <div className="grid full">
        <div className="card">
          <CardH title="Top Videos" desc="Sorted by view count"/>
          <div className="posts-grid cols-4">
            {(d.post_data||[]).slice().sort((a,b)=>(b.engagement?.view_count||0)-(a.engagement?.view_count||0)).slice(0,8).map((p,i) => (
              <div className="post-card video" key={p.post_id}>
                <div className="cover placeholder">video {i+1}</div>
                <div className="rank">#{i+1}</div>
                <div className="badge">{p.media?.video_duration}s</div>
                <div className="meta">
                  <span>▶ {formatNum(p.engagement?.view_count)}</span>
                  <span>♥ {formatNum(p.engagement?.like_count)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid full">
        <div className="card">
          <CardH title="Video Details" desc="Caption, sound, hashtags & engagement"/>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(d.post_data||[]).slice(0,8).map((p,i) => (
              <div key={p.post_id} style={{padding:'12px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:10}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:11,color:'var(--ink-3)',fontFamily:'JetBrains Mono',marginBottom:6}}>
                  <span>{formatDate(p.created_at)} · {p.created_at?.slice(11,16)} · {p.media?.video_duration}s</span>
                  <span>ID {p.post_id?.slice(0,12)}…</span>
                </div>
                <div style={{fontSize:13,color:'var(--ink)',marginBottom:8,lineHeight:1.5}}>{p.caption || <span style={{color:'var(--ink-4)'}}>No caption</span>}</div>
                {p.sound?.sound_name && <div style={{fontSize:11,color:'var(--ink-3)',marginBottom:6}}>♫ {p.sound.sound_name}</div>}
                <div style={{display:'flex',gap:14,fontSize:11,fontFamily:'JetBrains Mono',color:'var(--ink-3)',flexWrap:'wrap'}}>
                  <span>▶ {formatNum(p.engagement?.view_count)}</span>
                  <span>♥ {formatNum(p.engagement?.like_count)}</span>
                  <span>💬 {formatNum(p.engagement?.comment_count)}</span>
                  <span>↗ {formatNum(p.engagement?.share_count)}</span>
                  <span>⬇ {formatNum(p.engagement?.download_count)}</span>
                  {p.hashtags?.length>0 && <span>#{p.hashtags.length}</span>}
                  {p.mentions?.length>0 && <span>@{p.mentions.length}</span>}
                  <a href={p.post_url} style={{color:'var(--accent-3)',marginLeft:'auto'}} target="_blank">↗ open</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionH title="Tags & Discovery"/>
      <div className="grid">
        <div className="card">
          <CardH title="Hashtags Used" right={<span className="pill mono">{d.hashtags?.length||0} unique</span>}/>
          {d.hashtags?.length ? (
            <div className="chips">
              {d.hashtags.slice(0,30).map((h,i) => <span className="chip" key={i}>#{typeof h==='string'?h:h.name||JSON.stringify(h)}</span>)}
            </div>
          ) : <div className="empty">No hashtags found</div>}
        </div>
        <div className="card">
          <CardH title="Tagged & Challenges"/>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Tagged users ({d.tagged?.length||0})</div>
            {d.tagged?.length ? <div className="chips">{d.tagged.map((t,i)=><span className="chip" key={i}>{typeof t==='string'?t:t.username||JSON.stringify(t)}</span>)}</div> : <div className="empty" style={{padding:10}}>None</div>}
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Challenges ({d.challenges_list?.length||0})</div>
            {d.challenges_list?.length ? <div className="chips">{d.challenges_list.map((t,i)=><span className="chip" key={i}>{typeof t==='string'?t:t.name||JSON.stringify(t)}</span>)}</div> : <div className="empty" style={{padding:10}}>None</div>}
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Links in bio ({d.links_in_bio?.length||0})</div>
            {d.links_in_bio?.length ? d.links_in_bio.map((l,i)=><div key={i} style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--accent-3)',padding:'2px 0'}}>{typeof l==='string'?l:JSON.stringify(l)}</div>) : <div className="empty" style={{padding:10}}>None</div>}
          </div>
        </div>
      </div>

      <SectionH title="Audience Intelligence"/>
      {af ? <AudienceBlock audience={af} sourceLabel="Followers"/> : <div className="empty">Audience data not available</div>}
      {!d.audience?.audience_likers?.success && (
        <div className="empty" style={{marginTop:8}}>Likers audience unavailable: <span className="mono">{d.audience?.audience_likers?.error}</span></div>
      )}
    </div>
  );
}

window.TikTokPage = TikTokPage;
