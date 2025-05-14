interface Window {
  dataLayer: any[];
  VHX?: {
    Player: new (id: string) => {
      on(event: string, callback: (event?: any, current?: number) => void): void;
      currentTime(): number;
      getVideoDuration(): number;
      _src?: string;
      _hasStarted?: boolean;
      _hasFinished?: boolean;
      _milestones?: {[key: string]: {pct: string; time: number; reached: boolean}};
    };
  }
}

(function() {
  const playerJsUrl: string = 'https://cdn.vhx.tv/assets/player.js';
  const milestones: number[] = [0.10, 0.25, 0.50, 0.75];

  // Add VHX interface to window
  interface VHXPlayer {
    on(event: string, callback: (event?: any, current?: number) => void): void;
    currentTime(): number;
    getVideoDuration(): number;
    _src?: string;
    _hasStarted?: boolean;
    _hasFinished?: boolean;
    _milestones?: MilestoneMap;
  }

  interface VHX {
    Player: new (id: string) => VHXPlayer;
  }

  interface Window {
    dataLayer: any[];
    VHX?: VHX;
  }

  interface Milestone {
    pct: string;
    time: number;
    reached: boolean;
  }

  interface MilestoneMap {
    [key: string]: Milestone;
  }

  interface VideoProps {
    video_current_time: number;
    video_duration: number;
    video_percent: number | string;
    video_url: string;
  }

  // Ensure dataLayer exists
  window.dataLayer = window.dataLayer || [];

  console.log('[vimeo-ott-datalayer] script loaded');

  function loadPlayerScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window.VHX !== 'undefined') {
        resolve();
        return;
      }
      
      const script: HTMLScriptElement = document.createElement('script');
      script.src = playerJsUrl;
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  function isValidVideoData(props: VideoProps): boolean {
    return props.video_current_time >= 0 && props.video_duration > 0;
  }

  function dlPush(event: string, ...props: any[]): void {
    const payload: {[key: string]: any} = { event };
    for (const prop of props) {
      Object.assign(payload, prop);
    }
    const videoProps = props.find(p => 'video_duration' in p) as VideoProps | undefined;
    if (!videoProps || isValidVideoData(videoProps)) {
      window.dataLayer.push(payload);
    } else {
      console.warn('Attempted to push invalid video data to dataLayer:', videoProps);
    }
  }

  function getVideoProps(player: VHXPlayer, percentValue: string | null = null): VideoProps {
    const video_current_time: number = Math.round(player.currentTime()) || -1;
    const video_duration: number = Math.round(player.getVideoDuration()) || -1;
    const video_percent: number | string = percentValue ?? (video_duration > 0 ? Math.round((video_current_time / video_duration) * 100) : -1);
    const video_url: string = player._src || '';
    
    return {
      video_current_time,
      video_duration,
      video_percent,
      video_url,
    };
  }

  function getMilestones(player: VHXPlayer, milestonePcts: number[] = milestones): MilestoneMap {
    const duration: number = player.getVideoDuration();
    return milestonePcts.reduce((acc: MilestoneMap, pct: number) => {
      const percentKey: string = String(Math.round(pct * 100));
      acc[percentKey] = {
        pct: percentKey,
        time: duration * pct,
        reached: false
      };
      return acc;
    }, {});
  }

  function initPlayers(): void {
    if (!window.VHX) {
      console.error('VHX is not loaded, retrying in 500ms');
      setTimeout(initPlayers, 500);
      return;
    }

    const iframes: HTMLIFrameElement[] = Array.from(
      document.querySelectorAll<HTMLIFrameElement>('iframe[src*="embed.vhx.tv"]')
    );
    
    const embeds: HTMLIFrameElement[] = iframes.map((iframe: HTMLIFrameElement, index: number) => {
      if (iframe.getAttribute('id')) return iframe;
      iframe.setAttribute('id', `player-id-${index}`);
      return iframe;
    });
    
    const players: VHXPlayer[] = embeds.map((embed: HTMLIFrameElement) => {
      if (!window.VHX) {
        throw new Error('VHX is not loaded');
      }
      
      const player: VHXPlayer = new window.VHX.Player(embed.getAttribute('id') || '');
      player._src = embed.getAttribute('src') || '';
      player._hasStarted = false;
      player._hasFinished = false;
      player._milestones = getMilestones(player, milestones);
      return player;
    });
    
    players.forEach((player: VHXPlayer) => {
      player.on('play', () => {
        if (player._hasStarted) return;
        player._hasStarted = true;
        dlPush('ott_video_start', getVideoProps(player));
      });
      
      player.on('timeupdate', (_event: any, current: number | undefined) => {
        if (!player._milestones || current === undefined) return;
        console.log('[vimeo-ott-datalayer] timeupdate', { current, milestones: player._milestones });
        Object.values(player._milestones).forEach((milestone: Milestone) => {
          if (milestone.reached) return;
          if (current > milestone.time) {
            milestone.reached = true;
            console.log('[vimeo-ott-datalayer] ott_video_progress', { milestone, videoProps: getVideoProps(player, milestone.pct) });
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

  function init(): void {
    // Check if document is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      loadPlayerScript().then(initPlayers).catch(error => {
        console.error('Error initializing Vimeo OTT DataLayer:', error);
      });
    } else {
      // If not, wait for it to load
      window.addEventListener('DOMContentLoaded', () => {
        loadPlayerScript().then(initPlayers).catch(error => {
          console.error('Error initializing Vimeo OTT DataLayer:', error);
        });
      });
    }
  }

  // Start the initialization process
  init();
})();