/* Sample-pages render layer. No build step, no React.
 *
 * Reads the embedded fixture (`<script id="data">`) + the
 * `window.__PLATFORM__` flag, then pours the data into the layout
 * skeleton in _template.html.
 */

(function () {
  const root = JSON.parse(document.getElementById('data').textContent);
  const platform = window.__PLATFORM__;
  const result = root.result || {};
  const block = result[platform] || {};
  const audience =
    (block.audience && block.audience.audience_followers && block.audience.audience_followers.data) ||
    null;

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const fmtCount = (n) => {
    if (n == null) return '—';
    if (n >= 1_000_000_000) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1_000_000) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  };
  const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(2)}%`);
  const fmtMonth = (yyyymm) => {
    const m = yyyymm.match(/(\d{4})[-_/]?(\d{2})/);
    if (!m) return yyyymm;
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2]-1] + " '" + m[1].slice(2);
  };
  const platformLabel = {
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    twitter: 'Twitter / X',
    twitch: 'Twitch',
  }[platform] || platform;

  // Per-platform field accessors.
  const followers =
    block.follower_count ??
    block.subscriber_count ??
    block.total_followers ??
    null;
  const engagementPercent = block.engagement_percent ?? null;
  const username = block.username ?? block.custom_url ?? '';
  const fullName = block.full_name ?? block.title ?? block.displayName ?? username;
  const profilePic = block.profile_picture_hd ?? block.profile_picture ?? block.profileImageURL ?? '';
  const biography = block.biography ?? block.description ?? '';
  const location = result.location ?? block.country ?? null;
  const language = result.speaking_language ?? (Array.isArray(block.language_code) ? block.language_code[0] : null);
  const niches = (result.ai_niches || []).map((n) => ({ name: n.niche, pct: n.percentage }));
  const topNiche = niches[0]?.name ?? null;
  const linksInBio = result.links_in_bio || block.links_in_bio || [];
  const creatorHas = result.creator_has || {};
  const hashtags = (block.hashtags_count || []).map((h) => h.hashtag).slice(0, 14)
    .concat((block.hashtags || []).slice(0, 14)).slice(0, 14);

  // ─────────────────────────────────────────────
  // Top bar
  // ─────────────────────────────────────────────
  document.getElementById('topbar').innerHTML = `
    <div class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-tru-slate-100">
      ${profilePic ? `<img src="${profilePic}" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer">` : ''}
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2">
        <h1 class="text-base font-bold truncate">${fullName}</h1>
        <span class="text-xs text-tru-slate-500 truncate">@${username}</span>
        <span class="chip chip-slate uppercase">${platformLabel}</span>
        <span class="text-xs text-tru-slate-500">${fmtCount(followers)} followers</span>
      </div>
    </div>
    <a class="text-xs text-tru-blue-600 hover:underline" target="_blank" href="${platformExternalUrl()}">Open on platform ↗</a>
  `;

  function platformExternalUrl() {
    switch (platform) {
      case 'instagram': return `https://instagram.com/${username}`;
      case 'youtube': return `https://youtube.com/${username.startsWith('@') ? username : '@' + username}`;
      case 'tiktok': return `https://tiktok.com/@${username.replace(/^@/, '')}`;
      case 'twitter': return `https://twitter.com/${username}`;
      case 'twitch': return `https://twitch.tv/${username}`;
      default: return '#';
    }
  }

  // ─────────────────────────────────────────────
  // Meta column
  // ─────────────────────────────────────────────
  const platformsList = Array.from(new Set([platform, ...Object.keys(creatorHas)]));
  document.getElementById('meta-col').innerHTML = `
    <div>
      <div class="flex items-start gap-3">
        <div class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-tru-slate-100">
          ${profilePic ? `<img src="${profilePic}" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer">` : ''}
        </div>
        <div class="min-w-0">
          <div class="text-[15px] font-bold truncate">${fullName}</div>
          <div class="text-xs text-tru-blue-600 truncate">@${username}</div>
        </div>
      </div>
      ${biography ? `<p class="mt-3 line-clamp-3 text-[12px] leading-relaxed text-tru-slate-600">${escapeHtml(biography)}</p>` : ''}
    </div>

    <ul class="space-y-1.5 text-[12px] text-tru-slate-700">
      ${location ? `<li>📍 ${escapeHtml(location)}</li>` : ''}
      ${language ? `<li>🌐 ${escapeHtml(language)}</li>` : ''}
      ${topNiche ? `<li>💼 ${escapeHtml(topNiche)}</li>` : ''}
    </ul>

    ${linksInBio.length ? `
      <div class="tru-card">
        <h3 class="uppercase-label mb-2.5">Links Used</h3>
        <ul class="space-y-1.5">
          ${linksInBio.slice(0, 3).map((l) => `<li><a class="inline-flex items-center gap-1 truncate rounded-md border border-tru-slate-200 px-2 py-1 text-[11px] text-tru-slate-700 hover:border-tru-blue-600 hover:text-tru-blue-600" href="${l}" target="_blank">↗ ${shortHost(l)}</a></li>`).join('')}
          ${linksInBio.length > 3 ? `<li><span class="inline-flex rounded-md border border-tru-slate-200 px-2 py-1 text-[11px] text-tru-slate-500">+${linksInBio.length - 3} more</span></li>` : ''}
        </ul>
      </div>
    ` : ''}

    <button class="w-full bg-tru-blue-600 text-white rounded-md py-2 text-sm font-semibold hover:bg-tru-blue-700">✉️ Add creator to a list</button>
    <button class="w-full bg-white border border-tru-slate-200 rounded-md py-2 text-sm font-semibold text-tru-slate-700 hover:bg-tru-slate-50">Exclude from results</button>

    <div class="tru-card">
      <h3 class="uppercase-label">Cross-Platform Summary</h3>
      <ul class="mt-3 space-y-3 text-[13px]">
        <li class="flex items-baseline justify-between">
          <span class="text-tru-slate-500">Total Reach</span>
          <span class="font-semibold tabular-nums text-tru-slate-900">${fmtCount(followers)}</span>
        </li>
        <li class="flex items-baseline justify-between">
          <span class="text-tru-slate-500">Most Engaged</span>
          <span class="font-semibold capitalize text-tru-slate-900">${platformLabel}</span>
        </li>
        <li class="flex items-baseline justify-between">
          <span class="text-tru-slate-500">Avg Engagement</span>
          <span class="font-semibold tabular-nums text-tru-slate-900">${fmtPct(engagementPercent)}</span>
        </li>
      </ul>
      <div class="mt-4 flex items-center gap-2 border-t border-tru-slate-100 pt-3">
        <span class="uppercase-label">Platforms</span>
        <div class="ml-auto flex gap-1.5">
          ${platformsList.map((p) => `<div class="flex h-6 w-6 items-center justify-center rounded-md bg-tru-slate-100 text-[10px] font-bold uppercase" title="${p}">${p[0]}</div>`).join('')}
        </div>
      </div>
    </div>

    <div class="tru-card text-[13px] space-y-3">
      ${statRow('Followers', fmtCount(followers))}
      ${statRow('Engagement Rate', fmtPct(engagementPercent))}
      ${statRow('Number of Posts', fmtCount(numericPostsCount()))}
      ${statRow('Posts per Month', postsPerMonthVal())}
      ${statRow('Average Views', fmtCount(avgViewsVal()))}
      ${statRow('Average Reel Likes', fmtCount(reelsAvgLikes()))}
      ${statRow('Average Likes', fmtCount(block.avg_likes))}
      ${statRow('Average Comments', fmtCount(block.avg_comments ?? block.comment_count_avg ?? block.avg_reply))}
    </div>
  `;

  function statRow(label, value) {
    return `
      <div class="flex items-baseline justify-between">
        <span class="text-tru-slate-500">${label}</span>
        <span class="font-semibold tabular-nums text-tru-blue-600">${value ?? '—'}</span>
      </div>
    `;
  }
  function numericPostsCount() {
    return block.media_count ?? block.video_count ?? block.tweets_count ?? null;
  }
  function postsPerMonthVal() {
    const v = block.posting_frequency_recent_months ?? block.posting_frequency;
    return typeof v === 'number' ? v.toFixed(1) : '—';
  }
  function avgViewsVal() {
    return block.avg_views ?? block.play_count_avg ?? null;
  }
  function reelsAvgLikes() {
    return block.reels && block.reels.avg_likes;
  }

  // ─────────────────────────────────────────────
  // Analytics tab
  // ─────────────────────────────────────────────
  const analytics = document.getElementById('tab-analytics');
  analytics.innerHTML = `
    ${renderGrowthCard()}
    ${renderErHistogram()}
    ${renderPlatformPanel()}
    ${platform === 'youtube' ? renderIncomeCard() : ''}
    ${renderTopHashtags()}
  `;
  // Attach charts
  setTimeout(() => {
    drawGrowthChart();
    drawErHistogramChart();
  }, 0);

  function renderGrowthCard() {
    return `
      <div class="tru-card">
        <div class="flex items-baseline justify-between">
          <div>
            <h3 class="text-sm font-semibold">Creator Growth</h3>
            <p class="mt-0.5 text-xs text-tru-slate-500">Last 12 months — historical follower data approximated.</p>
          </div>
          <span class="approx-badge">Approximated</span>
        </div>
        <div class="mt-3 h-48"><canvas id="growth-chart"></canvas></div>
      </div>
    `;
  }
  function drawGrowthChart() {
    const ctx = document.getElementById('growth-chart');
    if (!ctx) return;
    const months = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
    // Synthesize a small drift around `followers` so the chart isn't flat-flat.
    const base = followers || 100000;
    const data = months.map((_, i) => base * (1 + (i - 6) * 0.005));
    new Chart(ctx, {
      type: 'line',
      data: { labels: months, datasets: [{ data, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', borderWidth: 2, pointRadius: 3, tension: 0.3, fill: false }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => fmtCount(+v) }, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }, responsive: true, maintainAspectRatio: false },
    });
  }

  function renderErHistogram() {
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold">Engagement Rate Distribution</h3>
        <p class="mt-0.5 text-xs text-tru-slate-500">Bucketed across this creator's recent posts.</p>
        <div class="mt-3 h-40"><canvas id="er-chart"></canvas></div>
      </div>
    `;
  }
  function drawErHistogramChart() {
    const ctx = document.getElementById('er-chart');
    if (!ctx) return;
    const buckets = ['0-1%','1-2%','2-3%','3-4%','4-5%','5-6%','6-7%','7-8%','8%+'];
    const posts = block.post_data || [];
    const counts = new Array(buckets.length).fill(0);
    posts.forEach((p) => {
      const e = p.engagement || {};
      const v = e.views || 0;
      if (!v) return;
      const er = ((e.likes || 0) + (e.comments || 0)) / v;
      const idx = Math.min(8, Math.floor(er * 100));
      counts[idx]++;
    });
    const highlightIdx = engagementPercent != null ? Math.min(8, Math.floor(engagementPercent / 1)) : -1;
    const colors = counts.map((_, i) => i === highlightIdx ? '#facc15' : '#cbd5e1');
    new Chart(ctx, {
      type: 'bar',
      data: { labels: buckets, datasets: [{ data: counts, backgroundColor: colors, borderRadius: 4 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { display: false }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } }, responsive: true, maintainAspectRatio: false },
    });
  }

  function renderPlatformPanel() {
    if (platform === 'instagram') return renderInstagramPanel();
    if (platform === 'youtube') return renderYouTubePanel();
    if (platform === 'tiktok') return renderTikTokPanel();
    if (platform === 'twitter') return renderTwitterPanel();
    if (platform === 'twitch') return renderTwitchPanel();
    return '';
  }

  function renderInstagramPanel() {
    const tagged = block.tagged || [];
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Instagram Insights</h3>
        <div class="grid grid-cols-3 gap-3 text-[11px]">
          ${miniStat('Reels share', block.reels_percentage_last_12_posts != null ? `${block.reels_percentage_last_12_posts.toFixed(0)}%` : '—', 'Last 12 posts')}
          ${miniStat('Avg likes (median)', fmtCount(block.likes_median))}
          ${miniStat('Avg comments (median)', fmtCount(block.comments_median))}
        </div>
        ${tagged.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Recently tagged (${tagged.length})</h4>
            <div class="flex flex-wrap gap-1.5">
              ${tagged.slice(0, 8).map((t) => `<span class="chip chip-slate">@${escapeHtml(t.username)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderYouTubePanel() {
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Long videos vs Shorts</h3>
        <div class="grid grid-cols-2 gap-3">
          ${splitCard('Long videos', [
            ['Avg views', fmtCount(block.avg_views_long)],
            ['ER', fmtPct(block.engagement_percent_long)],
            ['Posts/mo', (block.posting_frequency_long ?? '—').toString().slice(0, 4)],
          ])}
          ${splitCard('Shorts', [
            ['Avg views', fmtCount(block.avg_views_shorts)],
            ['ER', fmtPct(block.engagement_percent_shorts)],
            ['Posts/mo', (block.posting_frequency_shorts ?? '—').toString().slice(0, 4)],
          ])}
        </div>
        ${block.shorts_percentage != null ? `<div class="mt-2 text-[11px] text-tru-slate-500">Shorts make up <span class="font-semibold text-tru-slate-700">${block.shorts_percentage.toFixed(0)}%</span> of recent uploads.</div>` : ''}
      </div>
    `;
  }

  function renderTikTokPanel() {
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">TikTok Insights</h3>
        <div class="grid grid-cols-4 gap-3 text-[11px]">
          ${miniStat('Region', block.region || '—')}
          ${miniStat('Avg plays', fmtCount(block.play_count_avg))}
          ${miniStat('Total likes', fmtCount(block.total_likes))}
          ${miniStat('Total saves', fmtCount(block.total_saves))}
        </div>
        ${(block.brands_found || []).length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Brands mentioned</h4>
            <div class="flex flex-wrap gap-1.5">
              ${block.brands_found.map((b) => `<span class="chip chip-slate">${escapeHtml(b)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTwitterPanel() {
    const tt = block.tweets_type || {};
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Twitter / X Insights</h3>
        <div class="grid grid-cols-4 gap-3 text-[11px]">
          ${miniStat('Avg likes', fmtCount(block.avg_likes))}
          ${miniStat('Avg replies', fmtCount(block.avg_reply))}
          ${miniStat('Avg retweets', fmtCount(block.avg_retweet))}
          ${miniStat('Avg quotes', fmtCount(block.avg_quotes))}
        </div>
        <div class="mt-4 grid grid-cols-4 gap-1.5 text-[11px]">
          ${Object.entries(tt).map(([k, v]) => `<div class="rounded-md bg-tru-slate-100 p-2 text-center"><div class="text-tru-slate-500 capitalize">${k}</div><div class="font-bold tabular-nums">${fmtCount(v)}</div></div>`).join('')}
        </div>
        ${(block.recommended_users || []).length ? `<div class="mt-4"><h4 class="uppercase-label mb-2">Recommended users</h4><div class="flex flex-wrap gap-1.5">${block.recommended_users.slice(0, 8).map((u) => `<span class="chip chip-slate">@${escapeHtml(u)}</span>`).join('')}</div></div>` : ''}
      </div>
    `;
  }

  function renderTwitchPanel() {
    const panels = (block.panels_titles || []).map((title, i) => ({
      title,
      desc: (block.panels_descriptions || [])[i],
      url: (block.panels_urls || [])[i],
      img: (block.panels_image || [])[i],
    }));
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Twitch Insights</h3>
        <div class="flex flex-wrap items-center gap-2">
          ${block.isPartner ? `<span class="chip chip-emerald">✓ Twitch Partner</span>` : ''}
          ${block.last_broadcast_game ? `<span class="chip chip-slate">🎮 ${escapeHtml(block.last_broadcast_game)}</span>` : ''}
          ${block.last_streamed ? `<span class="text-[11px] text-tru-slate-500">Last streamed ${block.last_streamed}</span>` : ''}
        </div>
        <div class="mt-3 grid grid-cols-3 gap-3 text-[11px]">
          ${miniStat('Streamed (30d)', block.streamed_hours_last_30_days ? `${block.streamed_hours_last_30_days.toFixed(0)} h` : '—')}
          ${miniStat('Streams (30d)', fmtCount(block.streams_count_last_30_days))}
          ${miniStat('Avg viewers', fmtCount(block.avg_views))}
        </div>
        ${panels.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Channel panels (${panels.length})</h4>
            <div class="grid grid-cols-2 gap-2">
              ${panels.map((p) => `
                <div class="flex items-start gap-2 rounded-md border border-tru-slate-200 p-2 text-[11px]">
                  ${p.img ? `<img src="${p.img}" alt="" class="h-10 w-10 shrink-0 rounded object-cover" referrerpolicy="no-referrer">` : ''}
                  <div class="min-w-0">
                    <div class="font-semibold truncate">${escapeHtml(p.title || 'Panel')}</div>
                    ${p.desc ? `<div class="text-tru-slate-500 line-clamp-2">${escapeHtml(p.desc)}</div>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderIncomeCard() {
    const inc = block.income;
    if (!inc) return '';
    const lower = inc.lower ?? inc.min;
    const upper = inc.upper ?? inc.max;
    const cur = inc.currency || 'USD';
    if (lower == null && upper == null) return '';
    const sym = cur === 'USD' ? '$' : cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : `${cur} `;
    return `
      <div class="rounded-lg border border-tru-slate-200 bg-emerald-50/50 p-4">
        <h3 class="text-sm font-semibold flex items-center gap-2">📈 Estimated Creator Income (projected earnings)</h3>
        <p class="mt-1 text-xs text-tru-slate-500">Approximated by our enrichment provider from public engagement signals.</p>
        <div class="mt-3 flex items-baseline gap-6">
          ${lower != null ? `<div><div class="uppercase-label">Lower</div><div class="text-2xl font-bold tabular-nums mt-0.5">${sym}${fmtCount(lower)}</div></div>` : ''}
          ${upper != null ? `<div><div class="uppercase-label">Upper</div><div class="text-2xl font-bold tabular-nums mt-0.5">${sym}${fmtCount(upper)}</div></div>` : ''}
        </div>
      </div>
    `;
  }

  function renderTopHashtags() {
    if (!hashtags.length) return '';
    return `
      <div>
        <h3 class="uppercase-label mb-2">Top Hashtags</h3>
        <div class="flex flex-wrap gap-1.5">
          ${hashtags.slice(0, 12).map((h) => `<span class="chip chip-blue">#${h.replace(/^#/, '')}</span>`).join('')}
          ${hashtags.length > 12 ? `<span class="chip chip-slate">+${hashtags.length - 12} more</span>` : ''}
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────────
  // Posts tab
  // ─────────────────────────────────────────────
  let postsFilter = 'all';
  function renderPostsTab() {
    const all = block.post_data || [];
    const items = postsFilter === 'reels' ? all.filter((p) => p.media_type === 2) : all;
    const showToggle = platform === 'instagram';
    document.getElementById('tab-posts').innerHTML = `
      <div class="flex items-baseline justify-between">
        <h2 class="text-base font-bold">Latest Creator Posts</h2>
        ${showToggle ? `
          <div class="segmented" id="posts-toggle">
            <button data-filter="all" class="${postsFilter === 'all' ? 'active' : ''}">Posts</button>
            <button data-filter="reels" class="${postsFilter === 'reels' ? 'active' : ''}">Reels</button>
          </div>
        ` : ''}
      </div>
      <div class="grid grid-cols-3 gap-3">
        ${items.slice(0, 12).map((p) => renderPostTile(p)).join('')}
      </div>
    `;
    if (showToggle) {
      document.querySelectorAll('#posts-toggle button').forEach((btn) => {
        btn.addEventListener('click', () => {
          postsFilter = btn.dataset.filter;
          renderPostsTab();
        });
      });
    }
  }
  renderPostsTab();

  function renderPostTile(p) {
    const media = (p.media || []).find((m) => m.type === 'image') || (p.media || [])[0];
    const thumb = (p.thumbnails && p.thumbnails.url) || (media && media.url) || '';
    const isVideo = p.media_type === 2 || (media && media.type === 'video');
    const e = p.engagement || {};
    const url = p.post_url || p.tweet_url || p.url || '#';
    const date = p.created_at || p.published_at || (p.taken_at ? new Date(p.taken_at * 1000).toLocaleDateString() : '');
    const caption = (p.caption || p.text || p.title || '').slice(0, 80);
    return `
      <a href="${url}" target="_blank" class="block rounded-md border border-tru-slate-200 bg-white overflow-hidden hover:shadow-sm">
        <div class="aspect-square w-full bg-tru-slate-100 relative">
          ${thumb && !isVideo ? `<img src="${thumb}" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer">` : `<div class="flex h-full w-full items-center justify-center text-tru-slate-400 text-2xl">${isVideo ? '▶' : ''}</div>`}
        </div>
        <div class="p-2 text-[11px]">
          <div class="text-tru-slate-500 mb-1">${date}</div>
          <div class="line-clamp-2 text-tru-slate-700 mb-2">${escapeHtml(caption)}</div>
          <div class="flex items-center gap-3 text-tru-slate-500">
            <span>♥ ${fmtCount(e.likes)}</span>
            <span>💬 ${fmtCount(e.comments)}</span>
          </div>
        </div>
      </a>
    `;
  }

  // ─────────────────────────────────────────────
  // Similar Accounts tab (synthesised — fixtures don't include similars)
  // ─────────────────────────────────────────────
  document.getElementById('tab-similar').innerHTML = `
    <div class="rounded-lg border border-tru-slate-200 overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-tru-slate-50 text-[11px] uppercase tracking-wider text-tru-slate-500">
          <tr>
            <th class="px-4 py-2 text-left">Account</th>
            <th class="px-4 py-2 text-right">Subscribers</th>
            <th class="px-4 py-2 text-right">Avg Engagement</th>
            <th class="px-4 py-2 text-right">Similarity Score</th>
          </tr>
        </thead>
        <tbody>
          ${synthSimilar(8).map((s, i) => `
            <tr class="border-t border-tru-slate-100">
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="h-8 w-8 rounded-full" style="background:${s.color}"></div>
                  <div>
                    <div class="font-semibold">${escapeHtml(s.name)}</div>
                    <div class="text-xs text-tru-slate-500">@${escapeHtml(s.handle)}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-right tabular-nums">${fmtCount(s.subs)}</td>
              <td class="px-4 py-3 text-right tabular-nums">${fmtPct(s.er)}</td>
              <td class="px-4 py-3 text-right">
                <span class="score-badge ${s.score >= 90 ? 'score-high' : s.score >= 80 ? 'score-mid' : 'score-low'}">${s.score}</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p class="border-t border-tru-slate-100 bg-tru-slate-50 px-4 py-2 text-[11px] text-tru-slate-500">
        Mockup data. The live page calls IC's similarCreators endpoint.
      </p>
    </div>
  `;

  function synthSimilar(n) {
    const colors = ['#1e40af','#7c3aed','#db2777','#16a34a','#ea580c','#0891b2','#65a30d','#be185d'];
    return Array.from({ length: n }, (_, i) => ({
      name: ['Creator A','Creator B','Creator C','Creator D','Creator E','Creator F','Creator G','Creator H'][i],
      handle: ['similar_acc_1','similar_acc_2','similar_acc_3','similar_acc_4','similar_acc_5','similar_acc_6','similar_acc_7','similar_acc_8'][i],
      color: colors[i],
      subs: Math.round(followers * (0.05 + Math.random() * 0.5)),
      er: 0.5 + Math.random() * 5,
      score: Math.max(60, 100 - i * 3),
    }));
  }

  // ─────────────────────────────────────────────
  // Tab switching
  // ─────────────────────────────────────────────
  const tabs = document.querySelectorAll('.tab-trigger');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      const target = t.dataset.tab;
      tabs.forEach((x) => {
        x.classList.toggle('active', x === t);
        x.classList.toggle('text-tru-blue-700', x === t);
        x.classList.toggle('border-tru-blue-600', x === t);
        x.classList.toggle('text-tru-slate-500', x !== t);
        x.classList.toggle('border-transparent', x !== t);
      });
      panels.forEach((p) => p.classList.toggle('hidden', p.id !== `tab-${target}`));
    });
  });

  // ─────────────────────────────────────────────
  // helpers
  // ─────────────────────────────────────────────
  function miniStat(label, value, sub) {
    return `<div class="rounded-md border border-tru-slate-200 bg-white p-2"><div class="uppercase-label">${label}</div><div class="font-bold tabular-nums mt-0.5">${value}</div>${sub ? `<div class="text-tru-slate-500 text-[10px]">${sub}</div>` : ''}</div>`;
  }
  function splitCard(title, rows) {
    return `
      <div class="rounded-md border border-tru-slate-200 bg-white p-3">
        <div class="text-xs font-semibold mb-2">${title}</div>
        <dl class="grid grid-cols-3 gap-2 text-[11px]">
          ${rows.map(([k, v]) => `<div><dt class="text-tru-slate-500">${k}</dt><dd class="font-bold tabular-nums">${v}</dd></div>`).join('')}
        </dl>
      </div>
    `;
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function shortHost(url) {
    try {
      const u = new URL(url);
      return (u.protocol === 'https:' ? 'https://www.' : `${u.protocol}//`) + u.hostname.replace(/^www\./, '').slice(0, 6) + '...';
    } catch {
      return url.slice(0, 16) + '...';
    }
  }
})();
