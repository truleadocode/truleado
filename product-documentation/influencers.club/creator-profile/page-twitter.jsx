/* X (Twitter) page — Elon Musk */
function TwitterPage({ data }) {
  const d = data;

  const tags = [
    d.is_verified && { kind:'good', label:'Verified' },
    d.subscriber_button && { kind:'accent', label:'Premium' },
    d.super_followed_by && { kind:'accent', label:'Super Follow' },
    d.direct_messaging ? { label:'DMs open' } : { label:'DMs closed' },
    d.streamer && { label:'Streamer' },
    d.has_merch ? { kind:'good', label:'Merch' } : { label:'No merch' },
    d.has_paid_partnership && { kind:'warn', label:'Paid partnerships' },
    d.promotes_affiliate_links && { kind:'warn', label:'Affiliate links' },
    d.uses_link_in_bio ? { label:'Link-in-bio' } : null,
  ].filter(Boolean);

  const kpis = [
    { label:'Followers', value: formatNum(d.follower_count), sub:`${formatNum(d.following_count)} following` },
    { label:'Engagement Rate', value: formatPctRaw(d.engagement_percent, 2), sub:'of last 20 tweets' },
    { label:'Avg Engagement', value: `${formatNum(d.avg_likes)} ♥ · ${formatNum(d.avg_views)} 👁`, sub:`${formatNum(d.avg_reply)} ↩ · ${formatNum(d.avg_retweet)} ↺` },
    { label:'Total Tweets', value: formatNum(d.tweets_count), sub:`${formatNum(d.media_count)} media · ${formatNum(d.creator_favorite_count)} favs` },
  ];

  const tt = d.tweets_type || {};
  const ttArr = [
    { label:'Original', value: tt.ordinary, color:'#000' },
    { label:'Retweets', value: tt.retweeted, color:'#1d9bf0' },
    { label:'Quoted', value: tt.quoted, color:'#7e5bef' },
    { label:'Replies', value: tt.conversation, color:'#10b981' },
  ];

  const langCounts = (d.languages_tweet||[]).reduce((m, l) => { m[l] = (m[l]||0)+1; return m; }, {});
  const langData = Object.entries(langCounts).map(([k,v]) => ({label:k.toUpperCase(), value:v}));

  return (
    <div className="page">
      <TopNav active="twitter"/>
      <ProfileHead platform="twitter" profile={d} kpis={kpis} tags={tags}/>

      <SectionH title="Profile Snapshot" badge={`@${d.username} · ID ${d.userid}`}/>
      <div className="grid">
        <div className="card">
          <CardH title="Identity & Account"/>
          <div className="dl">
            <div><span className="k">Full name</span><span className="v">{d.full_name}</span></div>
            <div><span className="k">Username</span><span className="v">@{d.username}</span></div>
            <div><span className="k">User ID</span><span className="v">{d.userid}</span></div>
            <div><span className="k">Joined</span><span className="v">{formatDate(d.join_date)}</span></div>
            <div><span className="k">Verified</span><span className="v">{String(d.is_verified)}</span></div>
            <div><span className="k">Direct messaging</span><span className="v">{String(d.direct_messaging)}</span></div>
            <div><span className="k">Subscriber button</span><span className="v">{String(d.subscriber_button)}</span></div>
            <div><span className="k">Super followed</span><span className="v">{String(d.super_followed_by)}</span></div>
            <div><span className="k">Most recent post</span><span className="v">{formatDate(d.most_recent_post_date)}</span></div>
            <div><span className="k">Languages</span><span className="v">{(d.language_code||[]).join(', ') || '—'}</span></div>
            <div><span className="k">Has merch</span><span className="v">{String(d.has_merch)}</span></div>
            <div><span className="k">Paid partnership</span><span className="v">{String(d.has_paid_partnership)}</span></div>
            <div><span className="k">Affiliate links</span><span className="v">{String(d.promotes_affiliate_links)}</span></div>
            <div><span className="k">Streamer</span><span className="v">{String(d.streamer)}</span></div>
            <div><span className="k">Exists</span><span className="v">{String(d.exists)}</span></div>
          </div>
        </div>
        <div className="card">
          <CardH title="Bio & Links"/>
          <div style={{fontSize:13,color:'var(--ink-2)',lineHeight:1.5}}>{d.biography || <span style={{color:'var(--ink-4)'}}>No biography</span>}</div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Links in bio ({d.links_in_bio?.length||0})</div>
            {d.links_in_bio?.length ? d.links_in_bio.map((l,i)=><div key={i} style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--accent-3)',padding:'2px 0',wordBreak:'break-all'}}>{typeof l==='string'?l:JSON.stringify(l)}</div>) : <div className="empty" style={{padding:10}}>None</div>}
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Other links ({d.other_links?.length||0})</div>
            {d.other_links?.length ? d.other_links.map((l,i)=><div key={i} style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--accent-3)',padding:'2px 0',wordBreak:'break-all'}}>{typeof l==='string'?l:JSON.stringify(l)}</div>) : <div className="empty" style={{padding:10}}>None</div>}
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--ink-3)',textTransform:'uppercase',letterSpacing:'.07em',marginBottom:6,marginTop:6}}>Cross-platforms</div>
            <div className="chips">{Object.entries(d.platforms||{}).flatMap(([k, arr]) => (arr||[]).map((v, i) => <span className="chip" key={`${k}${i}`}>{k}: {typeof v==='string'?v:v.username||JSON.stringify(v)}</span>))}</div>
          </div>
        </div>
      </div>

      <SectionH title="Tweet Performance"/>
      <div className="grid">
        <div className="card">
          <CardH title="Tweet Type Mix" desc="Last 20 tweets composition"/>
          <div className="donut-wrap">
            <Donut size={130} thickness={18} data={ttArr.map(t=>({value:t.value||0,label:t.label}))} colors={ttArr.map(t=>t.color)}/>
            <div className="donut-legend">
              {ttArr.map((t,i) => <div className="legend-row" key={i}><div className="lhs"><span className="swatch" style={{background:t.color}}/><span className="name">{t.label}</span></div><div className="pct">{t.value||0}</div></div>)}
            </div>
          </div>
        </div>
        <div className="card">
          <CardH title="Engagement Mix" desc="Average per-tweet"/>
          <div className="minis" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
            <div className="mini"><div className="l">Avg Likes</div><div className="v">{formatNum(d.avg_likes)}</div></div>
            <div className="mini"><div className="l">Avg Views</div><div className="v">{formatNum(d.avg_views)}</div></div>
            <div className="mini"><div className="l">Avg Replies</div><div className="v">{formatNum(d.avg_reply)}</div></div>
            <div className="mini"><div className="l">Avg Retweets</div><div className="v">{formatNum(d.avg_retweet)}</div></div>
            <div className="mini"><div className="l">Avg Quotes</div><div className="v">{formatNum(d.avg_quotes)}</div></div>
            <div className="mini"><div className="l">Creator Favs</div><div className="v">{formatNum(d.creator_favorite_count)}</div></div>
          </div>
        </div>

        <div className="card span-2">
          <CardH title="Posting Heatmap" desc="When tweets land — hour × weekday"/>
          <PostingHeatmap posts={d.post_data}/>
        </div>

        <div className="card">
          <CardH title="Tweet Languages" desc="Detected per tweet"/>
          {langData.length ? <BarsList data={langData} formatter={v=>`${v} tweet${v===1?'':'s'}`} gradient="linear-gradient(90deg,#1d9bf0,#7e5bef)"/> : <div className="empty">No data</div>}
        </div>

        <div className="card">
          <CardH title="Retweet Behavior" desc="Outbound RTs from last 20 tweets"/>
          <div className="dl single">
            <div><span className="k">Total retweets aggregate</span><span className="v">{(d.retweets_count||[]).reduce((s,v)=>s+(+v||0),0).toLocaleString()}</span></div>
            <div><span className="k">RT'd users tracked</span><span className="v">{d.retweet_users?.length||0}</span></div>
            <div><span className="k">Tagged usernames</span><span className="v">{d.tagged_usernames?.length||0}</span></div>
            <div><span className="k">Recommended users</span><span className="v">{d.recommended_users?.length||0}</span></div>
            <div><span className="k">Hashtags</span><span className="v">{d.hashtags_count?.length||0}</span></div>
          </div>
        </div>
      </div>

      <SectionH title="Recent Tweets" badge={`${d.post_data?.length||0} tweets`}/>
      <div className="grid full">
        <div className="card">
          <CardH title="Tweet Feed" desc="Full text, lang, media & engagement"/>
          <div className="tweet-list">
            {(d.post_data||[]).slice(0, 10).map((p, i) => (
              <div className="tweet" key={p.tweet_id}>
                <div className="text">
                  <small><span>{formatDate(p.created_at)}</span><span>·</span><span>{p.lang?.toUpperCase()}</span><span>·</span><span>ID {p.tweet_id?.slice(0,12)}…</span>{p.is_pinned && <span style={{color:'var(--warn)'}}>📌 Pinned</span>}</small>
                  <div>{p.text || <span style={{color:'var(--ink-4)'}}>(no text)</span>}</div>
                  {p.media?.length > 0 && <div style={{marginTop:8,fontSize:11,color:'var(--ink-3)'}}>📎 {p.media.length} media: {p.media.map(m=>m.type).join(', ')}</div>}
                  <div className="stats">
                    <span>♥ {formatNum(p.engagement?.like_count)}</span>
                    <span>↺ {formatNum(p.engagement?.retweet_count)}</span>
                    <span>↩ {formatNum(p.engagement?.reply_count)}</span>
                    <span>" {formatNum(p.engagement?.quote_count)}</span>
                    <span>👁 {formatNum(p.engagement?.view_count)}</span>
                    {p.hashtags?.length > 0 && <span>#{p.hashtags.length}</span>}
                    {p.mentions?.length > 0 && <span>@{p.mentions.length}</span>}
                    <a href={p.tweet_url} style={{color:'var(--accent-3)',marginLeft:'auto'}} target="_blank">↗</a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionH title="Network & Discovery"/>
      <div className="grid">
        <div className="card">
          <CardH title="Hashtags" right={<span className="pill mono">{d.hashtags_count?.length||0}</span>}/>
          {d.hashtags_count?.length ? <div className="chips">{d.hashtags_count.map((h,i)=><span className="chip" key={i}>#{h.name} <strong>×{h.count}</strong></span>)}</div> : <div className="empty">No hashtags</div>}
        </div>
        <div className="card">
          <CardH title="Tagged Usernames" right={<span className="pill mono">{d.tagged_usernames?.length||0}</span>}/>
          {d.tagged_usernames?.length ? <div className="chips">{d.tagged_usernames.map((u,i)=><span className="chip" key={i}>@{typeof u==='string'?u:u.username||JSON.stringify(u)}</span>)}</div> : <div className="empty">None</div>}
        </div>
        <div className="card">
          <CardH title="Retweeted Users" right={<span className="pill mono">{d.retweet_users?.length||0}</span>}/>
          {d.retweet_users?.length ? <div className="chips">{d.retweet_users.map((u,i)=><span className="chip" key={i}>@{typeof u==='string'?u:u.username||JSON.stringify(u)}</span>)}</div> : <div className="empty">None</div>}
        </div>
        <div className="card">
          <CardH title="Recommended Accounts" desc="Suggested by Twitter algorithm"/>
          {d.recommended_users?.length ? (
            <div className="user-list">{d.recommended_users.map((u,i) => {
              const obj = typeof u === 'string' ? {username: u} : u;
              const name = obj.full_name || obj.name || obj.username || '?';
              return <div className="user-row" key={i}><div className="av">{name.slice(0,2).toUpperCase()}</div><div className="nm"><div className="h">{name}</div><div className="s">@{obj.username}</div></div></div>;
            })}</div>
          ) : <div className="empty">None</div>}
        </div>
      </div>
    </div>
  );
}
window.TwitterPage = TwitterPage;
