/* Compiled from TypeScript on 2025-05-14 19:11:17 */
(function() {
  const playerJsUrl = 'https://cdn.vhx.tv/assets/player.js';
  const milestones = [0.10, 0.25, 0.50, 0.75];

  // Ensure dataLayer exists
  window.dataLayer = window.dataLayer || [];

  function loadPlayerScript() {
    return new Promise((resolve) => {
      if (typeof window.VHX !== 'undefined') {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = playerJsUrl;
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  function dlPush(event, ...props) {
    const payload = { event };
    for (const prop of props) {
      Object.assign(payload, prop);
    }
    window.dataLayer.push(payload);
  }

  function getVideoProps(player, percentValue = null) {
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

  function getMilestones(player, milestonePcts = [0.10, 0.25, 0.50, 0.75]) {
    const duration = player.getVideoDuration();
    return milestonePcts.reduce((acc, pct) => {
      const percentKey = String(Math.round(pct * 100));
      acc[percentKey] = {
        pct: percentKey,
        time: duration * pct,
        reached: false
      };
      return acc;
    }, {});
  }

  function initPlayers() {
    const iframes = Array.from(document.querySelectorAll('iframe[src*="embed.vhx.tv"]'));
    
    const embeds = iframes.map((iframe, index) => {
      if (iframe.getAttribute('id')) return iframe;
      iframe.setAttribute('id', `player-id-${index}`);
      return iframe;
    });
    
    const players = embeds.map((embed) => {
      const player = new window.VHX.Player(embed.getAttribute('id'));
      player._src = embed.getAttribute('src');
      player._hasStarted = false;
      player._hasFinished = false;
      player._milestones = getMilestones(player, milestones);
      return player;
    });
    
    players.forEach((player) => {
      player.on('play', () => {
        if (player._hasStarted) return;
        player._hasStarted = true;
        dlPush('ott_video_start', getVideoProps(player));
      });
      
      player.on('timeupdate', (event, current) => {
        Object.values(player._milestones).forEach(milestone => {
          if (milestone.reached) return;
          if (current > milestone.time) {
            milestone.reached = true;
            dlPush('ott_video_progress', getVideoProps(player, milestone.pct));
          }
        });
      });
      
      player.on('ended', () => {
        if (player._hasFinished) return;
        player._hasFinished = true;
        dlPush('ott_video_complete', getVideoProps(player));
      });
    });
  }

  function init() {
    // Check if document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      loadPlayerScript().then(initPlayers);
    } else {
      // If not, wait for it to load
      window.addEventListener('DOMContentLoaded', () => {
        loadPlayerScript().then(initPlayers);
      });
    }
  }

  // Start the initialization process
  init();
})();