const playerJsUrl = 'https://cdn.vhx.tv/assets/player.js';
window.dataLayer = window.dataLayer || [];

if (typeof window.VHX === 'undefined') {
  const scr = document.create('script');
  scr.src = playerJsUrl;
  document.head.append(scr);
}

const iframes = Array.from(document.querySelectorAll('iframe[src*="embed.vhx.tv"]'));

const embeds = iframes.map((iframe, index) => {
  if (iframe.getAttribute('id')) return iframe;
  iframe.setAttribute('id', `player-id-${index}`);
  return iframe;
});

const players = embeds.map((embed) => {
  const player = new VHX.Player(embed.getAttribute('id'));
  player._src = embed.getAttribute('src');
  return player;
});

players.forEach((player) => {
  player.on('play', (event, data) => {
    dlPush('ott_video_start', getVideoData(player));
  });
});

function dlPush(event, ...props) {
  const payload = { event };
  for (const prop of props) {
    Object.assign(payload, prop);
  }
  window.dataLayer.push(payload);
}

function getVideoData(player, percentValue = null) {
  const video_current_time = Math.round(player.currentTime());
  const video_duration = Math.round(player.getVideoDuration());
  const video_percent = percentValue ?? Math.round((video_current_time / video_duration) * 100);
  const video_url = player._src;
  return {
      video_current_time,
      video_duration,
      video_percent,
      video_url,
    };
}