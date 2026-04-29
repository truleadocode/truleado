/* Sample-pages render layer. No build step, no React.
 *
 * Reads the embedded fixture (`<script id="data">`) + the
 * `window.__PLATFORM__` flag, then pours the full fixture into the
 * IC-style profile mockup defined in _template.html.
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
    if (n == null || isNaN(n)) return '—';
    n = Number(n);
    if (n >= 1_000_000_000) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1_000_000) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(Math.round(n));
  };
  const fmtPct = (n) => (n == null ? '—' : `${Number(n).toFixed(2)}%`);
  const fmtPctW = (w) => (w == null ? '—' : `${(Number(w) * 100).toFixed(1)}%`);
  const fmtMonth = (yyyymm) => {
    const m = String(yyyymm).match(/(\d{4})[-_/]?(\d{2})/);
    if (!m) return yyyymm;
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2]-1] + " '" + m[1].slice(2);
  };
  const platformLabel = ({
    instagram: 'Instagram',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    twitter: 'Twitter / X',
    twitch: 'Twitch',
  })[platform] || platform;

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
  const subniches = (result.ai_subniches || []).map((n) => ({ name: n.subniche || n.niche, pct: n.percentage }));
  const topNiche = niches[0]?.name ?? block.niche_class ?? null;
  const linksInBio = result.links_in_bio || block.links_in_bio || [];
  const otherLinks = result.other_links || block.other_links || [];
  const allLinks = [...new Set([...linksInBio, ...otherLinks].filter(Boolean))];
  const creatorHas = result.creator_has || {};
  const isVerified = block.is_verified ?? false;
  const hashtags = []
    .concat((block.hashtags_count || []).map((h) => h.hashtag || h.name))
    .concat(block.hashtags || [])
    .filter(Boolean);

  // ─────────────────────────────────────────────
  // Top bar
  // ─────────────────────────────────────────────
  document.getElementById('topbar').innerHTML = `
    <div class="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-tru-slate-100">
      ${profilePic ? `<img src="${profilePic}" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer">` : ''}
    </div>
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline gap-2">
        <h1 class="text-base font-bold truncate">${escapeHtml(fullName)}</h1>
        ${isVerified ? '<span class="text-tru-blue-600 text-xs">✓</span>' : ''}
        <span class="text-xs text-tru-slate-500 truncate">@${escapeHtml(username)}</span>
        <span class="chip chip-slate uppercase">${platformLabel}</span>
        <span class="text-xs text-tru-slate-500">${fmtCount(followers)} followers</span>
        <span class="text-xs text-tru-slate-500">${fmtPct(engagementPercent)} ER</span>
      </div>
    </div>
    <a class="text-xs text-tru-blue-600 hover:underline" target="_blank" href="${platformExternalUrl()}">Open on platform ↗</a>
  `;

  function platformExternalUrl() {
    switch (platform) {
      case 'instagram': return `https://instagram.com/${username}`;
      case 'youtube': return `https://youtube.com/${username.startsWith('@') ? username : '@' + username}`;
      case 'tiktok': return `https://tiktok.com/@${String(username).replace(/^@/, '')}`;
      case 'twitter': return `https://twitter.com/${username}`;
      case 'twitch': return `https://twitch.tv/${username}`;
      default: return '#';
    }
  }

  // ─────────────────────────────────────────────
  // Meta column (left rail)
  // ─────────────────────────────────────────────
  const platformsList = Array.from(new Set([platform, ...Object.keys(creatorHas).filter((k) => creatorHas[k])]));
  document.getElementById('meta-col').innerHTML = `
    <div>
      <div class="flex items-start gap-3">
        <div class="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-tru-slate-100 border border-tru-slate-200">
          ${profilePic ? `<img src="${profilePic}" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer">` : ''}
        </div>
        <div class="min-w-0">
          <div class="text-[15px] font-bold truncate flex items-center gap-1">
            ${escapeHtml(fullName)}
            ${isVerified ? '<span class="text-tru-blue-600">✓</span>' : ''}
          </div>
          <div class="text-xs text-tru-blue-600 truncate">@${escapeHtml(username)}</div>
        </div>
      </div>
      ${biography ? `<p class="mt-3 line-clamp-4 text-[12px] leading-relaxed text-tru-slate-600">${escapeHtml(biography)}</p>` : ''}
    </div>

    <ul class="space-y-1.5 text-[12px] text-tru-slate-700">
      ${location ? `<li>📍 ${escapeHtml(location)}</li>` : ''}
      ${language ? `<li>🌐 ${escapeHtml(language)}</li>` : ''}
      ${topNiche ? `<li>💼 ${escapeHtml(topNiche)}</li>` : ''}
      ${block.most_recent_post_date ? `<li>🗓️ Last posted ${escapeHtml(block.most_recent_post_date)}</li>` : ''}
    </ul>

    ${niches.length ? `
      <div class="tru-card">
        <h3 class="uppercase-label mb-2.5">Niches</h3>
        <div class="flex flex-wrap gap-1.5">
          ${niches.slice(0, 4).map((n) => `<span class="chip chip-blue">${escapeHtml(n.name)}${n.pct != null ? ` · ${(n.pct * 100).toFixed(0)}%` : ''}</span>`).join('')}
        </div>
        ${subniches.length ? `<div class="mt-2 text-[10px] text-tru-slate-500">Sub-niches: ${subniches.slice(0, 3).map((n) => escapeHtml(n.name)).join(', ')}</div>` : ''}
      </div>
    ` : ''}

    ${allLinks.length ? `
      <div class="tru-card">
        <h3 class="uppercase-label mb-2.5">Links Used (${allLinks.length})</h3>
        <ul class="space-y-1.5">
          ${allLinks.slice(0, 5).map((l) => `<li><a class="inline-flex max-w-full items-center gap-1 truncate rounded-md border border-tru-slate-200 px-2 py-1 text-[11px] text-tru-slate-700 hover:border-tru-blue-600 hover:text-tru-blue-600" href="${escapeHtml(l)}" target="_blank">↗ ${escapeHtml(shortHost(l))}</a></li>`).join('')}
          ${allLinks.length > 5 ? `<li><span class="inline-flex rounded-md border border-tru-slate-200 px-2 py-1 text-[11px] text-tru-slate-500">+${allLinks.length - 5} more</span></li>` : ''}
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
        <div class="ml-auto flex flex-wrap gap-1.5">
          ${platformsList.map((p) => `<div class="flex h-6 min-w-6 items-center justify-center rounded-md bg-tru-slate-100 px-1.5 text-[10px] font-bold uppercase" title="${p}">${p[0]}</div>`).join('')}
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
      ${statRow('Average Likes', fmtCount(block.avg_likes ?? block.likes_median))}
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
    const v = block.posting_frequency_recent_months ?? block.posting_frequency ?? block.posts_per_month;
    return typeof v === 'number' ? v.toFixed(1) : '—';
  }
  function avgViewsVal() {
    return block.avg_views ?? block.play_count_avg ?? null;
  }
  function reelsAvgLikes() {
    return block.reels && (block.reels.avg_likes ?? block.reels.avg_like_count);
  }

  // ─────────────────────────────────────────────
  // Analytics tab — composed of many cards
  // ─────────────────────────────────────────────
  const analytics = document.getElementById('tab-analytics');
  analytics.innerHTML = `
    ${renderGrowthCard()}
    ${renderErHistogram()}
    ${renderPlatformPanel()}
    ${platform === 'youtube' ? renderIncomeCard() : ''}
    ${renderTopHashtags()}
    ${audience ? renderAudienceSection() : ''}
    ${renderNotableUsers()}
    ${renderLookalikes()}
    ${renderBrandAffinity()}
    ${renderInterests()}
  `;
  // Attach charts after innerHTML applies.
  setTimeout(() => {
    drawGrowthChart();
    drawErHistogramChart();
    drawAudienceCharts();
    drawTweetsTypeChart();
  }, 0);

  // ── Growth chart ─────────────────────────────
  function renderGrowthCard() {
    const ttGrowth = block.creator_follower_growth;
    const isAuth = ttGrowth && (Array.isArray(ttGrowth.months) || Array.isArray(ttGrowth.history));
    return `
      <div class="tru-card">
        <div class="flex items-baseline justify-between">
          <div>
            <h3 class="text-sm font-semibold">Creator Growth</h3>
            <p class="mt-0.5 text-xs text-tru-slate-500">${isAuth ? 'Authoritative — IC creator_follower_growth' : 'Last 12 months — historical follower data approximated.'}</p>
          </div>
          ${isAuth ? '' : `<span class="approx-badge">Approximated</span>`}
        </div>
        <div class="mt-3 h-48"><canvas id="growth-chart"></canvas></div>
      </div>
    `;
  }
  function drawGrowthChart() {
    const ctx = document.getElementById('growth-chart');
    if (!ctx) return;
    const ttGrowth = block.creator_follower_growth;
    let labels, data;
    if (ttGrowth && Array.isArray(ttGrowth.months) && ttGrowth.months.length) {
      labels = ttGrowth.months.map((m) => fmtMonth(m.month || m.label));
      data = ttGrowth.months.map((m) => m.followers ?? m.value ?? m.count ?? 0);
    } else {
      const months = ['May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr'];
      const base = followers || 100000;
      labels = months;
      data = months.map((_, i) => Math.round(base * (1 + (i - 6) * 0.005)));
    }
    new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', borderWidth: 2, pointRadius: 3, tension: 0.3, fill: true }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => fmtCount(+v) }, grid: { color: '#e5e7eb' } }, x: { grid: { display: false } } }, responsive: true, maintainAspectRatio: false },
    });
  }

  // ── ER histogram ─────────────────────────────
  function renderErHistogram() {
    const posts = block.post_data || [];
    if (!posts.length) return '';
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold">Engagement Rate Distribution</h3>
        <p class="mt-0.5 text-xs text-tru-slate-500">Bucketed across this creator's recent ${posts.length} posts. Highlighted bucket contains the overall ER.</p>
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
      const v = Number(e.views || e.view_count || e.play_count || 0);
      if (!v) return;
      const er = ((Number(e.likes || e.like_count) || 0) + (Number(e.comments || e.comment_count) || 0)) / v;
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

  // ── Per-platform panels ──────────────────────
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
    const reels = block.reels || {};
    const langs = block.language_code || [];
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Instagram Insights</h3>
        <div class="grid grid-cols-4 gap-3 text-[11px]">
          ${miniStat('Reels share', block.reels_percentage_last_12_posts != null ? `${block.reels_percentage_last_12_posts.toFixed(0)}%` : '—', 'Last 12 posts')}
          ${miniStat('Avg likes (median)', fmtCount(block.likes_median))}
          ${miniStat('Avg comments (median)', fmtCount(block.comments_median))}
          ${miniStat('Account type', block.is_business_account ? 'Business' : block.video_content_creator ? 'Creator' : 'Personal')}
        </div>
        ${reels.avg_view_count != null ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Reels Performance</h4>
            <div class="grid grid-cols-4 gap-3 text-[11px]">
              ${miniStat('Avg views', fmtCount(reels.avg_view_count))}
              ${miniStat('Median views', fmtCount(reels.median_view_count))}
              ${miniStat('Avg likes', fmtCount(reels.avg_like_count))}
              ${miniStat('Median likes', fmtCount(reels.median_like_count))}
            </div>
          </div>
        ` : ''}
        ${tagged.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Recently tagged accounts (${tagged.length})</h4>
            <div class="flex flex-wrap gap-1.5">
              ${tagged.slice(0, 16).map((t) => `<span class="chip chip-slate">@${escapeHtml(t.username)}</span>`).join('')}
              ${tagged.length > 16 ? `<span class="chip chip-blue">+${tagged.length - 16} more</span>` : ''}
            </div>
          </div>
        ` : ''}
        ${langs.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Caption languages</h4>
            <div class="flex flex-wrap gap-1.5">
              ${langs.slice(0, 12).map((l) => `<span class="chip chip-slate">${escapeHtml(l)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderYouTubePanel() {
    const cats = block.video_categories || [];
    const topics = block.video_topics || [];
    const keywords = block.keywords || [];
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Long videos vs Shorts</h3>
        <div class="grid grid-cols-2 gap-3">
          ${splitCard('Long videos', [
            ['Avg views', fmtCount(block.avg_views_long)],
            ['Median views', fmtCount(block.median_views_long)],
            ['ER', fmtPct(block.engagement_percent_long)],
            ['Posts/mo', (block.posting_frequency_long ?? '—').toString().slice(0, 4)],
            ['Last upload', shortDate(block.last_long_video_upload_date)],
          ])}
          ${splitCard('Shorts', [
            ['Avg views', fmtCount(block.avg_views_shorts)],
            ['ER', fmtPct(block.engagement_percent_shorts)],
            ['Posts/mo', (block.posting_frequency_shorts ?? '—').toString().slice(0, 4)],
            ['Last upload', shortDate(block.last_short_video_upload_date)],
            ['% of uploads', block.shorts_percentage != null ? `${block.shorts_percentage.toFixed(0)}%` : '—'],
          ])}
        </div>
        <div class="mt-4 grid grid-cols-3 gap-3 text-[11px]">
          ${miniStat('Total views', fmtCount(block.view_count))}
          ${miniStat('Total comments (last 50)', fmtCount(block.total_comments_last_50))}
          ${miniStat('Monetized', block.is_monetization_enabled ? '✓ Yes' : '—')}
        </div>
        ${cats.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Video categories</h4>
            <div class="flex flex-wrap gap-1.5">
              ${cats.slice(0, 12).map((c) => `<span class="chip chip-slate">${escapeHtml(typeof c === 'string' ? c : c.name || c.id)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${topics.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Topics</h4>
            <div class="flex flex-wrap gap-1.5">
              ${topics.slice(0, 12).map((t) => `<span class="chip chip-slate">${escapeHtml(typeof t === 'string' ? t : t.name)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${keywords.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Channel keywords</h4>
            <div class="flex flex-wrap gap-1.5">
              ${keywords.slice(0, 16).map((k) => `<span class="chip chip-blue">${escapeHtml(k)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTikTokPanel() {
    const challenges = block.challenges_list || [];
    const tagged = block.tagged || [];
    const brands = block.brands_found || [];
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">TikTok Insights</h3>
        <div class="grid grid-cols-4 gap-3 text-[11px]">
          ${miniStat('Region', block.region || '—')}
          ${miniStat('Category', block.category || '—')}
          ${miniStat('Avg plays', fmtCount(block.play_count_avg))}
          ${miniStat('Median plays', fmtCount(block.play_count_median))}
          ${miniStat('Total likes', fmtCount(block.total_likes))}
          ${miniStat('Total saves', fmtCount(block.total_saves))}
          ${miniStat('Total shares', fmtCount(block.total_shares))}
          ${miniStat('Avg duration', block.duration_avg != null ? `${block.duration_avg.toFixed(1)} s` : '—')}
        </div>
        ${brands.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Brands mentioned (${brands.length})</h4>
            <div class="flex flex-wrap gap-1.5">
              ${brands.slice(0, 20).map((b) => `<span class="chip chip-blue">${escapeHtml(typeof b === 'string' ? b : b.name || b.brand)}</span>`).join('')}
              ${brands.length > 20 ? `<span class="chip chip-slate">+${brands.length - 20} more</span>` : ''}
            </div>
          </div>
        ` : ''}
        ${challenges.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Challenges / hashtags</h4>
            <div class="flex flex-wrap gap-1.5">
              ${challenges.slice(0, 16).map((c) => `<span class="chip chip-slate">#${escapeHtml(typeof c === 'string' ? c : c.name || c.title || '')}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${tagged.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Tagged accounts</h4>
            <div class="flex flex-wrap gap-1.5">
              ${tagged.slice(0, 16).map((t) => `<span class="chip chip-slate">@${escapeHtml(typeof t === 'string' ? t : t.username)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTwitterPanel() {
    const tt = block.tweets_type || {};
    const tagged = block.tagged_usernames || [];
    const recommended = block.recommended_users || [];
    const langs = block.languages_tweet || [];
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Twitter / X Insights</h3>
        <div class="grid grid-cols-4 gap-3 text-[11px]">
          ${miniStat('Avg likes', fmtCount(block.avg_likes))}
          ${miniStat('Avg replies', fmtCount(block.avg_reply))}
          ${miniStat('Avg retweets', fmtCount(block.avg_retweet))}
          ${miniStat('Avg quotes', fmtCount(block.avg_quotes))}
          ${miniStat('Avg views', fmtCount(block.avg_views))}
          ${miniStat('Total tweets', fmtCount(block.tweets_count))}
          ${miniStat('Joined', shortDate(block.join_date))}
          ${miniStat('Retweets count', fmtCount(block.retweets_count))}
        </div>
        ${Object.keys(tt).length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Tweets by type</h4>
            <div class="h-40"><canvas id="tweets-type-chart"></canvas></div>
          </div>
        ` : ''}
        ${tagged.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Frequently tagged (${tagged.length})</h4>
            <div class="flex flex-wrap gap-1.5">
              ${tagged.slice(0, 16).map((u) => `<span class="chip chip-slate">@${escapeHtml(u)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${recommended.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Recommended users</h4>
            <div class="flex flex-wrap gap-1.5">
              ${recommended.slice(0, 16).map((u) => `<span class="chip chip-blue">@${escapeHtml(u)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        ${langs.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Tweet languages</h4>
            <div class="flex flex-wrap gap-1.5">
              ${langs.slice(0, 12).map((l) => `<span class="chip chip-slate">${escapeHtml(typeof l === 'string' ? l : l.code || l.name)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  function drawTweetsTypeChart() {
    if (platform !== 'twitter') return;
    const ctx = document.getElementById('tweets-type-chart');
    if (!ctx) return;
    const tt = block.tweets_type || {};
    const labels = Object.keys(tt);
    const data = Object.values(tt).map((v) => Number(v) || 0);
    new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ data, backgroundColor: '#2563eb', borderRadius: 4 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (v) => fmtCount(+v) } }, x: { grid: { display: false } } }, responsive: true, maintainAspectRatio: false },
    });
  }

  function renderTwitchPanel() {
    const panels = (block.panels_titles || []).map((title, i) => ({
      title,
      desc: (block.panels_descriptions || [])[i],
      url: (block.panels_urls || [])[i],
      img: (block.panels_image || [])[i],
      type: (block.panels_type || [])[i],
    }));
    const social = block.social_media || {};
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Twitch Insights</h3>
        <div class="flex flex-wrap items-center gap-2">
          ${block.isPartner ? `<span class="chip chip-emerald">✓ Twitch Partner</span>` : ''}
          ${block.last_broadcast_game ? `<span class="chip chip-blue">🎮 ${escapeHtml(block.last_broadcast_game)}</span>` : ''}
          ${block.last_streamed ? `<span class="text-[11px] text-tru-slate-500">Last streamed ${shortDate(block.last_streamed)}</span>` : ''}
        </div>
        <div class="mt-3 grid grid-cols-3 gap-3 text-[11px]">
          ${miniStat('Streamed (30d)', block.streamed_hours_last_30_days != null ? `${block.streamed_hours_last_30_days.toFixed(0)} h` : '—')}
          ${miniStat('Streams (30d)', fmtCount(block.streams_count_last_30_days))}
          ${miniStat('Avg viewers', fmtCount(block.avg_views))}
        </div>
        ${Object.keys(social).length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Social handles</h4>
            <div class="flex flex-wrap gap-1.5">
              ${Object.entries(social).map(([k, v]) => `<a target="_blank" href="${escapeHtml(typeof v === 'string' ? v : v?.url || '#')}" class="chip chip-slate hover:chip-blue">${escapeHtml(k)}: ${escapeHtml(typeof v === 'string' ? v : v?.username || v?.url || '')}</a>`).join('')}
            </div>
          </div>
        ` : ''}
        ${panels.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Channel panels (${panels.length})</h4>
            <div class="grid grid-cols-2 gap-2">
              ${panels.map((p) => `
                <div class="flex items-start gap-2 rounded-md border border-tru-slate-200 p-2 text-[11px]">
                  ${p.img ? `<img src="${p.img}" alt="" class="h-12 w-12 shrink-0 rounded object-cover" referrerpolicy="no-referrer">` : ''}
                  <div class="min-w-0">
                    <div class="font-semibold truncate">${escapeHtml(p.title || 'Panel')}</div>
                    ${p.desc ? `<div class="text-tru-slate-500 line-clamp-2">${escapeHtml(p.desc)}</div>` : ''}
                    ${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" class="text-tru-blue-600 hover:underline truncate block">${escapeHtml(shortHost(p.url))}</a>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── YT Income card ───────────────────────────
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
        <h3 class="text-sm font-semibold flex items-center gap-2">📈 Estimated Creator Income</h3>
        <p class="mt-1 text-xs text-tru-slate-500">Approximated by IC from public engagement signals.</p>
        <div class="mt-3 flex items-baseline gap-6">
          ${lower != null ? `<div><div class="uppercase-label">Lower</div><div class="text-2xl font-bold tabular-nums mt-0.5">${sym}${fmtCount(lower)}</div></div>` : ''}
          ${upper != null ? `<div><div class="uppercase-label">Upper</div><div class="text-2xl font-bold tabular-nums mt-0.5">${sym}${fmtCount(upper)}</div></div>` : ''}
        </div>
      </div>
    `;
  }

  // ── Top Hashtags ─────────────────────────────
  function renderTopHashtags() {
    if (!hashtags.length) return '';
    return `
      <div class="tru-card">
        <h3 class="uppercase-label mb-2">Top Hashtags</h3>
        <div class="flex flex-wrap gap-1.5">
          ${hashtags.slice(0, 24).map((h) => `<span class="chip chip-blue">#${String(h).replace(/^#/, '')}</span>`).join('')}
          ${hashtags.length > 24 ? `<span class="chip chip-slate">+${hashtags.length - 24} more</span>` : ''}
        </div>
      </div>
    `;
  }

  // ── Audience demographics ────────────────────
  function renderAudienceSection() {
    if (!audience) return '';
    const credibility = audience.audience_credibility;
    const credClass = audience.credibility_class;
    const notable = audience.notable_users_ratio;
    const reach = audience.audience_reachability || [];
    const types = audience.audience_types || [];
    const langs = audience.audience_languages || [];
    const geo = audience.audience_geo || {};
    const countries = geo.countries || [];
    const cities = geo.cities || [];

    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Audience Snapshot</h3>
        <div class="grid grid-cols-3 gap-3 text-[11px]">
          ${credibility != null ? miniStat('Credibility', `${(credibility * 100).toFixed(0)}%`, credClass ?? '—') : ''}
          ${notable != null ? miniStat('Notable users', `${(notable * 100).toFixed(1)}%`, 'of audience') : ''}
          ${audience.audience_lookalikes ? miniStat('Lookalikes', String(audience.audience_lookalikes.length)) : ''}
        </div>

        <div class="mt-5 grid grid-cols-2 gap-4">
          <div>
            <h4 class="uppercase-label mb-2">Gender</h4>
            <div class="h-44"><canvas id="aud-gender-chart"></canvas></div>
          </div>
          <div>
            <h4 class="uppercase-label mb-2">Age groups</h4>
            <div class="h-44"><canvas id="aud-age-chart"></canvas></div>
          </div>
        </div>

        ${countries.length ? `
          <div class="mt-5">
            <h4 class="uppercase-label mb-2">Top Countries</h4>
            <div class="space-y-1.5">
              ${countries.slice(0, 10).map((c) => barRow(c.name, c.weight, fmtPctW(c.weight))).join('')}
            </div>
          </div>
        ` : ''}

        ${cities.length ? `
          <div class="mt-4">
            <h4 class="uppercase-label mb-2">Top Cities</h4>
            <div class="space-y-1.5">
              ${cities.slice(0, 8).map((c) => barRow(`${c.name}${c.country ? `, ${c.country.code}` : ''}`, c.weight, fmtPctW(c.weight))).join('')}
            </div>
          </div>
        ` : ''}

        ${langs.length ? `
          <div class="mt-5">
            <h4 class="uppercase-label mb-2">Audience languages</h4>
            <div class="flex flex-wrap gap-1.5">
              ${langs.slice(0, 12).map((l) => `<span class="chip chip-slate">${escapeHtml(l.name || l.code)} · ${fmtPctW(l.weight)}</span>`).join('')}
            </div>
          </div>
        ` : ''}

        ${reach.length ? `
          <div class="mt-5">
            <h4 class="uppercase-label mb-2">Audience reachability (followings)</h4>
            <div class="space-y-1.5">
              ${reach.map((r) => barRow(reachLabel(r.code), r.weight, fmtPctW(r.weight))).join('')}
            </div>
          </div>
        ` : ''}

        ${types.length ? `
          <div class="mt-5">
            <h4 class="uppercase-label mb-2">Audience types</h4>
            <div class="flex flex-wrap gap-1.5">
              ${types.map((t) => `<span class="chip chip-slate">${escapeHtml(typeLabel(t.code))} · ${fmtPctW(t.weight)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function reachLabel(code) {
    return ({ '-500': '<500 followings', '500-1000': '500-1k', '1000-1500': '1k-1.5k', '1500-': '1.5k+' })[code] || code;
  }
  function typeLabel(code) {
    return ({ real: 'Real', influencers: 'Influencers', mass_followers: 'Mass followers', suspicious: 'Suspicious' })[code] || code;
  }

  function barRow(label, weight, valueLabel) {
    const pct = Math.max(2, (Number(weight) || 0) * 100);
    return `
      <div class="grid grid-cols-[8rem_1fr_3rem] items-center gap-2 text-[11px]">
        <span class="text-tru-slate-700 truncate">${escapeHtml(label)}</span>
        <div class="h-2 rounded-full bg-tru-slate-100">
          <div class="h-2 rounded-full bg-tru-blue-600" style="width:${pct}%"></div>
        </div>
        <span class="text-right tabular-nums text-tru-slate-500">${valueLabel}</span>
      </div>
    `;
  }

  function drawAudienceCharts() {
    if (!audience) return;
    const genders = audience.audience_genders || [];
    const ages = audience.audience_ages || [];
    const gctx = document.getElementById('aud-gender-chart');
    if (gctx && genders.length) {
      new Chart(gctx, {
        type: 'doughnut',
        data: {
          labels: genders.map((g) => g.code),
          datasets: [{
            data: genders.map((g) => +(g.weight * 100).toFixed(2)),
            backgroundColor: ['#2563eb', '#db2777', '#94a3b8'],
            borderWidth: 0,
          }],
        },
        options: { plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } }, responsive: true, maintainAspectRatio: false },
      });
    }
    const actx = document.getElementById('aud-age-chart');
    if (actx && ages.length) {
      new Chart(actx, {
        type: 'bar',
        data: {
          labels: ages.map((a) => a.code),
          datasets: [{
            data: ages.map((a) => +(a.weight * 100).toFixed(2)),
            backgroundColor: '#2563eb',
            borderRadius: 4,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { y: { ticks: { callback: (v) => `${v}%` } }, x: { grid: { display: false } } },
          responsive: true, maintainAspectRatio: false,
        },
      });
    }
  }

  // ── Notable users / lookalikes ──────────────
  function renderNotableUsers() {
    const notable = audience?.notable_users || [];
    if (!notable.length) return '';
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Notable users in audience (${notable.length})</h3>
        <p class="text-xs text-tru-slate-500 mb-3">Verified or high-follower accounts that follow this creator.</p>
        <div class="grid grid-cols-3 gap-3">
          ${notable.slice(0, 12).map((u) => userCard(u)).join('')}
        </div>
      </div>
    `;
  }
  function renderLookalikes() {
    const ll = audience?.audience_lookalikes || [];
    if (!ll.length) return '';
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Lookalike creators (${ll.length})</h3>
        <p class="text-xs text-tru-slate-500 mb-3">Top creators with overlapping audiences.</p>
        <div class="grid grid-cols-3 gap-3">
          ${ll.slice(0, 12).map((u) => userCard(u)).join('')}
        </div>
      </div>
    `;
  }
  function userCard(u) {
    return `
      <a target="_blank" href="${escapeHtml(u.url || '#')}" class="flex items-center gap-3 rounded-md border border-tru-slate-200 p-2.5 hover:border-tru-blue-600">
        <div class="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-tru-slate-100">
          ${u.picture ? `<img src="${u.picture}" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer">` : ''}
        </div>
        <div class="min-w-0 text-[12px]">
          <div class="font-semibold truncate flex items-center gap-1">
            ${escapeHtml(u.fullname || u.username)}
            ${u.is_verified ? '<span class="text-tru-blue-600">✓</span>' : ''}
          </div>
          <div class="text-tru-slate-500 truncate">@${escapeHtml(u.username)} · ${fmtCount(u.followers)}</div>
        </div>
      </a>
    `;
  }

  function renderBrandAffinity() {
    const ba = audience?.audience_brand_affinity || [];
    if (!ba.length) return '';
    const top = [...ba].sort((a, b) => (b.affinity || 0) - (a.affinity || 0)).slice(0, 24);
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Brand affinity (${ba.length})</h3>
        <p class="text-xs text-tru-slate-500 mb-3">Brands followed disproportionately by this creator's audience. Higher affinity = stronger overlap vs population baseline.</p>
        <div class="flex flex-wrap gap-1.5">
          ${top.map((b) => `<span class="chip chip-blue">${escapeHtml(b.name)} · ${b.affinity ? b.affinity.toFixed(2) + 'x' : '—'}</span>`).join('')}
        </div>
      </div>
    `;
  }

  function renderInterests() {
    const ints = audience?.audience_interests || [];
    if (!ints.length) return '';
    const top = [...ints].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 16);
    return `
      <div class="tru-card">
        <h3 class="text-sm font-semibold mb-3">Audience interests</h3>
        <div class="space-y-1.5">
          ${top.map((i) => barRow(i.name, i.weight, fmtPctW(i.weight))).join('')}
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
    const cols = platform === 'twitter' ? 'grid-cols-2' : platform === 'twitch' ? 'grid-cols-1' : 'grid-cols-3';
    document.getElementById('tab-posts').innerHTML = `
      <div class="flex items-baseline justify-between">
        <h2 class="text-base font-bold">Latest Creator Posts <span class="font-normal text-tru-slate-500 text-sm">(${items.length})</span></h2>
        ${showToggle ? `
          <div class="segmented" id="posts-toggle">
            <button data-filter="all" class="${postsFilter === 'all' ? 'active' : ''}">Posts</button>
            <button data-filter="reels" class="${postsFilter === 'reels' ? 'active' : ''}">Reels</button>
          </div>
        ` : ''}
      </div>
      ${items.length ? `<div class="grid ${cols} gap-3">${items.slice(0, 30).map((p) => renderPostTile(p)).join('')}</div>` : `<div class="rounded-md border border-dashed border-tru-slate-300 p-6 text-center text-sm text-tru-slate-500">No posts in fixture.</div>`}
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

  function pickThumbnail(p) {
    // YouTube
    if (p.media && p.media.thumbnails) {
      return p.media.thumbnails.maxres ?? p.media.thumbnails.high ?? p.media.thumbnails.medium ?? p.media.thumbnails.default;
    }
    // Instagram (array of media)
    if (Array.isArray(p.media)) {
      const img = p.media.find((m) => m.type === 'image');
      if (img) return img.url;
      // Twitter photo
      const photo = p.media.find((m) => m.type === 'photo');
      if (photo) return photo.url;
    }
    // Thumbnails field
    if (p.thumbnails && p.thumbnails.url) return p.thumbnails.url;
    return null;
  }
  function isVideoPost(p) {
    if (p.media_type === 2) return true;
    if (p.media && typeof p.media === 'object' && !Array.isArray(p.media) && p.media.type === 'video') return true;
    if (Array.isArray(p.media) && p.media.some((m) => m.type === 'video')) return true;
    return false;
  }
  function renderPostTile(p) {
    const thumb = pickThumbnail(p);
    const isVideo = isVideoPost(p);
    const e = p.engagement || {};
    const url = p.post_url || p.tweet_url || p.url || '#';
    const date = shortDate(p.created_at || p.published_at || (p.taken_at ? new Date(p.taken_at * 1000).toISOString() : null));
    const captionRaw = p.caption || p.text || p.title || '';
    const caption = String(captionRaw).slice(0, 140);
    const likes = Number(e.likes ?? e.like_count) || 0;
    const comments = Number(e.comments ?? e.comment_count ?? e.reply_count) || 0;
    const views = Number(e.views ?? e.view_count ?? e.play_count) || 0;
    const hashtagsList = (p.hashtags || []).slice(0, 3);
    return `
      <a href="${escapeHtml(url)}" target="_blank" class="block rounded-md border border-tru-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
        <div class="aspect-square w-full bg-tru-slate-100 relative">
          ${thumb ? `<img src="${thumb}" alt="" class="h-full w-full object-cover" referrerpolicy="no-referrer" onerror="this.style.display='none'">` : `<div class="flex h-full w-full items-center justify-center text-tru-slate-400 text-3xl">${isVideo ? '▶' : '🖼'}</div>`}
          ${isVideo ? `<div class="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white text-[10px]">▶</div>` : ''}
          ${p.is_pinned ? `<div class="absolute left-1.5 top-1.5 rounded bg-tru-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">📌 Pinned</div>` : ''}
        </div>
        <div class="p-2.5 text-[11px] space-y-1.5">
          <div class="text-tru-slate-500 flex items-center justify-between">
            <span>${date}</span>
            ${views ? `<span>${fmtCount(views)} views</span>` : ''}
          </div>
          <div class="line-clamp-2 text-tru-slate-700 leading-relaxed">${escapeHtml(caption)}</div>
          ${hashtagsList.length ? `<div class="flex flex-wrap gap-1">${hashtagsList.map((h) => `<span class="text-tru-blue-600">${escapeHtml(String(h).startsWith('#') ? h : '#' + h)}</span>`).join('')}</div>` : ''}
          <div class="flex items-center gap-3 text-tru-slate-500 pt-1 border-t border-tru-slate-100">
            <span>♥ ${fmtCount(likes)}</span>
            <span>💬 ${fmtCount(comments)}</span>
            ${e.share_count ? `<span>↗ ${fmtCount(e.share_count)}</span>` : ''}
            ${e.retweet_count ? `<span>🔁 ${fmtCount(e.retweet_count)}</span>` : ''}
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
          ${synthSimilar(8).map((s) => `
            <tr class="border-t border-tru-slate-100 hover:bg-tru-slate-50/50">
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
        Synthesised — fixtures don't include similars. The live page calls IC's similarCreators endpoint and uses an approximated similarity score.
      </p>
    </div>
  `;

  function synthSimilar(n) {
    const colors = ['#1e40af','#7c3aed','#db2777','#16a34a','#ea580c','#0891b2','#65a30d','#be185d'];
    return Array.from({ length: n }, (_, i) => ({
      name: ['Creator A','Creator B','Creator C','Creator D','Creator E','Creator F','Creator G','Creator H'][i],
      handle: ['similar_acc_1','similar_acc_2','similar_acc_3','similar_acc_4','similar_acc_5','similar_acc_6','similar_acc_7','similar_acc_8'][i],
      color: colors[i],
      subs: Math.round((followers || 100000) * (0.05 + ((i * 17) % 100) / 200)),
      er: 0.5 + ((i * 31) % 50) / 10,
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
    return `<div class="rounded-md border border-tru-slate-200 bg-white p-2.5"><div class="uppercase-label">${label}</div><div class="font-bold tabular-nums mt-0.5 text-[13px]">${value ?? '—'}</div>${sub ? `<div class="text-tru-slate-500 text-[10px] truncate">${escapeHtml(sub)}</div>` : ''}</div>`;
  }
  function splitCard(title, rows) {
    return `
      <div class="rounded-md border border-tru-slate-200 bg-white p-3">
        <div class="text-xs font-semibold mb-2">${title}</div>
        <dl class="space-y-1.5 text-[11px]">
          ${rows.map(([k, v]) => `<div class="flex items-baseline justify-between"><dt class="text-tru-slate-500">${k}</dt><dd class="font-semibold tabular-nums">${v}</dd></div>`).join('')}
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
      return u.hostname.replace(/^www\./, '');
    } catch {
      return String(url).slice(0, 24);
    }
  }
  function shortDate(s) {
    if (!s) return '—';
    const d = new Date(s);
    if (isNaN(d)) return String(s).slice(0, 10);
    return d.toISOString().slice(0, 10);
  }
})();
