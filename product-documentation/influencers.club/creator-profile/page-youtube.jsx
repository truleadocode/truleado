/* YouTube page — MrBeast */
function YouTubePage({ data }) {
  const d = data;
  const af = d.audience?.audience_followers?.data;
  const ac = d.audience?.audience_commenters?.data;
  const al = d.audience?.audience_likers;
  const [tab, setTab] = React.useState('followers');
  const audienceData = tab === 'followers' ? af : ac;

  const tags = [
    d.is_verified && { kind:'good', label:'Verified' },
    d.is_monetization_enabled && { kind:'good', label:'Monetized' },
    d.has_shorts && { label:'Shorts' },
    d.has_community_posts && { label:'Community posts' },
    d.streamer && { label:'Streamer' },
    d.made_for_kids && { kind:'warn', label:'Made for kids' },
    d.moderate_comments && { label:'Moderates comments' },
    d.has_paid_partnership && { kind:'warn', label:'Paid partnership' },
    d.promotes_affiliate_links && { kind:'warn', label:'Affiliate' },
    { label:`Privacy: ${d.privacy_status}` },
  ].filter(Boolean);

  const kpis = [
    { label:'Subscribers', value: formatNum(d.subscriber_count), sub:`${formatNum(d.video_count)} videos · ${formatNum(d.view_count)} total views` },
    { label:'Engagement Rate', value: formatPctRaw(d.engagement_percent, 2), sub:`Long ${d.engagement_percent_long}% · Shorts ${d.engagement_percent_shorts}%` },
    { label:'Avg Views', value: formatNum(d.avg_views), sub:`Long ${formatNum(d.avg_views_long)} · Shorts ${formatNum(d.avg_views_shorts)}` },
    { label:'Est. Monthly Income', value:`$${formatNum(d.income?.min)}–${formatNum(d.income?.max)}`, sub:d.income?.currency || 'USD' },
  ];

  const longCount = (d.post_data||[]).filter(p => {
    const m = (p.media?.duration||'').match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return false;
    const sec = (+m[1]||0)*60 + (+m[2]||0);
    return sec > 60;
  }).length;
  const shortsCount = (d.post_data?.length||0) - longCount;

  return (
    <div className="page">
      <TopNav active="youtube"/>
      <ProfileHead platform="youtube" profile={d} kpis={kpis} tags={tags}/>

      <SectionH title="Channel Snapshot" badge={`${d.custom_url} · ID ${d.id}`}/>
      <div className="grid">
        <div className="card">
          <CardH title="Channel Info"/>
          <div className="dl">
            <div><span className="k">Title</span><span className="v">{d.title}</span></div>
            <div><span className="k">First name</span><span className="v">{d.first_name||'—'}</span></div>
            <div><span className="k">Custom URL</span><span className="v">{d.custom_url}</span></div>
            <div><span className="k">Channel ID</span><span className="v">{d.id}</span></div>
            <div><span className="k">Country</span><span className="v">{d.country}</span></div>
            <div><span className="k">Language</span><span className="v">{d.speaking_language}</span></div>
            <div><span className="k">Published</span><span className="v">{formatDate(d.published_at)}</span></div>
            <div><span className="k">Privacy</span><span className="v">{d.privacy_status}</span></div>
            <div><span className="k">Made for kids</span><span className="v">{String(d.made_for_kids)}</span></div>
            <div><span className="k">Monetization</span><span className="v">{String(d.is_monetization_enabled)}</span></div>
            <div><span className="k">Verified</span><span className="v">{String(d.is_verified)}</span></div>
            <div><span className="k">Has Shorts</span><span className="v">{String(d.has_shorts)}</span></div>
            <div><span className="k">Community posts</span><span className="v">{String(d.has_community_posts)}</span></div>
            <div><span className="k">Moderates comments</span><span className="v">{String(d.moderate_comments)}</span></div>
            <div><span className="k">Trailer ID</span><span className="v">{d.unsubscribed_trailer_id}</span></div>
            <div><span className="k">Playlist ID</span><span className="v">{d.related_playlist_id}</span></div>
            <div><span className="k">Last long upload</span><span className="v">{formatDate(d.last_long_video_upload_date)}</span></div>
            <div><span className="k">Last short upload</span><span className="v">{formatDate(d.last_short_video_upload_date)}</span></div>
            <div><span className="k">Most recent post</span><span className="v">{formatDate(d.most_recent_post_date)}</span></div>
            <div><span className="k">Streamer</span><span className="v">{String(d.streamer)}</span></div>
          </div>
        </div>

        <div className="card">
          <CardH title="Description"/>
          <div style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.5,maxHeight:200,overflow:'auto'}}>{d.description || <span style={{color:'var(--ink-4)'}}>No description</span>}</div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Topic Details</div>
            <div className="chips">{(d.topic_details||[]).map((t,i)=><span className="chip" key={i}>{typeof t==='string'?t:t.name||JSON.stringify(t)}</span>)}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Keywords</div>
            <div className="chips">{(d.keywords||[]).map((k,i)=><span className="chip" key={i}>{k}</span>)}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Niche</div>
            <div className="chips">{Object.entries(d.niche_class||{}).map(([k,v],i)=><span className="chip" key={i}>{k}: <strong>{String(v)}</strong></span>)}{(d.niche_sub_class||[]).map((s,i)=><span className="chip" key={`s${i}`}>{typeof s==='string'?s:JSON.stringify(s)}</span>)}</div>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Emails from descriptions ({d.email_from_video_desc?.length||0})</div>
            <div className="chips">{(d.email_from_video_desc||[]).slice(0,8).map((e,i)=><span className="chip" key={i}>{e}</span>)}</div>
          </div>
        </div>
      </div>

      <SectionH title="Performance — Long-form vs Shorts"/>
      <div className="grid">
        <div className="card">
          <CardH title="Format Mix" desc={`${d.shorts_percentage}% Shorts overall`}/>
          <div className="donut-wrap">
            <Donut size={130} thickness={18} data={[{value:longCount},{value:shortsCount}]} colors={['#FF0033','#000']}/>
            <div className="donut-legend">
              <div className="legend-row"><div className="lhs"><span className="swatch" style={{background:'#FF0033'}}/><span className="name">Long-form</span></div><div className="pct">{longCount}</div></div>
              <div className="legend-row"><div className="lhs"><span className="swatch" style={{background:'#000'}}/><span className="name">Shorts</span></div><div className="pct">{shortsCount}</div></div>
              <div style={{fontSize:11,color:'var(--ink-3)',marginTop:8}}>From last {d.post_data?.length} videos</div>
            </div>
          </div>
        </div>

        <div className="card">
          <CardH title="Engagement by Format"/>
          <div className="dl">
            <div><span className="k">ER long-form</span><span className="v">{d.engagement_percent_long}%</span></div>
            <div><span className="k">ER shorts</span><span className="v">{d.engagement_percent_shorts}%</span></div>
            <div><span className="k">Likes/views long</span><span className="v">{d.engagement_by_likes_and_views_long}%</span></div>
            <div><span className="k">Likes/views shorts</span><span className="v">{d.engagement_by_likes_and_views_shorts}%</span></div>
            <div><span className="k">Comments/views long</span><span className="v">{d.engagement_by_comments_and_views_long}%</span></div>
            <div><span className="k">Comments/views shorts</span><span className="v">{d.engagement_by_comments_and_views_shorts}%</span></div>
            <div><span className="k">Views/subs long</span><span className="v">{d.engagement_by_views_and_subs_long}%</span></div>
            <div><span className="k">Views/subs shorts</span><span className="v">{d.engagement_by_views_and_subs_shorts}%</span></div>
          </div>
        </div>

        <div className="card">
          <CardH title="View Stats"/>
          <div className="minis" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
            <div className="mini"><div className="l">Avg Views</div><div className="v">{formatNum(d.avg_views)}</div></div>
            <div className="mini"><div className="l">Median Views (long)</div><div className="v">{formatNum(d.median_views_long)}</div></div>
            <div className="mini"><div className="l">Avg Views (long)</div><div className="v">{formatNum(d.avg_views_long)}</div></div>
            <div className="mini"><div className="l">Avg Views (shorts)</div><div className="v">{formatNum(d.avg_views_shorts)}</div></div>
            <div className="mini"><div className="l">Avg Likes</div><div className="v">{formatNum(d.avg_likes)}</div></div>
            <div className="mini"><div className="l">Avg Comments</div><div className="v">{formatNum(d.avg_comments)}</div></div>
            <div className="mini"><div className="l">Total Comments (last 50)</div><div className="v">{formatNum(d.total_comments_last_50)}</div></div>
            <div className="mini"><div className="l">Least Views</div><div className="v">{formatNum(d.least_views)}</div></div>
          </div>
        </div>

        <div className="card">
          <CardH title="Posting Frequency"/>
          <div className="dl single">
            <div><span className="k">Overall</span><span className="v">{d.posting_frequency} / mo</span></div>
            <div><span className="k">Long-form</span><span className="v">{d.posting_frequency_long} / mo</span></div>
            <div><span className="k">Shorts</span><span className="v">{d.posting_frequency_shorts} / mo</span></div>
            <div><span className="k">Recent months</span><span className="v">{d.posting_frequency_recent_months} / mo</span></div>
          </div>
        </div>

        <div className="card span-2">
          <CardH title="Posts per Month" desc="Year-over-year upload cadence"/>
          {(() => {
            const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
            const years = Object.keys(d.posts_per_month||{}).sort();
            return (
              <div className="year-cal">
                <div></div>
                {months.map(m => <div className="mh" key={m}>{m.slice(0,3).toUpperCase()}</div>)}
                {years.map(y => (
                  <React.Fragment key={y}>
                    <div className="yh">{y}</div>
                    {months.map(m => {
                      const v = d.posts_per_month?.[y]?.[m];
                      return <div className={`ce ${!v?'empty-c':''}`} key={m} style={{background: v ? `rgba(255,0,51,${0.15 + Math.min(v,15)/30})`:undefined, borderColor:v?'rgba(255,0,51,.3)':undefined}}>{v||'·'}</div>;
                    })}
                  </React.Fragment>
                ))}
              </div>
            );
          })()}
        </div>

        <div className="card span-2">
          <CardH title="Recent Video Performance" desc="Views across last 50 videos"/>
          <Sparkline values={(d.post_data||[]).map(p => +p.engagement?.view_count||0).reverse()} height={120} color="#FF0033"/>
        </div>
      </div>

      <SectionH title="Top Videos & Catalog" badge={`${d.post_data?.length||0} videos`}/>
      <div className="grid full">
        <div className="card">
          <CardH title="Top Performing" desc="Sorted by view count"/>
          <div className="posts-grid cols-4">
            {(d.post_data||[]).slice().sort((a,b)=>(+b.engagement?.view_count||0)-(+a.engagement?.view_count||0)).slice(0,8).map((p, i) => (
              <div className="post-card wide" key={p.video_id}>
                <div className="cover" style={{backgroundImage:`url(${p.media?.thumbnails?.medium})`}}>
                  {!p.media?.thumbnails?.medium && <div className="cover placeholder">video {i+1}</div>}
                </div>
                <div className="rank">#{i+1}</div>
                <div className="badge">{fmtDuration(p.media?.duration)}</div>
                <div className="meta">
                  <span>👁 {formatNum(p.engagement?.view_count)}</span>
                  <span>♥ {formatNum(p.engagement?.like_count)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid full">
        <div className="card">
          <CardH title="Video Details" desc="Title, duration, definition, language & engagement"/>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(d.post_data||[]).slice(0,10).map((p, i) => (
              <div key={p.video_id} style={{padding:'12px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:10,display:'flex',gap:12}}>
                <div style={{width:120,flexShrink:0,aspectRatio:'16/9',borderRadius:6,backgroundImage:`url(${p.media?.thumbnails?.medium})`,backgroundSize:'cover',backgroundColor:'var(--surface)',border:'1px solid var(--line)'}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{p.title}</div>
                  <div style={{fontSize:11,color:'var(--ink-3)',fontFamily:'JetBrains Mono',marginBottom:6}}>{formatDate(p.published_at)} · {fmtDuration(p.media?.duration)} · {p.media?.definition?.toUpperCase()} · cat {p.category_id} · {p.default_language}/{p.default_audio_language}</div>
                  <div style={{display:'flex',gap:14,fontSize:11,fontFamily:'JetBrains Mono',color:'var(--ink-3)',flexWrap:'wrap'}}>
                    <span>👁 {formatNum(p.engagement?.view_count)}</span>
                    <span>♥ {formatNum(p.engagement?.like_count)}</span>
                    <span>💬 {formatNum(p.engagement?.comment_count)}</span>
                    <span>★ {formatNum(p.engagement?.favorite_count)}</span>
                    {p.topic_categories?.length>0 && <span>{p.topic_categories.length} topics</span>}
                    <a href={p.post_url} style={{color:'var(--accent-3)',marginLeft:'auto'}} target="_blank">↗ open</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionH title="Discovery & Categorization"/>
      <div className="grid">
        <div className="card">
          <CardH title="Video Categories" right={<span className="pill mono">{d.video_categories?.length||0}</span>}/>
          <div className="chips">{(d.video_categories||[]).map((c,i)=><span className="chip" key={i}>{typeof c==='string'?c:c.name||JSON.stringify(c)}</span>)}</div>
        </div>
        <div className="card">
          <CardH title="Video Topics" right={<span className="pill mono">{d.video_topics?.length||0}</span>}/>
          <div className="chips" style={{maxHeight:160,overflow:'auto'}}>{(d.video_topics||[]).slice(0,40).map((c,i)=><span className="chip" key={i}>{typeof c==='string'?c.split('/').pop():c.name||JSON.stringify(c)}</span>)}</div>
        </div>
        <div className="card span-2">
          <CardH title="Hashtags" right={<span className="pill mono">{d.hashtags_count?.length||0}</span>}/>
          {(d.hashtags_count||[]).filter(h=>h.name && h.name.length>1).length ? (
            <div className="chips">{d.hashtags_count.filter(h=>h.name && h.name.length>1).map((h,i)=><span className="chip" key={i}>#{h.name} <strong>×{h.count}</strong></span>)}</div>
          ) : <div className="empty">No meaningful hashtags found</div>}
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:6}}>Video-level hashtags pool: <span className="mono">{(d.video_hashtags||[]).length}</span></div>
        </div>
      </div>

      <SectionH title="Audience Intelligence" right={
        <div className="tabs" style={{marginLeft:8}}>
          <button className={`tab ${tab==='followers'?'active':''}`} onClick={()=>setTab('followers')}>Followers</button>
          <button className={`tab ${tab==='commenters'?'active':''}`} onClick={()=>setTab('commenters')} disabled={!ac}>Commenters</button>
          <button className="tab" disabled title={al?.error}>Likers {al?.error?'(empty)':''}</button>
        </div>
      }/>
      {audienceData ? <AudienceBlock audience={audienceData} sourceLabel={tab==='followers'?'Followers':'Commenters'}/> : <div className="empty">Audience data not available</div>}
    </div>
  );
}
window.YouTubePage = YouTubePage;
