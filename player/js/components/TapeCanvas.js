/**
 * TapeCanvas - Animated tape player visualization
 * Shows two reels with tape that transfers based on playback progress
 */

import { LitElement, html, css } from 'lit';
import { eventBus, Events } from '../services/EventBus.js';
import { audio } from '../services/AudioService.js';

class TapeCanvas extends LitElement {
    static styles = css`
        :host {
            display: block;
            width: 100%;
            height: 120px;
        }

        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
    `;

    // Fixed canvas dimensions for consistent rendering
    static CANVAS_WIDTH = 300;
    static CANVAS_HEIGHT = 120;

    constructor() {
        super();
        this.canvas = null;
        this.ctx = null;
        this.animationFrame = null;

        this.colors = {
            tape: '#FF4D00',
            hub: '#000000',
            marker: '#FF4D00',
            hubStroke: 'rgba(255, 77, 0, 0.2)'
        };

        this.physics = {
            hubRadius: 18,
            maxRadius: 50,
            distance: 60
        };

        this.state = {
            isPlaying: false,
            duration: 180,
            currentTime: 0,
            progress: 0,
            leftAngle: 0,
            rightAngle: 0
        };

        this.unsubscribers = [];
    }

    firstUpdated() {
        this.canvas = this.shadowRoot.querySelector('canvas');
        if (this.canvas) {
            // Use fixed internal dimensions, CSS handles display scaling
            this.canvas.width = TapeCanvas.CANVAS_WIDTH;
            this.canvas.height = TapeCanvas.CANVAS_HEIGHT;
            this.ctx = this.canvas.getContext('2d');
            this.startAnimation();
        }
    }

    connectedCallback() {
        super.connectedCallback();

        const state = audio.getState();
        this.state.isPlaying = state.isPlaying;
        this.state.currentTime = state.currentTime;
        this.state.duration = state.duration || 180;
        if (state.duration > 0) {
            this.state.progress = state.currentTime / state.duration;
        }

        this.setupEventListeners();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.unsubscribers.forEach(unsub => unsub());
        this.stopAnimation();
    }

    setupEventListeners() {
        this.unsubscribers.push(
            eventBus.on(Events.PLAY, () => {
                this.state.isPlaying = true;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PAUSE, () => {
                this.state.isPlaying = false;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.TIME_UPDATE, (data) => {
                this.state.currentTime = data.currentTime;
                this.state.duration = data.duration || 180;
                this.state.progress = data.percent / 100;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.TRACK_CHANGE, (data) => {
                this.state.leftAngle = 0;
                this.state.rightAngle = 0;
                this.state.currentTime = 0;
                this.state.duration = data.track?.duration || 180;
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_EXPAND, () => {
                this.startAnimation();
            })
        );

        this.unsubscribers.push(
            eventBus.on(Events.PLAYER_SHEET_COLLAPSE, () => {
                this.stopAnimation();
            })
        );
    }

    startAnimation() {
        if (this.animationFrame) return; // Already running
        const animate = () => {
            this.update();
            this.draw();
            this.animationFrame = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    update() {
        if (this.state.isPlaying) {
            const progress = this.state.progress;
            const rLeft = this.calculateRadius(1 - progress);
            const rRight = this.calculateRadius(progress);
            const speed = 2.0;

            this.state.leftAngle -= speed / rLeft;
            this.state.rightAngle -= speed / rRight;
        }
    }

    calculateRadius(fraction) {
        const { hubRadius, maxRadius } = this.physics;
        const rMinSq = hubRadius * hubRadius;
        const rMaxSq = maxRadius * maxRadius;
        const currentRSq = rMinSq + (rMaxSq - rMinSq) * fraction;
        return Math.sqrt(currentRSq);
    }

    draw() {
        if (!this.canvas || !this.ctx) return;

        const width = TapeCanvas.CANVAS_WIDTH;
        const height = TapeCanvas.CANVAS_HEIGHT;

        this.ctx.clearRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        const offset = this.physics.distance;

        const progress = Math.max(0, Math.min(this.state.progress, 1));
        const leftRadius = this.calculateRadius(1 - progress);
        const rightRadius = this.calculateRadius(progress);

        const x1 = centerX - offset;
        const x2 = centerX + offset;
        const diff = rightRadius - leftRadius;
        const angleOffset = Math.asin(Math.max(-1, Math.min(1, diff / (x2 - x1))));
        const theta = Math.PI / 2 + angleOffset;

        const tx1 = x1 + leftRadius * Math.cos(theta);
        const ty1 = centerY + leftRadius * Math.sin(theta);
        const tx2 = x2 + rightRadius * Math.cos(theta);
        const ty2 = centerY + rightRadius * Math.sin(theta);

        this.ctx.beginPath();
        this.ctx.strokeStyle = this.colors.tape;
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'butt';
        this.ctx.moveTo(tx1, ty1);
        this.ctx.lineTo(tx2, ty2);
        this.ctx.stroke();

        this.drawReel(centerX - offset, centerY, leftRadius, this.state.leftAngle);
        this.drawReel(centerX + offset, centerY, rightRadius, this.state.rightAngle);
    }

    drawReel(x, y, radius, angle) {
        const { hubRadius } = this.physics;

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.colors.tape;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x, y, hubRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.colors.hub;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x, y, hubRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.colors.hubStroke;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);

        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(hubRadius - 2, 0);
        this.ctx.strokeStyle = this.colors.marker;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(hubRadius - 5, 0, 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.colors.marker;
        this.ctx.fill();

        this.ctx.restore();
    }

    render() {
        return html`<canvas></canvas>`;
    }
}

customElements.define('tape-canvas', TapeCanvas);

export default TapeCanvas;
