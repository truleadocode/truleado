/* Instagram page — Cristiano */
const { useState, useEffect } = React;

function InstagramPage({ data }) {
  const d = data;
  const af = d.audience?.audience_followers?.data;
  const al = d.audience?.audience_likers?.data;
  const ac = d.audience?.audience_commenters;
  const [audienceTab, setAudienceTab] = useState('followers');
  const audienceData = audienceTab === 'followers' ? af : al;

  const recentPosts = (d.post_data || []).slice().sort((a,b)=> (b.engagement?.likes||0) - (a.engagement?.likes||0));
  const reelsCount = (d.post_data || []).filter(p => p.product_type === 'clips' || p.media_type === 2).length;
  const carouselCount = (d.post_data || []).filter(p => p.is_carousel).length;
  const photoCount = (d.post_data || []).length - reelsCount - carouselCount;

  const tags = [
    d.is_verified && { kind:'good', label:'Verified' },
    d.is_business_account && { kind:'accent', label:'Business' },
    { label: `Account type ${d.account_type}` },
    d.video_content_creator && { label: 'Video creator' },
    d.streamer && { label: 'Streamer' },
    d.has_merch ? { kind:'good', label: 'Has merch' } : { label: 'No merch' },
    d.uses_link_in_bio ? { label: 'Uses link-in-bio' } : { label: 'No link-in-bio' },
    d.promotes_affiliate_links ? { kind:'warn', label: 'Affiliate links' } : null,
  ].filter(Boolean);

  const kpis = [
    { label: 'Followers', value: formatNum(d.follower_count), sub: `${formatNum(d.following_count)} following` },
    { label: 'Engagement Rate', value: d.engagement_percent + '%', sub: 'across last 12 posts' },
    { label: 'Avg Likes / Comments', value: `${formatNum(d.avg_likes)} / ${formatNum(d.avg_comments)}`, sub: `Median ${formatNum(d.likes_median)} / ${formatNum(d.comments_median)}` },
    { label: 'Total Posts', value: formatNum(d.media_count), sub: `Last post ${formatDate(d.most_recent_post_date)}` },
  ];

  return (
    <div className="page">
      <TopNav active="instagram"/>
      <ProfileHead platform="instagram" profile={d} kpis={kpis} tags={tags}/>

      <SectionH title="Profile Snapshot" badge={`@${d.username} · ID ${d.userid}`}/>
      <div className="grid">
        <div className="card">
          <CardH title="Identity & Account"/>
          <div className="dl">
            <div><span className="k">Full name</span><span className="v">{d.full_name}</span></div>
            <div><span className="k">Username</span><span className="v">@{d.username}</span></div>
            <div><span className="k">User ID</span><span className="v">{d.userid}</span></div>
            <div><span className="k">Account type</span><span className="v">{d.account_type}</span></div>
            <div><span className="k">Is private</span><span className="v">{String(d.is_private)}</span></div>
            <div><span className="k">Is verified</span><span className="v">{String(d.is_verified)}</span></div>
            <div><span className="k">Is business</span><span className="v">{String(d.is_business_account)}</span></div>
            <div><span className="k">Has profile pic</span><span className="v">{String(d.has_profile_pic)}</span></div>
            <div><span className="k">Exists</span><span className="v">{String(d.exists)}</span></div>
            <div><span className="k">Languages</span><span className="v">{(d.language_code||[]).join(', ') || '—'}</span></div>
          </div>
        </div>
        <div className="card">
          <CardH title="Bio & Links"/>
          {d.biography && typeof d.biography === 'object' ? (
            <div style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.5}}>
              {Object.values(d.biography).filter(v=>typeof v==='string').join(' · ')}
            </div>
          ) : <div style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.5}}>{d.biography || <span style={{color:'var(--ink-4)'}}>No biography</span>}</div>}
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Links in bio</div>
            {d.links_in_bio?.length ? d.links_in_bio.map((l,i) => (
              <div key={i} style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--accent-3)',padding:'4px 0',wordBreak:'break-all'}}>{typeof l === 'string' ? l : (l.url || JSON.stringify(l))}</div>
            )) : <div className="empty" style={{padding:10}}>No links in bio</div>}
          </div>
          <div className="profile-tags">
            <span className={`tag ${d.has_merch?'good':''}`}><span className="dot"/>Merch: {String(d.has_merch)}</span>
            <span className={`tag ${d.promotes_affiliate_links?'warn':''}`}><span className="dot"/>Affiliate: {String(d.promotes_affiliate_links)}</span>
            <span className="tag"><span className="dot"/>Streamer: {String(d.streamer)}</span>
            <span className="tag"><span className="dot"/>Video creator: {String(d.video_content_creator)}</span>
          </div>
        </div>
      </div>

      <SectionH title="Performance Overview"/>
      <div className="grid">
        <div className="card">
          <CardH title="Content Mix" desc="Last 12 posts breakdown"/>
          <div className="donut-wrap">
            <Donut size={130} thickness={18} data={[
              {value:reelsCount, label:'Reels'},
              {value:carouselCount, label:'Carousels'},
              {value:photoCount, label:'Photos'}
            ]} colors={['#dd2a7b','#8134af','#feda77']}/>
            <div className="donut-legend">
              <div className="legend-row"><div className="lhs"><span className="swatch" style={{background:'#dd2a7b'}}/><span className="name">Reels</span></div><div className="pct">{reelsCount}</div></div>
              <div className="legend-row"><div className="lhs"><span className="swatch" style={{background:'#8134af'}}/><span className="name">Carousels</span></div><div className="pct">{carouselCount}</div></div>
              <div className="legend-row"><div className="lhs"><span className="swatch" style={{background:'#feda77'}}/><span className="name">Photos</span></div><div className="pct">{photoCount}</div></div>
              <div style={{fontSize:11,color:'var(--ink-3)',marginTop:6}}>Reels share: <span className="mono">{d.reels_percentage_last_12_posts}%</span></div>
            </div>
          </div>
        </div>

        <div className="card">
          <CardH title="Reels Performance" desc="Aggregate reel metrics"/>
          <div className="minis">
            <div className="mini"><div className="l">Avg Likes</div><div className="v">{formatNum(d.reels?.avg_like_count)}</div></div>
            <div className="mini"><div className="l">Avg Views</div><div className="v">{formatNum(d.reels?.avg_view_count)}</div></div>
            <div className="mini"><div className="l">Median Likes</div><div className="v">{formatNum(d.reels?.median_like_count)}</div></div>
            <div className="mini"><div className="l">Median Views</div><div className="v">{formatNum(d.reels?.median_view_count)}</div></div>
          </div>
          <div style={{fontSize:11,color:'var(--ink-3)'}}>Comments samples: <span className="mono">{(d.reels?.comments_count||[]).join(', ') || '—'}</span></div>
        </div>

        <div className="card span-2">
          <CardH title="Engagement by Post" desc="Likes vs comments scatter for last 12 posts"/>
          <ScatterPlot posts={(d.post_data||[]).map(p=>({x:p.engagement?.likes||0,y:p.engagement?.comments||0}))} xKey="x" yKey="y" xLabel="Likes" yLabel="Comments" height={240}/>
        </div>

        <div className="card span-2">
          <CardH title="Posting Cadence" desc="Hour × Day-of-Week heatmap" right={<span className="pill">{d.post_data?.length||0} posts</span>}/>
          <PostingHeatmap posts={d.post_data}/>
        </div>
      </div>

      <SectionH title="Recent Posts" badge={`${(d.post_data||[]).length} posts`}/>
      <div className="grid full">
        <div className="card">
          <CardH title="Top Performing" desc="Sorted by likes"/>
          <div className="posts-grid cols-4">
            {recentPosts.slice(0, 8).map((p, i) => (
              <div className="post-card" key={p.post_id}>
                <div className="cover placeholder">post {i+1}</div>
                <div className="rank">#{i+1}</div>
                <div className="badge">{p.product_type === 'clips' ? 'Reel' : p.is_carousel ? 'Carousel' : 'Photo'}</div>
                <div className="meta">
                  <span>♥ {formatNum(p.engagement?.likes)}</span>
                  <span>💬 {formatNum(p.engagement?.comments)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid full">
        <div className="card">
          <CardH title="Post Details" desc="All fields per post — caption, tags, media, engagement"/>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {(d.post_data || []).slice(0,8).map((p, i) => (
              <div key={p.post_id} style={{padding:'12px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:10}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:12,fontSize:11,color:'var(--ink-3)',fontFamily:'JetBrains Mono',marginBottom:6}}>
                  <span>{formatDate(p.created_at)} · {p.created_at?.slice(11,16)} · ID {p.post_id?.slice(0,12)}…</span>
                  <span>{p.is_carousel?'CAROUSEL':p.product_type==='clips'?'REEL':'POST'} · type {p.media_type}</span>
                </div>
                <div style={{fontSize:13,color:'var(--ink)',marginBottom:8,lineHeight:1.5}}>{p.caption || <span style={{color:'var(--ink-4)'}}>No caption</span>}</div>
                <div style={{display:'flex',gap:14,fontSize:11,fontFamily:'JetBrains Mono',color:'var(--ink-3)',flexWrap:'wrap'}}>
                  <span>♥ {formatNum(p.engagement?.likes)}</span>
                  <span>💬 {formatNum(p.engagement?.comments)}</span>
                  <span>🖼 {p.media?.length || 0} media</span>
                  {p.hashtags?.length>0 && <span>#{p.hashtags.length}</span>}
                  {p.tagged_users?.length>0 && <span>@{p.tagged_users.length}</span>}
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
          <CardH title="Tagged Users" right={<span className="pill mono">{d.tagged?.length||0}</span>}/>
          {d.tagged?.length ? (
            <div className="user-list">{d.tagged.map((u,i) => (
              <div className="user-row" key={i}>
                <div className="av">{(u.username||'').slice(0,2).toUpperCase()}</div>
                <div className="nm"><div className="h">@{u.username}</div><div className="s">ID {u.userid}</div></div>
              </div>
            ))}</div>
          ) : <div className="empty">No tagged users</div>}
        </div>
        <div className="card">
          <CardH title="Hashtags Used" right={<span className="pill mono">{d.hashtags_count?.length||0}</span>}/>
          {d.hashtags_count?.length ? (
            <div className="chips">{d.hashtags_count.map((h,i) => <span className="chip" key={i}>#{h.name} <strong>×{h.count}</strong></span>)}</div>
          ) : <div className="empty">No hashtags found</div>}
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:8}}>Locations tagged: <span className="mono">{(d.locations||[]).length}</span></div>
        </div>
      </div>

      <SectionH title="Audience Intelligence" right={
        <div className="tabs" style={{marginLeft:8}}>
          <button className={`tab ${audienceTab==='followers'?'active':''}`} onClick={()=>setAudienceTab('followers')}>Followers</button>
          <button className={`tab ${audienceTab==='likers'?'active':''}`} onClick={()=>setAudienceTab('likers')} disabled={!al}>Likers</button>
          <button className="tab" disabled title={ac?.error}>Commenters {ac?.error?'(empty)':''}</button>
        </div>
      }/>
      {audienceData ? (
        <AudienceBlock audience={audienceData} credHist={audienceTab==='followers'?d.audience?.audience_credibility_followers_histogram:d.audience?.audience_credibility_likers_histogram} sourceLabel={audienceTab==='followers'?'Followers':'Likers'}/>
      ) : <div className="empty">Audience data not available</div>}
    </div>
  );
}

window.InstagramPage = InstagramPage;
