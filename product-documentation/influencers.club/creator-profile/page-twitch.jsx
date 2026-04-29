/* Twitch page — KaiCenat */
function TwitchPage({ data }) {
  const d = data;
  const channel = d.post_data?.[0]?.data?.channel;
  const shelves = channel?.videoShelves;
  const featured = shelves?.featuredClipShelf?.items || [];
  const recentVods = shelves?.recentVideoShelf?.items || [];

  const tags = [
    d.isPartner && { kind:'good', label:'Partner' },
    d.streamed_hours_last_30_days > 0 ? { kind:'good', label:`${d.streamed_hours_last_30_days}h streamed (30d)` } : { kind:'warn', label:'Inactive 30d' },
    d.has_merch ? { kind:'good', label:'Merch' } : { label:'No merch' },
    d.has_paid_partnership && { kind:'warn', label:'Paid partnership' },
    d.promotes_affiliate_links && { kind:'warn', label:'Affiliate links' },
    { label:`Lang: ${(d.language_code||[]).join(', ') || '—'}` },
  ].filter(Boolean);

  const kpis = [
    { label:'Followers', value: formatNum(d.total_followers), sub:`User ID ${d.user_id}` },
    { label:'Avg Views / Stream', value: formatNum(d.avg_views), sub:'lifetime average' },
    { label:'Streams (30d)', value: d.streams_count_last_30_days, sub:`${d.streamed_hours_last_30_days}h streamed` },
    { label:'Last Streamed', value: formatDate(d.last_streamed), sub:`Game: ${d.last_broadcast_game}` },
  ];

  const reachRatio = d.total_followers ? (d.avg_views / d.total_followers) : 0;

  return (
    <div className="page">
      <TopNav active="twitch"/>
      <ProfileHead platform="twitch" profile={d} kpis={kpis} tags={tags}/>

      <SectionH title="Channel Snapshot" badge={`@${d.username} · ID ${d.user_id}`}/>
      <div className="grid">
        <div className="card">
          <CardH title="Identity & Account"/>
          <div className="dl">
            <div><span className="k">Display name</span><span className="v">{d.displayName}</span></div>
            <div><span className="k">Username</span><span className="v">@{d.username}</span></div>
            <div><span className="k">User ID</span><span className="v">{d.user_id}</span></div>
            <div><span className="k">Partner</span><span className="v">{String(d.isPartner)}</span></div>
            <div><span className="k">Total followers</span><span className="v">{formatNum(d.total_followers)}</span></div>
            <div><span className="k">Avg views</span><span className="v">{formatNum(d.avg_views)}</span></div>
            <div><span className="k">Last broadcast</span><span className="v">{d.last_broadcast_game}</span></div>
            <div><span className="k">Last broadcast ID</span><span className="v">{d.last_broadcast_id}</span></div>
            <div><span className="k">Last streamed</span><span className="v">{formatDate(d.last_streamed)}</span></div>
            <div><span className="k">Streams (30d)</span><span className="v">{d.streams_count_last_30_days}</span></div>
            <div><span className="k">Streamed hours (30d)</span><span className="v">{d.streamed_hours_last_30_days}h</span></div>
            <div><span className="k">Has merch</span><span className="v">{String(d.has_merch)}</span></div>
            <div><span className="k">Paid partnership</span><span className="v">{String(d.has_paid_partnership)}</span></div>
            <div><span className="k">Promotes affiliate</span><span className="v">{String(d.promotes_affiliate_links)}</span></div>
            <div><span className="k">Primary color</span><span className="v">#{channel?.primaryColorHex||'—'}</span></div>
          </div>
        </div>

        <div className="card">
          <CardH title="Activity Status" desc="Stream activity over the last 30 days"/>
          <div style={{padding:'20px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:10,textAlign:'center'}}>
            <div style={{fontSize:48,fontWeight:700,fontFamily:'JetBrains Mono',color: d.streamed_hours_last_30_days > 0 ? 'var(--good)' : 'var(--bad)',letterSpacing:'-.03em'}}>{d.streamed_hours_last_30_days}h</div>
            <div style={{fontSize:12,color:'var(--ink-3)',marginTop:6}}>{d.streams_count_last_30_days} streams · last live {formatDate(d.last_streamed)}</div>
          </div>
          <div className="minis" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
            <div className="mini"><div className="l">Reach Ratio</div><div className="v">{(reachRatio*100).toFixed(2)}%</div><div className="sub">avg viewers / followers</div></div>
            <div className="mini"><div className="l">Last Game</div><div className="v" style={{fontSize:13}}>{d.last_broadcast_game}</div></div>
          </div>
        </div>
      </div>

      <SectionH title="Featured Clips & VODs"/>
      <div className="grid">
        <div className="card">
          <CardH title="Featured Clips" desc="Pinned by the channel" right={<span className="pill mono">{featured.length}</span>}/>
          {featured.length ? (
            <div className="posts-grid cols-2">
              {featured.slice(0, 6).map((c, i) => (
                <div className="post-card wide" key={c.id||i}>
                  <div className="cover" style={{backgroundImage:`url(${c.thumbnailURL||c.thumbnail||''})`}}>{!c.thumbnailURL && !c.thumbnail && <div className="cover placeholder">clip {i+1}</div>}</div>
                  <div className="badge">{c.durationSeconds ? `${c.durationSeconds}s` : 'CLIP'}</div>
                  <div className="meta">
                    <span>{c.title?.slice(0,40)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty">No featured clips</div>}
        </div>
        <div className="card">
          <CardH title="Recent VODs" desc="Past broadcasts" right={<span className="pill mono">{recentVods.length}</span>}/>
          {recentVods.length ? (
            <div className="posts-grid cols-2">
              {recentVods.slice(0, 6).map((v, i) => (
                <div className="post-card wide" key={v.id||i}>
                  <div className="cover" style={{backgroundImage:`url(${v.previewThumbnailURL||v.thumbnail||''})`}}>{!v.previewThumbnailURL && !v.thumbnail && <div className="cover placeholder">VOD {i+1}</div>}</div>
                  <div className="badge">{v.lengthSeconds ? `${Math.floor(v.lengthSeconds/3600)}h` : 'VOD'}</div>
                  <div className="meta">
                    <span>{v.title?.slice(0,30) || `VOD ${i+1}`}</span>
                    <span style={{marginLeft:'auto'}}>{formatNum(v.viewCount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="empty">No recent VODs</div>}
        </div>
      </div>

      <SectionH title="Channel Panels" badge={`${d.panels_titles?.length||0} panels`}/>
      <div className="grid">
        {(d.panels_titles||[]).map((t, i) => (
          <div className="card" key={i}>
            <CardH title={t || `Panel ${i+1}`} desc={`Type: ${d.panels_type?.[i] || '—'}`} right={d.panels_image?.[i] ? <span className="pill">📷</span> : null}/>
            <div style={{fontSize:12,color:'var(--ink-2)',whiteSpace:'pre-wrap',lineHeight:1.5}}>{(d.panels_descriptions?.[i]||'').slice(0,300) || <span style={{color:'var(--ink-4)'}}>No description</span>}</div>
            {d.panels_urls?.[i] && <div style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--accent-3)',wordBreak:'break-all',padding:'6px 0'}}>↗ {d.panels_urls[i]}</div>}
            {d.panels_image?.[i] && <div style={{fontSize:10,color:'var(--ink-3)',fontFamily:'JetBrains Mono',wordBreak:'break-all'}}>img: {d.panels_image[i].slice(0,60)}…</div>}
          </div>
        ))}
        {!(d.panels_titles||[]).length && <div className="card span-2"><div className="empty">No channel panels</div></div>}
      </div>

      <SectionH title="Connected Accounts & Links"/>
      <div className="grid">
        <div className="card">
          <CardH title="Cross-Platform Identity"/>
          <div className="dl">
            {Object.entries(d.social_media||{}).map(([k,v]) => (
              <div key={k}><span className="k">{k}</span><span className="v">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="card">
          <CardH title="Links" desc="In-bio + other links"/>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6}}>Links in bio ({d.links_in_bio?.length||0})</div>
            {d.links_in_bio?.length ? d.links_in_bio.map((l,i)=><div key={i} style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--accent-3)',padding:'4px 0',wordBreak:'break-all'}}>{typeof l==='string'?l:JSON.stringify(l)}</div>) : <div className="empty" style={{padding:10}}>None</div>}
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Other links ({d.other_links?.length||0})</div>
            {d.other_links?.length ? d.other_links.map((l,i)=><div key={i} style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--accent-3)',padding:'4px 0',wordBreak:'break-all'}}>{typeof l==='string'?l:JSON.stringify(l)}</div>) : <div className="empty" style={{padding:10}}>None</div>}
          </div>
        </div>
      </div>

      <SectionH title="API Metadata"/>
      <div className="grid">
        <div className="card">
          <CardH title="Raw GraphQL Response" desc="From the post_data shelf"/>
          <div className="dl">
            <div><span className="k">Channel.id</span><span className="v">{channel?.id}</span></div>
            <div><span className="k">Channel.login</span><span className="v">{channel?.login}</span></div>
            <div><span className="k">Channel.displayName</span><span className="v">{channel?.displayName}</span></div>
            <div><span className="k">Channel.__typename</span><span className="v">{channel?.__typename}</span></div>
            <div><span className="k">Operation</span><span className="v">{d.post_data?.[0]?.extensions?.operationName}</span></div>
            <div><span className="k">Duration</span><span className="v">{d.post_data?.[0]?.extensions?.durationMilliseconds}ms</span></div>
            <div><span className="k">Request ID</span><span className="v">{d.post_data?.[0]?.extensions?.requestID}</span></div>
          </div>
        </div>
        <div className="card">
          <CardH title="Featured Tags" desc="Game/category metadata"/>
          {shelves?.featuredClipShelf?.title && <div className="chip">{shelves.featuredClipShelf.title}</div>}
          {shelves?.recentVideoShelf?.title && <div className="chip" style={{marginLeft:6}}>{shelves.recentVideoShelf.title}</div>}
          <div style={{fontSize:11,color:'var(--ink-3)',marginTop:8}}>This profile does not expose audience intelligence (Twitch's API does not surface follower demographics). Cross-reference with the linked Twitter/Instagram/YouTube profiles for audience data.</div>
        </div>
      </div>
    </div>
  );
}
window.TwitchPage = TwitchPage;
