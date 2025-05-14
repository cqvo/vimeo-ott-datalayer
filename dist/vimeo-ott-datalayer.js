/* Compiled from TypeScript on 2025-05-14 20:02:59 */
"use strict";
(function () {
    const playerJsUrl = 'https://cdn.vhx.tv/assets/player.js';
    const milestones = [0.10, 0.25, 0.50, 0.75];
    // Ensure dataLayer exists
    window.dataLayer = window.dataLayer || [];
    console.log('[vimeo-ott-datalayer] script loaded');
    function loadPlayerScript() {
        return new Promise((resolve) => {
            if (typeof window.VHX !== 'undefined') {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = playerJsUrl;
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    }
    function isValidVideoData(props) {
        return props.video_current_time >= 0 && props.video_duration > 0;
    }
    function dlPush(event, ...props) {
        const payload = { event };
        for (const prop of props) {
            Object.assign(payload, prop);
        }
        const videoProps = props.find(p => 'video_duration' in p);
        if (!videoProps || isValidVideoData(videoProps)) {
            window.dataLayer.push(payload);
        }
        else {
            console.warn('Attempted to push invalid video data to dataLayer:', videoProps);
        }
    }
    function getVideoProps(player, percentValue = null) {
        const video_current_time = Math.round(player.currentTime()) || -1;
        const video_duration = Math.round(player.getVideoDuration()) || -1;
        const video_percent = percentValue !== null && percentValue !== void 0 ? percentValue : (video_duration > 0 ? Math.round((video_current_time / video_duration) * 100) : -1);
        const video_url = player._src || '';
        return {
            video_current_time,
            video_duration,
            video_percent,
            video_url,
        };
    }
    function getMilestones(player, milestonePcts = milestones) {
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
        if (!window.VHX) {
            console.error('VHX is not loaded, retrying in 500ms');
            setTimeout(initPlayers, 500);
            return;
        }
        const iframes = Array.from(document.querySelectorAll('iframe[src*="embed.vhx.tv"]'));
        const embeds = iframes.map((iframe, index) => {
            if (iframe.getAttribute('id'))
                return iframe;
            iframe.setAttribute('id', `player-id-${index}`);
            return iframe;
        });
        const players = embeds.map((embed) => {
            if (!window.VHX) {
                throw new Error('VHX is not loaded');
            }
            const player = new window.VHX.Player(embed.getAttribute('id') || '');
            player._src = embed.getAttribute('src') || '';
            player._hasStarted = false;
            player._hasFinished = false;
            player._milestones = getMilestones(player, milestones);
            return player;
        });
        players.forEach((player) => {
            player.on('play', () => {
                if (player._hasStarted)
                    return;
                player._hasStarted = true;
                dlPush('ott_video_start', getVideoProps(player));
            });
            player.on('timeupdate', (_event, current) => {
                if (!player._milestones || current === undefined)
                    return;
                console.log('[vimeo-ott-datalayer] timeupdate', { current, milestones: player._milestones });
                Object.values(player._milestones).forEach((milestone) => {
                    if (milestone.reached)
                        return;
                    if (current > milestone.time) {
                        milestone.reached = true;
                        console.log('[vimeo-ott-datalayer] ott_video_progress', { milestone, videoProps: getVideoProps(player, milestone.pct) });
                        dlPush('ott_video_progress', getVideoProps(player, milestone.pct));
                    }
                });
            });
            player.on('ended', () => {
                if (player._hasFinished)
                    return;
                player._hasFinished = true;
                dlPush('ott_video_complete', getVideoProps(player));
            });
        });
    }
    function init() {
        // Check if document is already loaded
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            loadPlayerScript().then(initPlayers).catch(error => {
                console.error('Error initializing Vimeo OTT DataLayer:', error);
            });
        }
        else {
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
//# sourceMappingURL=vimeo-ott-datalayer.js.map